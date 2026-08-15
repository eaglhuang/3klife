---
task_id: ATM-GOV-0396
title: Do not forward stale-runner emergency arguments after runner publication is accepted
status: done
owner: cursor-captain
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - taskflow close dry-run reported ready after runner publication was accepted and the sealed SHA equalled HEAD, but close --write forwarded --allow-stale-runner and required an emergency lease
  changedPublicSeams:
    - taskflow-close-runner-recovery-forwarding
  causalImpactEdges:
    - accepted-publication-and-matching-head -> no-stale-runner-emergency-args
    - unaccepted-or-mismatched-or-stale-receipt -> fail-closed-recovery-args
    - dry-run-and-write -> one-normalized-runner-recovery-decision
  parallelFrontierInputs:
    - ATM-GOV-0370 remains claimed and must close through the repaired normal path after this source lands
    - ATM-GOV-0391 and ATM-GOV-0393 close only after 0370
    - ATM-GOV-0394 and ATM-GOV-0395 belong to another actor and must not be touched
  validatorReferences:
    - tests/cli/taskflow-emergency-approval-forwarding.test.ts
    - npm run typecheck
  phaseOwner: Wave-1-framework-foundation
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/runner-recovery-forwarding.ts
  - tests/cli/taskflow-emergency-approval-forwarding.test.ts
deliverables:
  - packages/cli/src/commands/taskflow/runner-recovery-forwarding.ts
  - tests/cli/taskflow-emergency-approval-forwarding.test.ts
validators:
  - node --strip-types tests/cli/taskflow-emergency-approval-forwarding.test.ts
  - npm run typecheck
testContributions:
  - caseId: accepted_publication_matching_head_forwards_no_stale_runner_args_0396
    targetGroupId: null
    semanticKey: accepted-publication-close-is-not-emergency
    coversAcceptance: [ACC-1, ACC-3]
    coversImpactEdges: [accepted-publication-and-matching-head -> no-stale-runner-emergency-args]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: taskflow-close-runner-recovery-forwarding
    resourceKey: null
    expectedRedPredicate: buildTaskflowRunnerRecoveryArgs forwards --allow-stale-runner when publication is accepted and sealed SHA equals HEAD
  - caseId: unaccepted_or_mismatched_receipt_keeps_fail_closed_recovery_0396
    targetGroupId: null
    semanticKey: recovery-path-remains-fail-closed
    coversAcceptance: [ACC-2]
    coversImpactEdges: [unaccepted-or-mismatched-or-stale-receipt -> fail-closed-recovery-args]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: taskflow-close-runner-recovery-forwarding
    resourceKey: null
    expectedRedPredicate: an unaccepted receipt or SHA mismatch with no lease still forwards --allow-stale-runner, or a leased recovery path drops the protected flag
  - caseId: dry_run_and_write_share_normalized_runner_recovery_decision_0396
    targetGroupId: null
    semanticKey: dry-run-write-recovery-decision-parity
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [dry-run-and-write -> one-normalized-runner-recovery-decision]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: taskflow-close-runner-recovery-forwarding
    resourceKey: null
    expectedRedPredicate: dry-run readiness and write forwarded args are computed from different predicates so accepted publication is ready in dry-run and emergency in write
requiredTestCaseIds:
  - accepted_publication_matching_head_forwards_no_stale_runner_args_0396
  - unaccepted_or_mismatched_receipt_keeps_fail_closed_recovery_0396
  - dry_run_and_write_share_normalized_runner_recovery_decision_0396
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
errorCodes: []
outOfScope:
  - release
  - templates
nonGoals:
  - Issuing or consuming a stale-runner emergency lease for a publication that is already accepted
  - Changing runner-sync enqueue, build, or publication admission
createdByCommand: atm plan card create
completed_at: "2026-08-15T10:19:39.793Z"
completed_by_agent: "cursor-captain"
closedAt: "2026-08-15T10:19:39.793Z"
closedByActor: "cursor-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-15T10-19-39-793Z-close-779dbb83e7a1"
lastTransitionAt: "2026-08-15T10:19:39.793Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0c499caf445ff4108e0d89dacc01954da1387af0"
---

# ATM-GOV-0396 Do not forward stale-runner emergency arguments after runner publication is accepted

## Intent

Close write must not disguise an accepted runner publication as stale-runner emergency recovery. Dry-run and write must share one normalized runner-recovery decision. Unaccepted receipts, SHA mismatch, and true stale recovery remain fail-closed.

## Required Work

- Extract one canonical `atm.taskflowRunnerRecoveryDecision.v1` used by taskflow close dry-run and write.
- `taskflow/implementation.ts` already calls `buildTaskflowRunnerRecoveryArgs` on write and already skips the dry-run stale blocker when publication is accepted. This card changes that helper's decision, not the 0253-scoped implementation file.
- When `runnerReceiptPublicationClosure.status === accepted` and the sealed source SHA equals HEAD, forward no `--allow-stale-runner` and no emergency-approval args.
- When the receipt is not accepted, the SHA does not match HEAD, or recovery is otherwise required, keep the existing fail-closed / leased recovery forwarding.
- Add focused tests that assert the actual forwarded argument array, including the saved ATM-GOV-0370 dry-run/write split.

## Acceptance

- [ ] ACC-1: Accepted publication with sealed SHA equal to HEAD forwards no `--allow-stale-runner` and does not require emergency lane approval.
- [ ] ACC-2: Unaccepted receipt, SHA mismatch, or true stale recovery keeps fail-closed behavior; a present recovery lease still forwards the protected flag.
- [ ] ACC-3: Dry-run and write use the same normalized runner-recovery decision; they must not split into dry-run ready / write emergency.
- [ ] ACC-4: Focused tests cover the saved 0370 dry-run/write JSON shape and assert forwarded args, not only message text.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-15T08:52:35.903Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0396-do-not-forward-stale-runner-emergency-arguments-after-runner-publication-is-accepted.task.md","contentDigest":"sha256:8045125b500386d4a03dde44361eb88827d203d4a5b00053f8094dad5a061592"} -->
