---
task_id: ATM-GOV-0246
title: Dual-captain dogfood dashboard and sealed run manifest
status: planned
owner: atm-observability
priority: P0
milestone: ATM-3.1-R2.5
depends_on:
  - ATM-GOV-0240
  - ATM-GOV-0241
  - ATM-GOV-0248
  - ATM-GOV-0249
  - ATM-GOV-0250
  - ATM-GOV-0254
  - ATM-GOV-0252
  - ATM-GOV-0263
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 evidence repair; this continues the invalid 0234/0235 closure lineage without creating a new task series."
scopePaths:
  - packages/core/src/broker/replay/dashboard.ts
  - packages/cli/src/commands/broker/replay/dashboard.ts
  - packages/cli/src/commands/broker/replay/run-manifest.ts
  - packages/cli/src/commands/broker/replay/dashboard-view-model.ts
  - packages/cli/src/commands/broker/replay-actions.ts
  - tests/cli/plan3-dual-captain-dashboard.test.ts
  - docs/governance/atm-3-replay-evidence.md
deliverables:
  - packages/core/src/broker/replay/dashboard.ts
  - packages/cli/src/commands/broker/replay/dashboard.ts
  - packages/cli/src/commands/broker/replay/run-manifest.ts
  - packages/cli/src/commands/broker/replay/dashboard-view-model.ts
  - tests/cli/plan3-dual-captain-dashboard.test.ts
validators:
  - node --strip-types tests/cli/plan3-dual-captain-dashboard.test.ts
  - npm run typecheck
errorCodes: []
evidence:
  required: dual-captain-dashboard-command-backed
rollback:
  strategy: revert-commit-and-trip-queue-only
  notes: "The dashboard is read-only. Revert implementation and keep Plan 3 active if canonical reconstruction fails."
atomizationImpact:
  ownerAtomOrMap: atm.broker.parallel-replay
  mapUpdates: []
  extractionCandidates:
    - atom: atm.replay.dashboard
      pattern: Read Model
      source: packages/core/src/broker/replay/dashboard.ts
      disposition: extract
    - atom: atm.replay.run-manifest
      pattern: Sealed Manifest
      source: packages/cli/src/commands/broker/replay/run-manifest.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0246 Dual-captain dogfood dashboard and sealed run manifest

## Intent

Provide a small, read-only live/post-run dashboard and a sealed run-manifest
contract before the Codex/Claude dual-captain dogfood begins. The dashboard
reconstructs observations from canonical task events, tickets, command
receipts, and sealed artifacts; it never drives queue state or trusts
producer-owned success labels.

## Acceptance

- [ ] A pre-run manifest seals run id, participant cards, provider/role scenario data, runtime-assigned actors, PID/process expectations, canonical worktree root, base/HEAD/build/runner digests, non-Git bounded proposal roots, declared shared physical file plus each logical intent digest, private outputs, thresholds, time window, and stop rule.
- [ ] The manifest also seals validator-policy/union and selection-input digests before either producer can read the locked semantic-break payload. Negative-control reveal is a separately timestamped event, and any later validator-union mutation invalidates readiness.
- [ ] Provider and task bindings are data only; dashboard and harness contain no Codex-, Claude-, actor-, task-, date-, or local-path-specific control-flow branches.
- [ ] Dashboard shows canonical claim/close state, actor/PID, active overlap and ratio, canonical root/base/HEAD, shared physical file and logical intents, ticket state/generation/digest, adapter decision, selected/queued request ids, compose batch, serializability proof, steward before/after digests, shared-commit attribution, queue position, `waitedMs`, wakeup, faults/correctness, throughput/cost, source availability, and stop condition.
- [ ] Dashboard also shows emitted-command executions, usage errors, automatic continuations, terminal-task prunes, manual captain interventions, false stops, and unavailable receipts so autonomous completion is measured rather than inferred from task status.
- [ ] Dashboard shows candidate-output digest, sealed validator selection and source, command-backed validator runs, runner/build digest, and semantic `pass`/`fail`/`inconclusive`; this view is observational and grants no write authority.
- [ ] Dashboard shows each closure-critical acceptance predicate, required/observed realness, authoritative-source availability, verifier mode, negative-control result, and `pass`/`fail`/`inconclusive` without allowing display state to become the authority.
- [ ] `ready` requires two different actors and OS processes on one sealed canonical worktree/base/HEAD/build, non-Git proposal roots, a non-empty same-file intersection, and distinct bounded logical intents; separate Git worktrees/branches/indexes, missing evidence, contradictory digests, or `not-required` returns `not-ready`.
- [ ] The view distinguishes the primary safe-compose cell from the true-conflict/stale fallback cell: zero queue residency is valid only for the former, while a queued fallback requires positive event-derived wait and automatic wakeup.
- [ ] JSON and human-readable views share the same compact digest and can be refreshed live or reconstructed post-run from canonical sources.
- [ ] Refresh is strictly read-only: it cannot claim, wake, release, mutate queue/runtime state, or manufacture lifecycle events.
- [ ] Focused tests prove untrusted producer labels cannot override canonical evidence and incomplete dual-captain setup fails closed.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:20:17.541Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0246-dual-captain-dogfood-dashboard-and-sealed-run-manifest.task.md","contentDigest":"sha256:56c32ea35b17499e21d3c874380a36b5e2e0b853fbe9cf58576e340228f17c13"} -->
