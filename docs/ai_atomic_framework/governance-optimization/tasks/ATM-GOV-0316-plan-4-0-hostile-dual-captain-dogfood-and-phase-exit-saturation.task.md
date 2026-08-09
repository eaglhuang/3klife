---
task_id: ATM-GOV-0316
title: Plan 4.0 hostile dual-captain dogfood and phase-exit saturation
status: planned
owner: unassigned
priority: P1
depends_on: [ATM-GOV-0315]
causalGraph:
  causalDependencies: [ATM-GOV-0315]
  startConditions: ["0315 adapter parity and frozen smoke are fresh and green"]
  softRelations:
    - governance-optimization/parallel-governance-charter.md
  changedPublicSeams:
    - atm.hostileDogfoodReceipt.v1
  causalImpactEdges:
    - shared-index/CAS/queue race -> fail-closed recovery evidence
  parallelFrontierInputs:
    - ATM-GOV-0315 adapter parity
  validatorReferences:
    - node --strip-types tests/cli/plan4-hostile-dual-captain.test.ts
  phaseOwner: Plan4-hostile-dogfood
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src
  - packages/cli/src
  - tests/cli/plan4-hostile-dual-captain.test.ts
  - tests/catalog/groups/test_group_plan4_hostile_dogfood.shard.json
deliverables:
  - real dual-captain hostile dogfood receipt covering shared index, CAS, queue, foreign dirty, and stale runner cases
  - recurrence/saturation/rollback report for every known parallel incident family
  - phase-exit proof with no unresolved unknown or override-based success
validators:
  - node --strip-types tests/cli/plan4-hostile-dual-captain.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:git-head-evidence
testContributions:
  - caseId: test_task_atm_gov_0316_hostile_parallel_6f3a8b20
    targetGroupId: test_group_plan4_hostile_dogfood
    semanticKey: plan4_hostile_dual_captain_parallel
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: ["shared-index/CAS/queue race -> fail-closed recovery evidence"]
    expectedRedPredicate: parallel race absorbs foreign content or loses a lane's commit
    responsibility: task-required
  - caseId: test_task_atm_gov_0316_phase_exit_saturation_1c7e5a94
    targetGroupId: test_group_plan4_hostile_dogfood
    semanticKey: plan4_recurrence_saturation_phase_exit
    coversAcceptance: [ACC-2, ACC-3, ACC-4]
    coversImpactEdges: ["shared-index/CAS/queue race -> fail-closed recovery evidence"]
    expectedRedPredicate: unknown or override-based success is accepted at phase exit
    responsibility: task-required
requiredTestCaseIds:
  - test_task_atm_gov_0316_hostile_parallel_6f3a8b20
  - test_task_atm_gov_0316_phase_exit_saturation_1c7e5a94
evidence:
  required: command-backed
  realness: fresh-sealed-and-real-two-lane-dogfood
rollback:
  strategy: halt-phase-exit-and-requeue-unpublished-lane
  notes: Preserve both lane receipts; do not use override lease or force ref update to recover a failed race.
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0316 Plan 4.0 hostile dual-captain dogfood and phase-exit saturation

## Intent

Exercise two independent captains against one canonical worktree under hostile
timing: overlapping files, shared index, queue/CAS races, foreign dirty state,
stale runner, and recovery. Record recurrence and saturation, prove rollback,
and fail the phase exit on any override lease, unknown outcome, or escaped
parallel incident.

## Acceptance

- [ ] Real two-lane dogfood covers every listed hostile condition.
- [ ] Each known incident family has recurrence, saturation, and rollback evidence.
- [ ] No success path uses override lease or hides unknown outcomes.
- [ ] Fresh sealed phase-exit receipt proves canonical worktree integrity.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T15:04:03.216Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0316-plan-4-0-hostile-dual-captain-dogfood-and-phase-exit-saturation.task.md","contentDigest":"sha256:bad9107e13ee6f32f7daa286f4d123f4ac815ae86d8e7a9db2718a86fa2658ab"} -->
