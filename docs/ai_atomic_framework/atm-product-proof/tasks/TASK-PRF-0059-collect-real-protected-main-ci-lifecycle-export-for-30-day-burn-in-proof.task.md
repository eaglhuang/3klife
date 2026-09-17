---
task_id: TASK-PRF-0059
title: Collect real protected-main CI lifecycle export for 30-day burn-in proof
status: planned
owner: atm-product-proof
priority: P0
depends_on:
  - TASK-PRF-0058
causalGraph:
  causalDependencies:
    - TASK-PRF-0058
  startConditions: []
  softRelations:
    - TASK-PRF-0055
  changedPublicSeams: []
  causalImpactEdges:
    - ci-lifecycle-evidence-to-burn-in-claim
  parallelFrontierInputs:
    - github-actions-run-attempt-export
    - product-ci-job-timestamps
  validatorReferences:
    - ci-burn-in-evidence-collector
    - measure-product-ci-burn-in
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/atm-product-ci-lifecycle-evidence.md
  - docs/reports/atm-product-ci-burn-in-real-export.md
deliverables:
  - docs/reports/atm-product-ci-burn-in-real-export.md
  - docs/reports/atm-product-ci-lifecycle-evidence.md
  - external:C:/Users/User/atm-benchmark-sink/TASK-PRF-0059/github-attempt-export.json
  - external:C:/Users/User/atm-benchmark-sink/TASK-PRF-0059/lifecycle-receipt.json
validators:
  - node --strip-types tests/cli/ci-burn-in-evidence-collector.test.ts
  - node --strip-types scripts/collect-ci-burn-in-evidence.ts --input C:/Users/User/atm-benchmark-sink/TASK-PRF-0059/github-attempt-export.json --output C:/Users/User/atm-benchmark-sink/TASK-PRF-0059/lifecycle-receipt.json
  - node --strip-types scripts/measure-product-ci-burn-in.ts --input C:/Users/User/atm-benchmark-sink/TASK-PRF-0059/lifecycle-receipt.json --report-only
testContributions:
  - caseId: test_prf0059_real_lifecycle_receipt_replays_7f6d2a11
    targetGroupId: null
    semanticKey: real_ci_lifecycle_receipt_replay
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [ci-lifecycle-evidence-to-burn-in-claim]
    expectedRedPredicate: incomplete or fabricated lifecycle telemetry is rejected
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0058
    contractEdge: ci-lifecycle-contract
    resourceKey: ci-burn-in-evidence-collector
  - caseId: test_prf0059_incomplete_export_fails_closed_4c1b9e27
    targetGroupId: null
    semanticKey: incomplete_ci_export_fails_closed
    coversAcceptance: [ACC-5]
    coversImpactEdges: [ci-lifecycle-evidence-to-burn-in-claim]
    expectedRedPredicate: missing attempt or exclusion provenance yields invalid-input
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0058
    contractEdge: ci-lifecycle-contract
    resourceKey: ci-burn-in-evidence-collector
  - caseId: test_prf0059_scope_boundary_is_preserved_5aa4e0c2
    targetGroupId: null
    semanticKey: ci_evidence_scope_boundary
    coversAcceptance: [ACC-6]
    coversImpactEdges: [ci-lifecycle-evidence-to-burn-in-claim]
    expectedRedPredicate: report and receipt changes contain no workflow, threshold, npm, benchmark, or historical-task mutation
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: scope-preservation
    resourceKey: scope-review
requiredTestCaseIds:
  - test_prf0059_real_lifecycle_receipt_replays_7f6d2a11
  - test_prf0059_incomplete_export_fails_closed_4c1b9e27
  - test_prf0059_scope_boundary_is_preserved_5aa4e0c2
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: reasoned-not-applicable
tddNotApplicableReason: This card collects and replays external evidence; it does not change product behavior or a code contract.
tddExemptions:
  - kind: docs
    reason: The repository report records provenance and replay instructions only.
methodProfiles: []
evidence:
  required: command-backed
rollback:
  strategy: remove-receipt-and-revert-report
atomizationImpact:
  ownerAtomOrMap: atm.product-ci-burn-in-evidence-map
  mapUpdates:
    - docs/reports/atm-product-ci-lifecycle-evidence.md
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0059 Collect real protected-main CI lifecycle export for 30-day burn-in proof

## Intent

Collect the real protected-main GitHub Actions run-attempt and Product CI job
lifecycle needed by the existing TASK-PRF-0058 collector. The current export is
not sufficient: it covers fewer than 30 days, has failures, and has no retry or
repair telemetry. Raw provider JSON must stay outside Git; the target report
must contain only query bounds, schema/version, digests, exclusions, and the
exact offline replay commands.

## Acceptance

- [ ] **ACC-1 — Full policy window:** export covers at least 30 calendar days and at least 90 eligible completed protected-main Product CI runs, with immutable run, attempt, job, branch, event, commit, and timestamp fields.
- [ ] **ACC-2 — Lifecycle provenance:** every failed or retried logical run has first failure, retry count, last attempt, repair acceptance (or explicit unresolved state), failure class, and an attributable job-level source.
- [ ] **ACC-3 — Exclusions are explicit:** every ineligible attempt has a non-empty exclusion reason; no missing telemetry is defaulted to zero or inferred from unrelated timestamps.
- [ ] **ACC-4 — Reproducible replay:** the external export is accepted by `collect-ci-burn-in-evidence.ts`, its digest-bearing receipt is accepted by `measure-product-ci-burn-in.ts --report-only`, and the report records both commands and digests.
- [ ] **ACC-5 — Fail closed:** a negative replay with missing lifecycle or exclusion data returns `invalid-input`; the task must not claim long-term green unless the evaluator independently returns `long-term-green`.
- [ ] **ACC-6 — Scope preservation:** no workflow permission, burn-in threshold, npm publication, benchmark arm, or historical task record is changed.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T03:57:44.177Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0059-collect-real-protected-main-ci-lifecycle-export-for-30-day-burn-in-proof.task.md","contentDigest":"sha256:9478a23b9fb178b10bd493012bd6bfd2b8dc3d0621c0d8bc6237df2aa779e35c"} -->
