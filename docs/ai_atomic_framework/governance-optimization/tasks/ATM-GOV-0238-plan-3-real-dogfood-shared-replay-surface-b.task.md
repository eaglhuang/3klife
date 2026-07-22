---
task_id: ATM-GOV-0238
title: Plan 3 real dogfood shared replay surface B
status: planned
owner: atm-performance
priority: P0
milestone: ATM-3.1-R3
severity: P0
depends_on:
  - ATM-GOV-0246
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3 real dogfood evidence; this card is one of two intentionally intersecting registered candidates."
scopePaths:
  - "packages/cli/src/commands/broker/replay/dashboard-view-model.ts"
  - "packages/cli/src/commands/broker/replay/dashboard-lifecycle-observations.ts"
  - "tests/cli/plan3-dashboard-lifecycle-observations.test.ts"
  - "docs/governance/atm-3-replay-evidence.md"
  - "artifacts/generated/atm-plan3-dogfood/ATM-GOV-0238.json"
deliverables:
  - "packages/cli/src/commands/broker/replay/dashboard-view-model.ts"
  - "packages/cli/src/commands/broker/replay/dashboard-lifecycle-observations.ts"
  - "tests/cli/plan3-dashboard-lifecycle-observations.test.ts"
  - "artifacts/generated/atm-plan3-dogfood/ATM-GOV-0238.json"
validators:
  - "node --strip-types tests/cli/plan3-dashboard-lifecycle-observations.test.ts"
  - "node atm.mjs broker replay dashboard --json"
  - "git diff --check"
errorCodes:
  - "ATM_BROKER_REPLAY_DOGFOOD_BLOCKED"
  - "ATM_EVIDENCE_SEAL_REQUIRED"
createdByCommand: atm plan card create
evidence:
  required: real-dogfood-command-backed
rollback:
  strategy: abandon-or-reopen-card
  notes: "If the dogfood run fails, keep Plan 3 active, preserve the failed receipt, and abandon or reopen this candidate through the normal task lifecycle."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.parallel-replay"
  mapUpdates: []
  extractionCandidates: []
---

# ATM-GOV-0238 Plan 3 real dogfood shared replay surface B

## Intent

Provide the Claude-captain implementation lane for the real Plan 3.1 dogfood.
This is real product work: add canonical lifecycle observations to the
dashboard and jointly evolve `dashboard-view-model.ts`. ATM-GOV-0237
intentionally shares that implementation surface while each lane keeps its
observation module, focused test, and output artifact private. Provider binding
is sealed run data, never implementation control flow.

## Acceptance

- [ ] ATM-GOV-0246 dashboard preflight is ready before the Claude actor claims this card.
- [ ] The Claude lane makes substantive code and test changes in its isolated OS process, worktree, and index on the sealed base/build.
- [ ] ATM-GOV-0237 and 0238 both retain `dashboard-view-model.ts` as a declared shared implementation surface; neither lane narrows scope to avoid arbitration.
- [ ] Lifecycle observations derive claim, proposal, compose/publish, wakeup, validation, and close from canonical events without manufacturing labels.
- [ ] Dogfood evidence records actor, canonical ticket state, waitedMs, wakeup,
      proposal/compose trace, and close-packet digest.
- [ ] No implementation control flow special-cases ATM-GOV-0238, Claude, actor id, date, or local path.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T16:07:11.030Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0238-plan-3-real-dogfood-shared-replay-surface-b.task.md","contentDigest":"sha256:3768b4029106b1973abe869c93c10345f1fd21a43b880dda286a80abc5ea6ddb"} -->
