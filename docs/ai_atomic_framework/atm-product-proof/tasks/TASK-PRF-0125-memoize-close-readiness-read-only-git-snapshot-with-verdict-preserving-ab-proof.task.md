---
task_id: TASK-PRF-0125
title: Memoize close-readiness read-only Git snapshot with verdict-preserving AB proof
status: done
owner: codex-product-proof
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: [TASK-PRF-0102, TASK-PRF-0110]
  changedPublicSeams: [taskflow-close-readiness-read-only-snapshot]
  causalImpactEdges: [close-readiness-wait-ms, verdict-equivalence, child-process-count]
  parallelFrontierInputs: [close-readiness-optimization-candidates-20260923]
  validatorReferences:
    - tests/cli/taskflow-close-readiness-snapshot.test.ts
    - packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/read-only-git-snapshot.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/historical-close-preflight.ts
  - tests/cli/taskflow-close-readiness-snapshot.test.ts
  - packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
deliverables:
  - packages/cli/src/commands/taskflow/read-only-git-snapshot.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/historical-close-preflight.ts
  - tests/cli/taskflow-close-readiness-snapshot.test.ts
  - packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
validators:
  - node --strip-types tests/cli/taskflow-close-readiness-snapshot.test.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
  - npm run typecheck
  - node atm.mjs next --prompt "TASK-PRF-0125 memoize close-readiness read-only Git snapshot" --json
testContributions:
  - caseId: test_prf0125_snapshot_reuses_identical_read_only_queries_4f2a8c1d
    targetGroupId: null
    semanticKey: snapshot_reuses_identical_read_only_queries
    coversAcceptance: [ACC-1, ACC-2, ACC-6]
    coversImpactEdges: [child-process-count, close-readiness-wait-ms]
    expectedRedPredicate: repeated read-only Git queries execute more than once within one immutable close-readiness run
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: taskflow-close-readiness-read-only-snapshot
    contractEdge: run-local-snapshot-contract
    resourceKey: null
  - caseId: test_prf0125_cached_uncached_verdicts_are_identical_7d61be20
    targetGroupId: null
    semanticKey: cached_uncached_verdict_equivalence
    coversAcceptance: [ACC-3, ACC-4, ACC-6]
    coversImpactEdges: [verdict-equivalence]
    expectedRedPredicate: cached and uncached close-readiness paths produce different verdict JSON for the same fixture
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: verdict-equivalence
    contractEdge: close-readiness-verdict-contract
    resourceKey: null
  - caseId: test_prf0125_mutation_controls_invalidate_snapshot_9a0b7e3c
    targetGroupId: null
    semanticKey: mutation_controls_invalidate_snapshot
    coversAcceptance: [ACC-5]
    coversImpactEdges: [verdict-equivalence]
    expectedRedPredicate: HEAD, index, untracked files, deletion, rename, stale-base, foreign-staged, or planning drift can reuse stale read-only state
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: snapshot-invalidation
    contractEdge: mutation-invalidation-contract
    resourceKey: null
requiredTestCaseIds:
  - test_prf0125_snapshot_reuses_identical_read_only_queries_4f2a8c1d
  - test_prf0125_cached_uncached_verdicts_are_identical_7d61be20
  - test_prf0125_mutation_controls_invalidate_snapshot_9a0b7e3c
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the snapshot seam and retain cached/uncached receipts and timing evidence; no persistent cache state may remain.
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-close-readiness-map
  mapUpdates: []
  extractionCandidates:
    - disposition: inline
      inlineReason: The snapshot is an internal helper under the existing close-readiness atom; registering a new public atom would add governance surface without a new product capability.
      atom: atm.taskflow-close-readiness-map
      pattern: Adapter
      source: packages/cli/src/commands/taskflow/read-only-git-snapshot.ts
    - disposition: follow-up-card
      inlineReason: null
      atom: atm.taskflow-close-preflight
      pattern: Policy Object
      source: packages/cli/src/commands/taskflow/close-preflight.ts
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-23T02:51:43.758Z"
completed_by_agent: "codex-captain-20260923"
closedAt: "2026-09-23T02:51:43.758Z"
closedByActor: "codex-captain-20260923"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-23T02-51-43-758Z-close-c86a3c189872"
lastTransitionAt: "2026-09-23T02:51:43.758Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1cce8d3d6343356f9139499614586ede2e24c3ac"
---

# TASK-PRF-0125 Memoize close-readiness read-only Git snapshot with verdict-preserving AB proof

## Intent

Reduce the measured cost of `taskflow.close-readiness` by reusing identical
read-only Git observations within one close/pre-close run. Preserve existing
policy and multi-agent delivery semantics. This is a performance experiment
with a fail-closed correctness contract, not a new governance layer.

## Acceptance

- [ ] **ACC-1 — bounded seam:** one run-local snapshot owns only read-only Git
  observations; no persistent cache, daemon, new CLI command, registry, or
  cross-run state is introduced.
- [ ] **ACC-2 — measurable reduction:** on the fixed close fixture, repeated
  identical read-only queries and child-process count decrease; report p50/p95
  and wall milliseconds before/after. If added complexity costs more than the
  saved time, record a stop result and revert.
- [ ] **ACC-3 — exact equivalence:** cached and uncached verdict JSON, blocker
  codes, changed-file lists, and evidence references are byte-identical for
  the same immutable fixture.
- [ ] **ACC-4 — parallelism preserved:** deletion, rename, stale-base,
  foreign-staged files, planning drift, and shared-write admission semantics
  remain unchanged; no worktree/branch/queue capability is removed.
- [ ] **ACC-5 — invalidation correctness:** any possible change to HEAD, the
  index, untracked-file inventory, or planning source invalidates the snapshot
  before the next read.
- [ ] **ACC-6 — product evidence:** retain command-backed receipts containing
  baseline/candidate duration, child-process count, verdict digest, false-block
  and missed-conflict outcomes. Missing cost fields remain `null`, never zero.

## Stop rules

Stop and revert if any cached/uncached verdict differs, a mutation-control
case becomes a false pass, a missed conflict appears, p95 regresses by more
than 10%, the new seam requires persistent state, or the measured saving does
not exceed its code and maintenance cost.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-23T02:31:19.677Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0125-memoize-close-readiness-read-only-git-snapshot-with-verdict-preserving-ab-proof.task.md","contentDigest":"sha256:cc754d1294b7acbdc3624a8418f32e28135747ec46a0a2802fe41ce07f8ac910"} -->
