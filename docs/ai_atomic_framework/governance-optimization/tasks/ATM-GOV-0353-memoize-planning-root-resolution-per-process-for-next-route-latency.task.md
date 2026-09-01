---
task_id: ATM-GOV-0353
title: Memoize planning root resolution per process for next route latency
status: planned
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - The full validator profile fails ATM_NEXT_CLI_LOGIC_BUDGET_EXCEEDED because next route logic exceeds the 500ms budget.
  softRelations: [ATM-GOV-0346]
  changedPublicSeams: [atm.planningRootResolutionCache.v1]
  causalImpactEdges:
    - repeated-planning-root-resolution-to-next-route-latency
    - next-route-latency-to-full-profile-red
  parallelFrontierInputs: [planning-root-config, task-scope-partition, next-queue-inspection]
  validatorReferences: [validate-next-warm-run-latency, test_atm_gov_0353_planning_root_resolution_is_memoized]
  phaseOwner: wave-3-validator-and-ci-baseline
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/planning-root-resolution-cache.ts
  - packages/cli/src/commands/planning-repo-root.ts
  - tests/cli/planning-root-resolution-cache.test.ts
deliverables:
  - packages/cli/src/commands/planning-root-resolution-cache.ts
  - packages/cli/src/commands/planning-repo-root.ts
  - tests/cli/planning-root-resolution-cache.test.ts
validators:
  - node --strip-types tests/cli/planning-root-resolution-cache.test.ts
  - npm run typecheck
  - npm run validate:module-boundaries
  - npm run validate:cli
testContributions:
  - caseId: test_atm_gov_0353_planning_root_resolution_is_memoized
    targetGroupId: null
    semanticKey: planning_root_config_is_resolved_once_per_process_per_cwd
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges:
      - repeated-planning-root-resolution-to-next-route-latency
      - next-route-latency-to-full-profile-red
    contributionResourceKey: planning-root-resolution-cache
    responsibility: task-required
    contractEdge: atm.planningRootResolutionCache.v1
    resourceKey: planning-root-resolution-cache
    expectedRedPredicate: resolving the same planning root config repeatedly re-reads .atm/config.json and re-scans sibling roots on every call
  - caseId: test_atm_gov_0353_cache_is_keyed_and_resettable
    targetGroupId: null
    semanticKey: cached_planning_roots_never_leak_across_cwd_or_env
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [repeated-planning-root-resolution-to-next-route-latency]
    contributionResourceKey: planning-root-resolution-cache-isolation
    responsibility: task-required
    contractEdge: atm.planningRootResolutionCache.v1
    resourceKey: planning-root-resolution-cache-isolation
    expectedRedPredicate: a process-lifetime cache returns one repository's planning roots for a different cwd or after the planning-root environment changes
  - caseId: test_atm_gov_0353_cached_result_equals_uncached_result
    targetGroupId: null
    semanticKey: memoized_planning_root_config_is_byte_identical_to_a_fresh_resolution
    coversAcceptance: [ACC-5]
    coversImpactEdges: [repeated-planning-root-resolution-to-next-route-latency]
    contributionResourceKey: planning-root-resolution-cache-equivalence
    responsibility: task-required
    contractEdge: atm.planningRootResolutionCache.v1
    resourceKey: planning-root-resolution-cache-equivalence
    expectedRedPredicate: a cached planning root config can diverge from the value a fresh resolution would produce for the same inputs
requiredTestCaseIds:
  - test_atm_gov_0353_planning_root_resolution_is_memoized
  - test_atm_gov_0353_cache_is_keyed_and_resettable
  - test_atm_gov_0353_cached_result_equals_uncached_result
phaseTestCaseIds: [typecheck, validate:cli]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the cache module and its single call site together. Correctness outranks latency; if any caller can observe a stale planning root, revert rather than widening the key.
atomizationImpact:
  ownerAtomOrMap: atm.planning-repo-root
  mapUpdates: []
  extractionCandidates:
    - atom: atm.planning-root-resolution-cache
      pattern: Memoized Result Contract
      source: packages/cli/src/commands/planning-repo-root.ts
      disposition: extract
      inlineReason: null
