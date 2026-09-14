---
task_id: TASK-PRF-0063
title: Make CI lifecycle receipts replayable and semantically fail-closed
status: done
owner: atm-product-proof
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations:
    - TASK-PRF-0059
  changedPublicSeams:
    - collect-ci-burn-in-evidence-replay
    - measure-product-ci-burn-in
  causalImpactEdges:
    - ci-receipt-contract-to-burn-in-claim
  parallelFrontierInputs:
    - TASK-PRF-0059-external-export
    - wrapper-versus-array-replay
  validatorReferences:
    - ci-burn-in-evidence-collector
    - measure-product-ci-burn-in
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
  - docs/reports/atm-product-ci-lifecycle-evidence.md
  - docs/reports/atm-product-ci-burn-in-real-export.md
deliverables:
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
  - docs/reports/atm-product-ci-lifecycle-evidence.md
  - docs/reports/atm-product-ci-burn-in-real-export.md
validators:
  - node --strip-types tests/cli/ci-burn-in-evidence-collector.test.ts
  - node --strip-types tests/cli/product-proof-evidence-boundary.test.ts
  - node --strip-types scripts/collect-ci-burn-in-evidence.ts --input C:/Users/User/atm-benchmark-sink/TASK-PRF-0059/github-attempt-export.json --output C:/Users/User/atm-benchmark-sink/TASK-PRF-0059/lifecycle-receipt.json
  - node --strip-types scripts/measure-product-ci-burn-in.ts --input C:/Users/User/atm-benchmark-sink/TASK-PRF-0059/lifecycle-receipt.json --report-only
errorCodes: []
testContributions:
  - caseId: test_prf0063_wrapper_replay_is_canonical_8a31e9c2
    targetGroupId: null
    semanticKey: ci_lifecycle_wrapper_replay_is_canonical
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [ci-receipt-contract-to-burn-in-claim]
    expectedRedPredicate: wrapper receipt is rejected or silently measured as empty history
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: ci-lifecycle-receipt-contract
    resourceKey: ci-burn-in-evidence-collector
  - caseId: test_prf0063_report_only_semantic_status_9d70c1b4
    targetGroupId: null
    semanticKey: report_only_preserves_negative_semantic_status
    coversAcceptance: [ACC-3]
    coversImpactEdges: [ci-receipt-contract-to-burn-in-claim]
    expectedRedPredicate: report-only zero exit is treated as a green claim despite non-green claimStatus
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: ci-lifecycle-evaluator-contract
    resourceKey: measure-product-ci-burn-in
  - caseId: test_prf0063_missing_lifecycle_fails_closed_5c9e40aa
    targetGroupId: null
    semanticKey: missing_lifecycle_fails_closed
    coversAcceptance: [ACC-4]
    coversImpactEdges: [ci-receipt-contract-to-burn-in-claim]
    expectedRedPredicate: missing lifecycle or exclusion provenance yields a green or incomplete result
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: ci-lifecycle-evaluator-contract
    resourceKey: measure-product-ci-burn-in
  - caseId: test_prf0063_scope_boundary_preserved_6f31d7b8
    targetGroupId: null
    semanticKey: ci_replay_contract_scope_boundary
    coversAcceptance: [ACC-5]
    coversImpactEdges: [ci-receipt-contract-to-burn-in-claim]
    expectedRedPredicate: replay fix mutates CI policy, npm release, benchmark arms, or historical task state
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: scope-preservation
    resourceKey: scope-review
requiredTestCaseIds:
  - test_prf0063_wrapper_replay_is_canonical_8a31e9c2
  - test_prf0063_report_only_semantic_status_9d70c1b4
  - test_prf0063_missing_lifecycle_fails_closed_5c9e40aa
  - test_prf0063_scope_boundary_preserved_6f31d7b8
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddExemptions: []
methodProfiles: []
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.product-ci-burn-in-evidence-map
  mapUpdates:
    - docs/reports/atm-product-ci-lifecycle-evidence.md
  extractionCandidates: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T06:42:05.355Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T06:42:05.355Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T06-42-05-355Z-close-d9b7f2736a6e"
lastTransitionAt: "2026-09-14T06:42:05.355Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a93adc34ca5ab564fd6f577522b3abe14e3138fe"
---

# TASK-PRF-0063 Make CI lifecycle receipts replayable and semantically fail-closed

## Intent

Make the CI lifecycle evidence boundary replayable as one canonical receipt
shape and semantically fail-closed. TASK-PRF-0059 exposed a real negative
observation: the external export contains 800 runs across 50.789502 days,
with 180 successful runs, 620 failed runs, zero retries, and 620 unresolved
failures. The wrapper receipt was nevertheless passed directly to an evaluator
that only accepted a bare array, producing `history-empty` under `--report-only`.
This follow-up fixes that contract without rewriting the 0059 history or
claiming a green burn-in result.

The 0059 external export and its digests are retained as replay fixtures. The
collector and evaluator must share one documented canonical format, preserve
source and receipt digests, and expose semantic claim status independently from
process exit code.

## Acceptance

- [ ] **ACC-1 — Canonical replay:** the literal 0059 collector output is accepted by the evaluator without manual extraction or format translation; a canonical receipt schema and digest fields are documented and tested.
- [ ] **ACC-2 — Real negative replay preserved:** replaying the retained 0059 export reports 800 records, 50.789502 calendar days, 180 successes, 620 failures, zero retries, and 620 unresolved failures; it does not claim `long-term-green`.
- [ ] **ACC-3 — Semantic fail-closed:** `--report-only` may return a report for negative evidence, but the report and tests must make `claimStatus`/semantic verdict explicit so a zero process exit cannot be interpreted as a green acceptance.
- [ ] **ACC-4 — Invalid lifecycle rejected:** missing lifecycle fields, exclusion reasons, or malformed wrapper shape return `invalid-input` (or an equivalent non-green semantic status) and never default missing telemetry to zero.
- [ ] **ACC-5 — Scope preservation:** only the collector, evaluator, focused tests, and the two lifecycle reports may change; no CI permissions, thresholds, npm publication, benchmark arm, or TASK-PRF-0059 history is modified.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T06:29:33.181Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0063-make-ci-lifecycle-receipts-replayable-and-semantically-fail-closed.task.md","contentDigest":"sha256:84fe23dbd47e14f9fd31ed88ff009fef5ed99973987a3a49207239afe3d538e1"} -->
