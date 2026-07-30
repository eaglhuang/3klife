---
task_id: ATM-GOV-0274
title: Enforce same-task different-lane claim rejection
status: planned
owner: unassigned
assignee: Cursor
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - Plan 3.2 has not started implementation.
    - Deep-module review fingerprint deep-module-review:9433b14b is accepted as the design baseline.
    - ATM-GOV-0275 may run in parallel but must not edit this card's primary files without Captain review.
  softRelations:
    - ATM-GOV-0275
  changedPublicSeams:
    - atm.taskClaimOwnership
    - atm.nextClaimAdmission
    - atm.parallelAdmissionPolicy.R1_SAME_TASK_SECOND_LANE
  causalImpactEdges:
    - source: packages/core/src/broker/parallel-admission-policy.ts
      target: packages/cli/src/commands/tasks/claim-ownership.ts
      reason: R1 same-task second-lane policy must be enforced by the claim adapter.
    - source: packages/cli/src/commands/tasks/claim-ownership.ts
      target: tests/cli/lane-claim-conflict-matrix.test.ts
      reason: Same actor with different lane ids must reject with ATM_LOCK_CONFLICT.
  parallelFrontierInputs:
    - ATM-GOV-0275
  validatorReferences:
    - node --strip-types tests/cli/lane-claim-conflict-matrix.test.ts
    - node --strip-types tests/cli/lane-dual-session-e2e.test.ts
    - node --strip-types tests/cli/broker-parallel-admission-policy.test.ts
  phaseOwner: Cursor
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3-2.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/claim-ownership.ts
  - packages/cli/src/commands/next/claim-admission.ts
  - tests/cli/lane-claim-conflict-matrix.test.ts
  - tests/cli/lane-dual-session-e2e.test.ts
deliverables:
  - packages/cli/src/commands/tasks/claim-ownership.ts
  - packages/cli/src/commands/next/claim-admission.ts
  - tests/cli/lane-claim-conflict-matrix.test.ts
  - tests/cli/lane-dual-session-e2e.test.ts
validators:
  - node --strip-types tests/cli/lane-claim-conflict-matrix.test.ts
  - node --strip-types tests/cli/lane-dual-session-e2e.test.ts
  - node --strip-types tests/cli/broker-parallel-admission-policy.test.ts
errorCodes:
  - ATM_LOCK_CONFLICT
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes:
    - Revert the claim ownership and next claim admission changes.
    - Rerun the three causal validators to prove the previous behavior is restored or the fix is reattempted cleanly.
atomizationImpact:
  ownerAtomOrMap: atm.work-coordination-authority
  mapUpdates:
    - atomic_workbench/atoms/ATM-GOV-0001/atom.spec.json
    - atomic_workbench/atoms/ATM-GOV-0001/atom.source.mjs
    - atomic_workbench/atoms/ATM-GOV-0001/atom.test.ts
  extractionCandidates:
    - atom: atm.work-coordination-authority
      pattern: Policy Authority / Adapter Facade
      source: packages/cli/src/commands/tasks/claim-ownership.ts
      disposition: follow-up-card
      inlineReason: null
createdByCommand: atm plan card create
---

# ATM-GOV-0274 Enforce same-task different-lane claim rejection

## Intent

Close the R1 policy gap discovered during the pre-Plan 3.2 dual-captain
readiness check. ATM already declares `R1_SAME_TASK_SECOND_LANE` as a
non-relaxable hard exception, but the task claim adapter currently treats
same-actor reentry as idempotent even when lane ids differ.

This card makes lane identity authoritative when both lifecycle records carry a
lane id. Same task plus different lane must fail before proposal, write,
commit, or close side effects.

## Acceptance

- [ ] Same actor plus same lane remains idempotent.
- [ ] Same actor plus different lane rejects with `ATM_LOCK_CONFLICT`.
- [ ] Rejection details include `holdingLaneSessionId`, `requestedLaneSessionId`,
      `laneAdoptCommand`, and `recoveryHint`.
- [ ] Legacy actor fallback is preserved only when at least one side lacks a
      lane id.
- [ ] `tests/cli/lane-claim-conflict-matrix.test.ts` passes.
- [ ] `tests/cli/lane-dual-session-e2e.test.ts` passes.
- [ ] `tests/cli/broker-parallel-admission-policy.test.ts` passes.

## Dispatch

Assigned captain: Cursor.

Do not modify `ATM-GOV-0275` primary files. If a shared seam change is needed,
stop and request Captain integration review.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-30T07:35:12.564Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0274-enforce-same-task-different-lane-claim-rejection.task.md","contentDigest":"sha256:f52e909e4b36574bf0e571a1145167530d0c706f479a105f1644f6f9f7d04099"} -->
