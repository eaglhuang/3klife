---
task_id: TASK-PRF-0123
title: Distinguish successful CI reruns from repaired failures in lifecycle replay
status: planned
owner: atm-product-proof
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - scripts/export-github-ci-attempts.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - tests/cli/export-github-ci-attempts.test.ts
  - tests/cli/product-ci-burn-in.test.ts
deliverables:
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - scripts/export-github-ci-attempts.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - tests/cli/export-github-ci-attempts.test.ts
  - tests/cli/product-ci-burn-in.test.ts
  - append-only external replay note under C:/Users/User/atm-benchmark-sink/PRODUCT-PROOF-20260922/
validators:
  - node --strip-types tests/cli/ci-burn-in-evidence-collector.test.ts
  - node --strip-types tests/cli/export-github-ci-attempts.test.ts
  - node --strip-types tests/cli/product-ci-burn-in.test.ts
  - npm run typecheck
  - npm run check:encoding:touched -- --files scripts/collect-ci-burn-in-evidence.ts,scripts/measure-product-ci-burn-in.ts,scripts/export-github-ci-attempts.ts,tests/cli/ci-burn-in-evidence-collector.test.ts,tests/cli/export-github-ci-attempts.test.ts,tests/cli/product-ci-burn-in.test.ts
testContributions:
  - caseId: test_prf0123_successful_rerun_is_not_repair_5f7b1a2c
    semanticKey: all_success_attempts_are_not_unrepaired_failures
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [successful-rerun-to-lifecycle-verdict]
    expectedRedPredicate: A run with two successful Product CI attempts is rejected as unrepaired-retry.
    responsibility: task-required
    dependencyEdge: attempt-outcome-to-lifecycle-classification
    contractEdge: ci-lifecycle-replay
    resourceKey: ci-lifecycle-collector
  - caseId: test_prf0123_failed_then_success_is_repair_8c2d4e6a
    semanticKey: failed_attempt_requires_repair_evidence
    coversAcceptance: [ACC-2]
    coversImpactEdges: [failure-repair-to-burn-in-verdict]
    expectedRedPredicate: A failed first attempt followed by success is accepted without firstFailureAt and repairAcceptedAt.
    responsibility: task-required
    dependencyEdge: failure-attempt-to-repair-attempt
    contractEdge: ci-lifecycle-replay
    resourceKey: ci-lifecycle-evaluator
  - caseId: test_prf0123_real_receipt_replays_without_false_block_1d9e7c3b
    semanticKey: real_export_replay_no_false_unrepaired_retry
    coversAcceptance: [ACC-3]
    coversImpactEdges: [real-receipt-to-reproducible-verdict]
    expectedRedPredicate: The retained real export is blocked solely by the successful-rerun semantic bug instead of its actual coverage/failure observations.
    responsibility: task-required
    dependencyEdge: external-receipt-to-replay
    contractEdge: evidence-replay
    resourceKey: real-ci-receipt
  - caseId: test_prf0123_scope_and_regression_contract_7a4c9e1f
    semanticKey: lifecycle_fix_scope_is_bounded
    coversAcceptance: [ACC-4]
    coversImpactEdges: [bounded-lifecycle-fix-to-safe-replay]
    expectedRedPredicate: The fix changes CI thresholds, workflow permissions, npm behavior, benchmark arms, or historical TASK-PRF-0059 evidence.
    responsibility: task-required
    dependencyEdge: scoped-change-to-regression-suite
    contractEdge: scope-preservation
    resourceKey: scope-review
requiredTestCaseIds:
  - test_prf0123_successful_rerun_is_not_repair_5f7b1a2c
  - test_prf0123_failed_then_success_is_repair_8c2d4e6a
  - test_prf0123_real_receipt_replays_without_false_block_1d9e7c3b
  - test_prf0123_scope_and_regression_contract_7a4c9e1f
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit-preserve-negative-receipt
  notes: Revert only lifecycle collector/evaluator/exporter and focused tests; retain external raw export and negative report unchanged.
atomizationImpact:
  ownerAtomOrMap: atm.product-ci-burn-in-evidence-map
  mapUpdates: []
  newScriptsAllowed: false
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0123 Distinguish successful CI reruns from repaired failures in lifecycle replay

## Intent

The first real GitHub replay exposed a semantic false block: run
`35698733701` has two successful Product CI attempts, but the evaluator emits
`record-35698733701-unrepaired-retry` because `retryCount` is treated as proof
of a repaired failure. Separate benign successful reruns from failure-repair
lifecycles without weakening the existing fail-closed rule for a failed first
attempt. Preserve TASK-PRF-0059 historical evidence and do not change the
30-day/90-run policy.

## Acceptance

- [ ] **ACC-1:** All-success attempt groups replay as valid lifecycle records with no `firstFailureAt` or `repairAcceptedAt` requirement.
- [ ] **ACC-2:** A failed attempt followed by a successful attempt still requires and records first failure, repair time, and an explicit failure class.
- [ ] **ACC-3:** The real receipt is replayable without the false `unrepaired-retry` block; coverage exclusions and genuine failures remain visible and unchanged.
- [ ] **ACC-4:** Existing collector/evaluator/exporter tests, typecheck, and encoding guard pass; no threshold, workflow permission, npm, benchmark-arm, or historical TASK-PRF-0059 mutation is allowed.

## Out of scope

- Reopening or rewriting TASK-PRF-0059, its raw export, or its historical negative report.
- Changing the 30-day/90-run policy or excluding retries from telemetry.
- Treating a successful rerun as evidence that an earlier failure was repaired when no failure occurred.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T15:41:29.498Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0123-distinguish-successful-ci-reruns-from-repaired-failures-in-lifecycle-replay.task.md","contentDigest":"sha256:0bb29f9094551a1615ce73af035d44784c223323da9422a173d9b39b8d01329a"} -->
