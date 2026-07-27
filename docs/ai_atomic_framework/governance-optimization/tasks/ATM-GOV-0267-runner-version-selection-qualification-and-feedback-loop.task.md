---
task_id: ATM-GOV-0267
title: Runner version selection qualification and feedback loop
status: planned
owner: atm-runner-sync
priority: P1
milestone: ATM-3.1-R0Q.5
severity: P1
depends_on:
  - ATM-GOV-0266
causalGraph:
  causalDependencies:
    - ATM-GOV-0266
  startConditions:
    - runner selection receipts and execution attestations are emitted by normal task lifecycle
  softRelations:
    - TASK-SKL-0029
  changedPublicSeams:
    - runner version selection verification
    - runner selection evidence qualification
  causalImpactEdges:
    - task-requirement-to-compatible-runner-selection
    - runner-selection-receipt-to-independent-verdict
    - qualified-feedback-to-policy-promotion
  parallelFrontierInputs: []
  validatorReferences:
    - test_int_runner_selection_counterfactual_replay
    - test_int_runner_selection_receipt_verification
    - test_int_runner_selection_shadow_feedback
  phaseOwner: runner-selection-qualification
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Selection telemetry is not proof of selection correctness. This card independently recomputes and qualifies version choices before any feedback can influence the policy."
scopePaths:
  - packages/core/src/broker/runner-version-registry.ts
  - packages/core/src/broker/runner-version-selection-verifier.ts
  - packages/cli/src/commands/taskflow/runner-selection-evidence.ts
  - scripts/runner-version-selection-replay.ts
  - tests/core/runner-version-selection-verifier.test.ts
  - tests/cli/runner-selection-counterfactual-replay.test.ts
  - tests/cli/runner-selection-shadow-feedback.test.ts
deliverables:
  - packages/core/src/broker/runner-version-selection-verifier.ts
  - scripts/runner-version-selection-replay.ts
  - tests/core/runner-version-selection-verifier.test.ts
  - tests/cli/runner-selection-counterfactual-replay.test.ts
  - tests/cli/runner-selection-shadow-feedback.test.ts
validators:
  - node --strip-types tests/core/runner-version-selection-verifier.test.ts
  - node --strip-types tests/cli/runner-selection-counterfactual-replay.test.ts
  - node --strip-types tests/cli/runner-selection-shadow-feedback.test.ts
  - npm run typecheck
testContributions: []
requiredTestCaseIds:
  - test_int_runner_selection_counterfactual_replay
  - test_int_runner_selection_receipt_verification
  - test_int_runner_selection_shadow_feedback
phaseTestCaseIds: []
advisoryTestCaseIds:
  - test_cmd_typecheck
errorCodes:
  - ATM_RUNNER_SELECTION_RECEIPT_INVALID
  - ATM_RUNNER_SELECTION_POLICY_UNQUALIFIED
evidence:
  required: independent-runner-selection-qualification-report
rollback:
  strategy: keep the current qualified selection policy and disable only unqualified recommendation modes
  notes: "Feedback may change policy only through a sealed, independently verified promotion record. Never infer policy correctness from a task's exit code alone."
atomizationImpact:
  ownerAtomOrMap: atm.runner-version-selection-qualification
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runner-version-selection-verifier
      pattern: Pure Policy Verifier
      source: packages/core/src/broker/runner-version-selection-verifier.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0267 Runner version selection qualification and feedback loop

## Intent

Prove that runner-version selection is correct independently of whether a task
happened to pass. Recompute each selection from sealed inputs, exercise known
counterfactual cases, and use real-task observations only as shadow feedback.
No outcome may automatically promote or rewrite the selection policy.

## Acceptance

- [ ] `verifyRunnerSelection(requirement, registrySnapshot, receipt)` is pure and independently recomputes eligibility, ordering, selected version, rejection reasons, and revalidation boundary without trusting the receipt's conclusion.
- [ ] The verifier accepts a task only when its `runnerSelectionReceipt` and `runnerExecutionAttestation` match the sealed registry snapshot, policy version, selected runner digests, and executed validator evidence.
- [ ] A deterministic counterfactual corpus covers: latest-compatible selection, compatible non-latest selection, missing required capability, schema incompatibility, expired revalidation boundary, and a newer runner-input segment that must not be reused.
- [ ] Historical receipts replay against their original sealed registry snapshot and retain their original verdict. A current registry may be compared for diagnosis, but must not rewrite historical selection evidence.
- [ ] Shadow mode runs the candidate policy beside the qualified policy for real future task cards and records disagreement, false reject, stale selection, unnecessary rebuild, and compatibility-gap counters without changing the runner actually granted to the task.
- [ ] Policy promotion requires a sealed independent qualification report, zero false-compatible grants in the corpus, explicit counterfactual coverage, and an owner-approved promotion record. Passing task commands, popularity of a version, or a lower rebuild count alone are insufficient.
- [ ] The report exposes selection age, latest-version gap, revalidation rate, fallback rate, false-reject rate, false-compatible rate, and per-capability coverage. It contains no task-id, actor, date, or local-path exception in control flow.

## Execution boundary

This card follows the production session and receipt contract in ATM-GOV-0266.
It is deliberately a verifier and feedback card, not a second selection engine:
the registry remains the sole production decision owner. It may run alongside
ordinary future tasks in shadow mode, but policy promotion is serialized behind
the qualification report.