errorCodes: []
outOfScope:
  - packages/cli/src/commands/next/planning-root-preference.ts
  - packages/cli/src/commands/task-direction.ts
  - packages/cli/src/commands/next/route-resolution/**
nonGoals:
  - Changing which planning roots are resolved. This card must not alter a single resolution result; it only stops recomputing the same one.
  - Caching across processes, or persisting the resolution to disk.
  - Reducing the 793-file task ledger scan. That scan measures 49ms and is not the cost.
---

# ATM-GOV-0353 Memoize planning root resolution per process for next route latency

## Problem

`validate-next-warm-run-latency` runs in the **full** profile and fails
`ATM_NEXT_CLI_LOGIC_BUDGET_EXCEEDED`: the `next` route's own logic takes about
3.65s against a 500ms budget. The full profile therefore cannot go green, and
the runbook's completion gate requires it.

The profile marker names the wrong suspect. `ATM_NEXT_PROFILE=1` reports
`read-json-tasks count=793: +1323ms`, but that phase mark spans the whole
`flatMap`, and the file scan inside it is nearly free:

| Measured on the current ledger (794 files, 5.53 MB) | Time |
| --- | --- |
| `readFileSync` for every file | 33ms |
| `JSON.parse` for every file | 10ms |
| `extractJsonTaskMetadata` × 794 | 6ms |
| **task scan total** | **≈ 49ms** |

The remaining ~1.27s is repeated planning-root resolution. CPU profile self-time
attributed to the nearest application frame:

```
602.4ms  next/planning-root-preference.ts:219
157.1ms  next/planning-root-preference.ts:173
149.5ms  readConfiguredPlanningRoots      planning-repo-root.ts:86
147.0ms  resolveStoredPlanningPath        planning-repo-root.ts:141
 94.5ms  resolveCandidatePlanningRoots    next/planning-root-preference.ts:194
---
 31.9ms  route-resolution/queue-inspection.ts:101   (the actual task scan)
```

The call path is `finalizeImportedTaskSummary(…, cwd)` → `partitionTaskScope`,
which calls `normalizeStoredPlanningPathForIdentity`, `resolveStoredPlanningPath`
and `isExternalPlanningStoredPath` **once per scope path per task**. Each of
those calls `resolvePlanningRepoRootConfig(cwd)`, which re-reads and re-parses
`.atm/config.json` and re-scans sibling planning roots from scratch. Nothing is
memoized: one call costs 3.75ms, and roughly 320 calls occur per `next`.

The cost is therefore not proportional to the ledger size. Only tasks whose
status is routable are hydrated — currently 17 of 794 (`done` 767, `running` 5,
`open` 4, `planned` 12, `abandoned` 5, `blocked` 1) — so the cost tracks the
number of routable tasks times their declared scope paths. Growing the ledger to
8000 closed tasks would barely move it; opening 40 cards would double it.

Running `inspectImportedTaskQueue` three times in one process gives
`1708 / 1596 / 1316 ms` — no cache exists at any layer.

## Acceptance

- ACC-1 `resolvePlanningRepoRootConfig` resolves at most once per distinct
  `cwd` per process. A focused test observes the underlying filesystem reads and
  proves the second and later calls perform none.
- ACC-2 `node atm.mjs next --json` CLI logic time is under the 500ms budget on
  the current ledger, and `validate-next-warm-run-latency` reports no
  `ATM_NEXT_CLI_LOGIC_BUDGET_EXCEEDED` finding.
- ACC-3 The cache is keyed by resolved `cwd` and by the planning-root
  environment input, so two different repositories in one process never observe
  each other's roots.
- ACC-4 An explicit reset entry point exists and is used by tests that mutate
  planning roots inside a single process; without it those tests would observe a
  stale result.
- ACC-5 Every resolution result is byte-identical to the pre-change result for
  the same inputs. This card changes timing only.

## Notes for the implementer

Extract the memoization, do not scatter it. One small module owning a
`Map<cacheKey, PlanningRepoRootConfig>` plus a reset, consumed by
`resolvePlanningRepoRootConfig` alone. Callers keep their current signatures and
learn nothing about caching — that is the whole point of putting the seam here
rather than at the twenty call sites in `partitionTaskScope`.

The key must include the planning-root environment variable, not just `cwd`.
`resolvePlanningRepoRootConfig` reads `ATM_PLANNING_REPO_ROOT` through
`readPlanningRootEnv()`, and long-lived test processes change it between cases;
keying on `cwd` alone would hand one fixture another fixture's roots and produce
a false green somewhere far away.

Prove ACC-1 by counting real filesystem reads, not by timing. A timing
assertion on a shared CI host is exactly the kind of margin flake this plan is
correcting elsewhere.
