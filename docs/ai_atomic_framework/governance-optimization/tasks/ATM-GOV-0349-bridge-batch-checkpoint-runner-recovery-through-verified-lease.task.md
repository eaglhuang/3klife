---
task_id: ATM-GOV-0349
title: Bridge batch checkpoint runner recovery through verified lease
status: planned
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  causalDependencies:
    - ATM-GOV-0299 has a validated but uncheckpointed batch-head delivery because the frozen runner is stale.
  startConditions:
    - A batch checkpoint must forward recovery intent only when the operator supplied an emergency approval.
    - The downstream protected close surface remains the sole authority that validates the lease permission and consumes it.
  softRelations:
    - ATM-GOV-0299 is the first recovery consumer of this adapter.
    - ATM-GOV-0345 remains the broad runner-publication integration card; this card owns only the batch adapter seam.
  changedPublicSeams:
    - atm.batch.checkpoint.runnerRecoveryForwarding
  causalImpactEdges:
    - batch-checkpoint-to-protected-close-runner-recovery
  parallelFrontierInputs:
    - runner-sync queue is required only for the subsequent sealed build, never while the batch adapter performs private validation.
  validatorReferences:
    - test_atm_gov_0349_batch_runner_recovery_lease_4e0b52d1
  phaseOwner: Wave 3 recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target-repo
scopePaths:
  - packages/cli/src/commands/batch/implementation.ts
  - packages/cli/src/commands/batch/runner-recovery-forwarding.ts
  - tests/cli/batch-checkpoint-runner-sync-recovery.test.ts
deliverables:
  - packages/cli/src/commands/batch/implementation.ts
  - packages/cli/src/commands/batch/runner-recovery-forwarding.ts
  - tests/cli/batch-checkpoint-runner-sync-recovery.test.ts
validators:
  - node --strip-types tests/cli/batch-checkpoint-runner-sync-recovery.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0349_batch_runner_recovery_lease_4e0b52d1
    targetGroupId: null
    semanticKey: batch_checkpoint_runner_recovery_lease
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [batch-checkpoint-to-protected-close-runner-recovery]
    expectedRedPredicate: a stale frozen runner blocks a batch checkpoint even when a valid recovery lease is supplied
    contributionResourceKey: batch-checkpoint-runner-recovery
    responsibility: task-required
    dependencyEdge: batch-checkpoint-to-protected-close-runner-recovery
    contractEdge: atm.batch.checkpoint.runnerRecoveryForwarding
    resourceKey: batch-checkpoint-runner-recovery
requiredTestCaseIds:
  - test_atm_gov_0349_batch_runner_recovery_lease_4e0b52d1
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the adapter forwarding and its focused regression; protected close retains its independent lease validation.
atomizationImpact:
  ownerAtomOrMap: atm.batch-checkpoint-adapter
  mapUpdates: []
  extractionCandidates:
    - atom: atm.batch-checkpoint-runner-recovery-forwarding
      pattern: Policy Object
      source: packages/cli/src/commands/batch/implementation.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0349 Bridge batch checkpoint runner recovery through verified lease

## Intent

Repair the general bootstrap circularity in batch checkpoint: source changes make the frozen runner stale, but the batch adapter currently forwards an approved lease without forwarding the protected stale-runner recovery intent. The adapter must be a thin transport layer; the protected close surface must remain the permission validator and audit owner.

## Acceptance

- [ ] ACC-1: With a valid, task-scoped `backend.runnerRecovery` emergency approval, batch checkpoint forwards the approval and stale-runner recovery intent to its existing protected close call; the close layer validates and consumes the lease.
- [ ] ACC-2: Without an approval, batch checkpoint does not inject `--allow-stale-runner`; stale runner remains fail-closed.
- [ ] ACC-3: An approval for another permission, task, actor, or expired lease remains rejected by the existing protected gate; this adapter adds no bypass or task-specific exception.
- [ ] ACC-4: The focused regression proves ACC-1 through ACC-3 using the public batch checkpoint invocation boundary, not only a source-text assertion.
- [ ] ACC-5: The implementation introduces no long queue or polling. Runner-sync is acquired only after a checkpoint has produced a committed source candidate ready for sealed publication.

## Implementation Notes

- Reuse the existing emergency-gate contract and `tasks close` stale-runner option. Do not parse lease files, infer permissions from lease IDs, or embed task IDs in control flow.
- Extract the argument-forwarding policy from the 624-line batch adapter into `runner-recovery-forwarding.ts`; keep the adapter responsible only for invocation wiring. Do not change runner-sync scheduling, task lifecycle semantics, or broad runner publication policy in this card.
- Before closing, run the required focused test and typecheck. Use fresh command-backed evidence tied to the declared case id.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-12T05:26:21.453Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0349-bridge-batch-checkpoint-runner-recovery-through-verified-lease.task.md","contentDigest":"sha256:d2142abd9fdff835214007d347a422a6b6454744ff944b42ab39107d73f3a8dc"} -->
