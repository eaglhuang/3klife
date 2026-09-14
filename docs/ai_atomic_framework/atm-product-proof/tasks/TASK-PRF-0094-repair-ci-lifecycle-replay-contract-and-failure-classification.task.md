---
task_id: TASK-PRF-0094
title: Require job-level provenance in CI lifecycle evidence before burn-in replay
status: done
owner: atm-product-proof
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-PRF-0059 remains blocked and is not reopened or relabeled.
    - TASK-PRF-0063's wrapper replay fix remains the current canonical contract; this card does not recreate that defect.
    - Existing 0059 raw export and negative burn-in result remain immutable external evidence.
  softRelations: [TASK-PRF-0059, TASK-PRF-0063, TASK-PRF-0058]
  changedPublicSeams: [ci-lifecycle-job-provenance]
  causalImpactEdges:
    - product-ci-attempt-to-attributable-job-source
    - incomplete-export-to-fail-closed-replay
  parallelFrontierInputs: [github-job-metadata, failure-classification-contract, lifecycle-replay-tests]
  validatorReferences:
    - test_prf0094_requires_job_provenance_41a7c9d2
    - test_prf0094_preserves_failure_class_and_source_5b2e8f10
    - test_prf0094_missing_job_provenance_fails_closed_6c3d9a21
  phaseOwner: phase-4-ci-reliability-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - docs/reports/atm-product-ci-lifecycle-evidence.md
deliverables:
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - append-only update to docs/reports/atm-product-ci-lifecycle-evidence.md
validators:
  - node --strip-types tests/cli/ci-burn-in-evidence-collector.test.ts
  - node --strip-types tests/cli/product-ci-burn-in.test.ts
  - npm run typecheck
  - npm run check:encoding:touched -- --files scripts/collect-ci-burn-in-evidence.ts,scripts/measure-product-ci-burn-in.ts,tests/cli/ci-burn-in-evidence-collector.test.ts,docs/reports/atm-product-ci-lifecycle-evidence.md
testContributions:
  - caseId: test_prf0094_requires_job_provenance_41a7c9d2
    semanticKey: attempt_requires_attributable_product_ci_job
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [product-ci-attempt-to-attributable-job-source]
    expectedRedPredicate: An attempt with only a conclusion and no immutable Product CI job identity is accepted into the canonical receipt.
    responsibility: task-required
    dependencyEdge: github-job-metadata-to-canonical-receipt
    contractEdge: ci-lifecycle-job-provenance
    resourceKey: ci-lifecycle-collector
  - caseId: test_prf0094_preserves_failure_class_and_source_5b2e8f10
    semanticKey: failure_class_and_job_source_survive_grouping
    coversAcceptance: [ACC-2, ACC-3]
    coversImpactEdges: [product-ci-attempt-to-attributable-job-source]
    expectedRedPredicate: Grouping multiple attempts drops the failing job source, retry identity, or explicit failure class.
    responsibility: task-required
    dependencyEdge: attempt-grouping-to-lifecycle-provenance
    contractEdge: ci-lifecycle-job-provenance
    resourceKey: lifecycle-receipt
  - caseId: test_prf0094_missing_job_provenance_fails_closed_6c3d9a21
    semanticKey: missing_job_provenance_negative_control
    coversAcceptance: [ACC-4]
    coversImpactEdges: [incomplete-export-to-fail-closed-replay]
    expectedRedPredicate: A replay with missing job id, name, or URL is treated as a valid lifecycle record instead of invalid-input.
    responsibility: task-required
    dependencyEdge: incomplete-export-to-validator-refusal
    contractEdge: fail-closed-ci-lifecycle-input
    resourceKey: negative-fixture
  - caseId: test_prf0094_legacy_receipt_not_reclassified_7d4e0b32
    semanticKey: prior_0059_result_remains_negative
    coversAcceptance: [ACC-5]
    coversImpactEdges: [incomplete-export-to-fail-closed-replay]
    expectedRedPredicate: The implementation rewrites, upgrades, or relabels the existing TASK-PRF-0059 unexplained-failure receipt.
    responsibility: task-required
    dependencyEdge: historical-receipt-to-append-only-report
    contractEdge: evidence-provenance-boundary
    resourceKey: prior-negative-receipt
  - caseId: test_prf0094_scope_and_validation_contract_8e5f1c43
    semanticKey: scope_and_required_validators_remain_explicit
    coversAcceptance: [ACC-6]
    coversImpactEdges: [incomplete-export-to-fail-closed-replay]
    expectedRedPredicate: The card or implementation changes workflow policy, thresholds, npm behavior, benchmark arms, or omits a required focused validator.
    responsibility: task-required
    dependencyEdge: scoped-contract-to-validation-suite
    contractEdge: scope-preservation
    resourceKey: scope-review
