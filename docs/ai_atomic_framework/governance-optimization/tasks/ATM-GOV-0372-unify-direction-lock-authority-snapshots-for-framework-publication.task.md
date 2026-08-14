---
task_id: ATM-GOV-0372
title: Unify direction-lock authority snapshots for framework publication
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions: ["ATM-GOV-0362 delivery commit exists and its runner publication gate reproduces the task-binding failure."]
  softRelations: [ATM-GOV-0325, ATM-GOV-0362, ATM-BUG-2026-08-14-005]
  changedPublicSeams: [atm.taskDirectionAuthoritySnapshot.v1, atm.frameworkTempClaimTaskBinding.v1]
  causalImpactEdges: [renew-to-framework-claim-parity, takeover-to-framework-claim-parity, authority-snapshot-to-runner-publication]
  parallelFrontierInputs: [task-ledger, task-direction-lock, lane-session, framework-temp-claim]
  validatorReferences: [temp-claim, scope-lock-diagnostics]
  phaseOwner: wave-0-authority-reconciliation
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/task-direction.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
  - packages/cli/src/commands/framework-development/__tests__/temp-claim.spec.ts
  - packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts
deliverables:
  - packages/cli/src/commands/task-direction.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
  - packages/cli/src/commands/framework-development/__tests__/temp-claim.spec.ts
  - packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts
validators:
  - node --strip-types packages/cli/src/commands/framework-development/__tests__/temp-claim.spec.ts
  - node --strip-types packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0372_exact_task_direction_authority_snapshot
    targetGroupId: test_group_plan4_foundation
    semanticKey: exact_live_task_direction_lock_binds_framework_claim_even_with_other_same_actor_lanes
    coversAcceptance: [ACC-1, ACC-2, ACC-4]
    coversImpactEdges: [renew-to-framework-claim-parity, authority-snapshot-to-runner-publication]
    contributionResourceKey: task-direction-authority-snapshot
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.taskDirectionAuthoritySnapshot.v1
    resourceKey: task-direction-authority-snapshot
    expectedRedPredicate: a renewed exact task is rejected because a different same-actor task is chosen
  - caseId: test_atm_gov_0372_task_direction_snapshot_rejects_invalid_authority
    targetGroupId: test_group_plan4_foundation
    semanticKey: stale_or_mismatched_task_direction_authority_fails_closed
    coversAcceptance: [ACC-3]
    coversImpactEdges: [takeover-to-framework-claim-parity]
    contributionResourceKey: task-direction-authority-snapshot
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.frameworkTempClaimTaskBinding.v1
    resourceKey: task-direction-authority-snapshot
    expectedRedPredicate: stale_or_actor_lane_mismatched authority can bind a framework claim
requiredTestCaseIds: [test_atm_gov_0372_exact_task_direction_authority_snapshot, test_atm_gov_0372_task_direction_snapshot_rejects_invalid_authority]
tddMode: required
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the canonical snapshot adapter and its parity tests together; never restore divergent ledger-only/runtime-only readers.
atomizationImpact:
  ownerAtomOrMap: atm.task-direction-authority
  mapUpdates: []
  extractionCandidates:
    - atom: atm.task-direction-authority-snapshot
      pattern: Policy Object
      source: packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-14T13:25:48.255Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T13:25:48.255Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T13-25-48-255Z-close-aeb80d966f74"
lastTransitionAt: "2026-08-14T13:25:48.255Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1a21c6bcea77f1b0fb71a57ef874a6f53357c60f"
---

# ATM-GOV-0372 Unify direction-lock authority snapshots for framework publication

## Intent

Repair the producer/consumer split-brain discovered while closing
ATM-GOV-0362: task lifecycle writes a renewed direction lock into the ledger,
while framework publication validates only a separate runtime-lock projection.
All consumers must resolve one digestable, actor/lane/task-scoped authority
snapshot, so an explicit live task cannot be displaced by another same-actor
lane and stale or mismatched authority remains fail-closed.

## Acceptance

- [ ] ACC-1 A renewed or taken-over task has one canonical direction-lock authority snapshot that the framework temporary-claim binding consumes without reconstructing a separate rule.
- [ ] ACC-2 With multiple active tasks for the same actor and lane, an explicit requested task with an exact live direction lock binds successfully; the implementation never selects a different task by iteration order.
- [ ] ACC-3 Missing, expired, actor-mismatched, lane-mismatched, or ambiguous authority fails closed with an actionable recovery path; it cannot authorize runner publication.
- [ ] ACC-4 Focused parity tests, `npm run typecheck`, and a command-backed reproduction show that ATM-GOV-0362 can bind its framework publication claim only after ACC-1 through ACC-3 hold.

## Backlog linkage

This card closes the authority-snapshot portion of ATM-BUG-2026-08-14-005.
It does not absorb runner-output bundle ownership (ATM-BUG-2026-08-14-006),
which remains independently testable.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-14T02:16:20.196Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0372-unify-direction-lock-authority-snapshots-for-framework-publication.task.md","contentDigest":"sha256:72975497965ff03faf4919ff6aedfa991ae74d296c5328c9f2c156dbed6b41d3"} -->
