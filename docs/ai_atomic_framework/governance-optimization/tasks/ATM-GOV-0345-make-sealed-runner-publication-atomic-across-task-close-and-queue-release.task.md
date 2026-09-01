---
task_id: ATM-GOV-0345
title: Make sealed runner publication atomic across task close and queue release
status: planned
owner: codex-captain
priority: P0
depends_on:
  - ATM-GOV-0344
causalGraph:
  causalDependencies:
    - ATM-GOV-0344 closeback exposes a runner-sync queue entry whose receipt remains publication-pending.
  startConditions:
    - Preserve foreign staged governance entries byte-for-byte.
    - Use the canonical worktree and the broker queue; do not reopen a completed task merely to publish generated artifacts.
  softRelations:
    - ATM-GOV-0327 rescue-worktree audit remains independent and must not be absorbed into this card.
  changedPublicSeams:
    - sealed-runner-publication-lifecycle
    - runner-sync-steward-release
    - taskflow-close-runner-publication-handoff
  causalImpactEdges:
    - close-success -> publication-receipt ownership -> generated-artifact commit -> broker release
    - close-failure -> no ledger completion and no release-artifact publication
  parallelFrontierInputs:
    - runner-sync queue-head receipt for ATM-GOV-0344
    - foreign staged governance state
  validatorReferences:
    - test_runner_publication_close_handoff_0345
    - test_taskflow_close_crash_matrix
    - validate:cli
  phaseOwner: Wave-2-closeout-atomicity
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - packages/cli/src/commands/broker/steward-queues.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.test.ts
  - packages/cli/src/commands/taskflow/__tests__/taskflow-close-crash-matrix.test.ts
deliverables:
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - packages/cli/src/commands/broker/steward-queues.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.test.ts
  - packages/cli/src/commands/taskflow/__tests__/taskflow-close-crash-matrix.test.ts
validators:
  - node --strip-types packages/cli/src/commands/framework-development/runner-publication-lifecycle.test.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-close-crash-matrix.test.ts
  - npm run validate:cli
requiredTestCaseIds:
  - test_runner_publication_close_handoff_0345
  - test_taskflow_close_crash_matrix_0345
phaseTestCaseIds:
  - test_taskflow_close_crash_matrix
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
testContributions:
  - caseId: test_runner_publication_close_handoff_0345
    targetGroupId: null
    semanticKey: closed_task_publication_handoff
    coversAcceptance: [ACC-1, ACC-2, ACC-4, ACC-5, ACC-6]
    coversImpactEdges:
      - close-success -> publication-receipt ownership -> generated-artifact commit -> broker release
    expectedRedPredicate: a completed task leaves a queue entry whose receipt cannot be published or released without recreating task ownership
    contributionResourceKey: runner-sync-steward-queue
    responsibility: task-required
    dependencyEdge: taskflow-close-runner-publication-handoff
    contractEdge: sealed-runner-publication-lifecycle
    resourceKey: runner-sync-steward-queue
  - caseId: test_taskflow_close_crash_matrix_0345
    targetGroupId: null
    semanticKey: close_failure_has_no_terminal_or_publication_side_effect
    coversAcceptance: [ACC-3]
    coversImpactEdges:
      - close-failure -> no ledger completion and no release-artifact publication
    expectedRedPredicate: an injected close failure advances terminal ledger state or alters foreign staged index entries
    contributionResourceKey: close-window-index
    responsibility: task-required
    dependencyEdge: taskflow-close-runner-publication-handoff
    contractEdge: close-failure-atomicity
    resourceKey: close-window-index
methodProfiles:
  - contract-migration
evidence:
  required: command-backed
rollback:
  strategy: revert the lifecycle delivery commit, rebuild sealed artifacts from the reverted HEAD, and release only the receipt that matches that HEAD.
atomizationImpact:
  ownerAtomOrMap: atm.runner-publication-lifecycle
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runner-publication-lifecycle
      pattern: Transactional state machine
      source: packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
      disposition: inline
      inlineReason: The existing lifecycle module is the intended public deep module; repair must strengthen its transaction contract rather than add a parallel coordinator.
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0345 Make sealed runner publication atomic across task close and queue release

## Intent

Repair the general lifecycle invariant exposed by ATM-GOV-0344: a successful taskflow close that requires runner publication must either complete publication and broker release as part of the same durable lifecycle, or remain recoverable through a receipt-backed continuation that does not require reopening the completed task. No path may leave a `done/released` task as the sole owner of a queue-head receipt that the broker subsequently rejects.

This is a Wave 2 correction to checkpoint-to-commit-to-next-claim atomicity. It must use receipt facts (task state, sealed source SHA, inventory digest, queue membership, publication state) rather than task-ID-specific exceptions.

## Execution Contract

1. Reproduce the lifecycle with a fixture: active task owns a queue-head, runner build produces a sealed receipt, taskflow close runs, then publication/release is attempted.
2. Design one owner module for publication state transitions. The caller may request a transition but cannot assert publication success.
3. Ensure close does not mark the task terminal before the next durable transition is guaranteed: either publish before terminal close, or persist a continuation authority that broker release can validate after normal close.
4. The continuation must be bound to the sealed source SHA, output inventory digest, queue-head work id, and receipt digest. It must reject altered outputs, stale receipts, foreign queue entries, and foreign staged state.
5. Reuse the existing broker ticket/queue surface. Do not add a second registry, implicit raw Git publication, task-ID allowlist, timeout waiver, or hidden actor override.
6. Retain and restore all foreign staged entries through the existing index transaction. The regression must compare mode/blob/path identity before and after both success and injected late failure.
7. Build and publish via runner-sync only after the source delivery commit is sealed. Verify the frozen runner consumes the publication receipt, then release the broker entry and the temporary publication capability.

## Acceptance

- [ ] ACC-1: A close requiring runner publication cannot terminally release the only authority needed to publish its sealed receipt; the state machine exposes either `published` or a durable, receipt-bound continuation.
- [ ] ACC-2: A valid continuation can publish and release a closed task's queue-head without reopening/reclaiming that task, while an invalid digest, wrong queue-head, or foreign receipt fails closed.
- [ ] ACC-3: Foreign staged governance entries survive publication success and every injected failure with identical index metadata and worktree bytes.
- [ ] ACC-4: The regression demonstrates the prior red predicate, then a green execution under the same case ID and candidate SHA.
- [ ] ACC-5: `validate:cli` and the two focused tests pass using the frozen runner after a sealed runner-sync build/release receipt is committed.
- [ ] ACC-6: ATM-GOV-0344's existing receipt and queue can be reconciled using the generalized recovery path; no task-specific branch is introduced.

## Acceptance

- [ ] Deliverables and validators are filled before import or implementation.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T22:51:38.168Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0345-make-sealed-runner-publication-atomic-across-task-close-and-queue-release.task.md","contentDigest":"sha256:bcde4f47e5e0dd9c88e3af93670894da2fe8d5a7da7d9f64f0c6e42ed239a53d"} -->