requiredTestCaseIds:
  - test_prf0094_requires_job_provenance_41a7c9d2
  - test_prf0094_preserves_failure_class_and_source_5b2e8f10
  - test_prf0094_missing_job_provenance_fails_closed_6c3d9a21
  - test_prf0094_legacy_receipt_not_reclassified_7d4e0b32
  - test_prf0094_scope_and_validation_contract_8e5f1c43
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit-preserve-negative-receipt
  notes: Revert only collector/evaluator/tests/report changes; retain TASK-PRF-0059 raw export and blocked report unchanged.
atomizationImpact:
  ownerAtomOrMap: atm.product-ci-burn-in-evidence-map
  mapUpdates: []
  newScriptsAllowed: false
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T14:50:23.229Z"
completed_by_agent: "codex-product-proof"
closedAt: "2026-09-14T14:50:23.229Z"
closedByActor: "codex-product-proof"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T14-50-23-229Z-close-b23c0e05655d"
lastTransitionAt: "2026-09-14T14:50:23.229Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "14126f7a08ad05ab27a333f03eac6323663be56f"
---

# TASK-PRF-0094 Require job-level provenance in CI lifecycle evidence before burn-in replay

## Intent

TASK-PRF-0059's external replay is correctly retained as a negative observation,
but its 800-attempt export does not provide enough immutable job-level provenance
to distinguish a genuine Product CI failure from an incomplete provider export.
The current collector accepts only a Product CI conclusion and a manually supplied
failure class. That is too shallow for the product requirement to preserve first
failure, retry, repair, and attributable job evidence. This follow-up strengthens
the input boundary so future exports must carry the Product CI job id, name, and
URL through grouping into the canonical receipt. It does not reinterpret 0059,
change the burn-in threshold, or claim long-term green.

## First-principles boundary

An aggregate failure count is not a diagnosis. A lifecycle claim is admissible
only when each attempt can be traced to an immutable Product CI job source and a
declared failure class; absent fields remain `invalid-input`, never zero or
`unexplained` by inference. The existing wrapper replay behavior from 0063 is
the baseline and is not reopened here.

## Acceptance

- [ ] **ACC-1:** Each in-scope attempt requires immutable Product CI job identity (`jobId`, `jobName`, and `jobUrl`) in addition to its conclusion; the canonical receipt preserves that source for the grouped logical run.
- [ ] **ACC-2:** Grouping retries retains the latest job source, every attempt identity, first-failure timing, retry count, and repair timing without deriving missing values from unrelated timestamps.
- [ ] **ACC-3:** Failure classes remain explicit and source-attributable; the implementation does not map provider `missing`, wrapper failures, or absent job data to success or zero-cost values.
- [ ] **ACC-4:** Missing or malformed job provenance fails closed in both collector and evaluator-facing replay tests; the negative fixture must return `invalid-input` or a collector error.
- [ ] **ACC-5:** The existing TASK-PRF-0059 raw export, lifecycle receipt, and `unexplained-failure` report remain byte-for-byte unchanged; only an append-only report note may reference this follow-up.
- [ ] **ACC-6:** Focused collector/evaluator tests, typecheck, and encoding guard pass. No workflow, threshold, npm, benchmark-arm, task-history, or external raw-evidence mutation is allowed.

## Out of scope

- Reopening or closing TASK-PRF-0059.
- Reclassifying its 180-success/620-failure observation or manufacturing retry data.
- Querying GitHub, publishing npm, changing CI workflow permissions, or changing the 30-day/90-run policy.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T14:07:13.370Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0094-repair-ci-lifecycle-replay-contract-and-failure-classification.task.md","contentDigest":"sha256:d011f53489043a89fedcdb12bfe325bd2d3cfc5acc8b13661b48d97d057523ec"} -->