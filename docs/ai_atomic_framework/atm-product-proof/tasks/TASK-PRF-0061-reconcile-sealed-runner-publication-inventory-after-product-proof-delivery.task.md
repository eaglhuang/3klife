---
task_id: TASK-PRF-0061
title: Reconcile sealed runner publication inventory after product-proof delivery
status: planned
series: PRF
series_reason: Closest approved family because this is a product-proof delivery and release-disposition gate, not a generic temporary cleanup.
owner: release-runtime-steward
priority: P0
depends_on: [TASK-PRF-0060]
causalGraph:
  causalDependencies: [TASK-PRF-0060]
  startConditions:
    - "doctor reports ATM_RUNNER_PUBLICATION_INVENTORY_INCOMPLETE for dirty release outputs"
    - "release/atm-onefile/release-manifest.json names sealed source 4d4858f3cc9ecfbd36bc637a5a2b40fd8c59e801"
    - "no runner-sync receipt in .atm/history/evidence matches that sealed source"
  softRelations: [TASK-PRF-0052, TASK-PRF-0053]
  changedPublicSeams: [runner_publication_disposition, doctor_release_readiness]
  causalImpactEdges: [terminal_runner_publication, truthful_task_close]
  parallelFrontierInputs: [current_release_manifest, matching_sealed_receipt, dirty_output_inventory, foreign_wip_classification]
  validatorReferences: [runner-publication-disposition-gate, runner-publication-inventory-parity, runner-publication-reconciliation, doctor]
  phaseOwner: release
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
planning_repo_is_external_to_target: true
source_plan_path: C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof/atm-product-proof-plan.md
source_task_card_path: C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0061-reconcile-sealed-runner-publication-inventory-after-product-proof-delivery.task.md
target_repo: AI-Atomic-Framework
closure_authority: target_repo
target_import_method: node atm.mjs tasks import --from <source_task_card_path> --json
scopePaths:
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop
  - docs/reports/atm-runner-publication-reconciliation-task-prf-0061.md
  - tests/cli/runner-publication-disposition-gate.test.ts
  - tests/cli/runner-publication-inventory-parity.test.ts
  - tests/cli/runner-publication-reconciliation.test.ts
deliverables:
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop
  - docs/reports/atm-runner-publication-reconciliation-task-prf-0061.md
validators:
  - node --strip-types tests/cli/runner-publication-disposition-gate.test.ts
  - node --strip-types tests/cli/runner-publication-inventory-parity.test.ts
  - node --strip-types tests/cli/runner-publication-reconciliation.test.ts
  - node atm.mjs doctor --json
  - node atm.mjs broker runner-sync status --json
  - npm run validate:internal-release-sync -- --mode validate
testContributions:
  - caseId: test_prf0061_current_manifest_requires_matching_receipt_4b9e6a21
    targetGroupId: null
    semanticKey: current_manifest_sealed_source_receipt_binding
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [terminal_runner_publication]
    expectedRedPredicate: a release manifest with no receipt for its sealed source is classified inventory-incomplete
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0060
    contractEdge: runner_publication_disposition
    resourceKey: runner-publication-receipt
  - caseId: test_prf0061_foreign_outputs_not_absorbed_8f3c5a77
    targetGroupId: null
    semanticKey: foreign_release_wip_isolation
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [truthful_task_close]
    expectedRedPredicate: dirty outputs not named by the selected receipt remain foreign and are not staged or deleted
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: runner_publication_disposition
    resourceKey: foreign-wip
  - caseId: test_prf0061_terminal_disposition_replays_1d7b2c90
    targetGroupId: null
    semanticKey: terminal_runner_publication_replay
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: [terminal_runner_publication]
    expectedRedPredicate: doctor remains blocked when a generated publication has no receipt-backed terminal disposition
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: doctor_release_readiness
    resourceKey: doctor-publication-gate
requiredTestCaseIds:
  - test_prf0061_current_manifest_requires_matching_receipt_4b9e6a21
  - test_prf0061_foreign_outputs_not_absorbed_8f3c5a77
  - test_prf0061_terminal_disposition_replays_1d7b2c90
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: reasoned-not-applicable
tddNotApplicableReason: This card reconciles sealed publication evidence and generated output disposition; it does not change product behavior or a source code contract.
tddExemptions:
  - kind: docs
    reason: The report and external receipt preserve provenance and replay instructions only.
methodProfiles: []
evidence:
  required: command-backed-receipt-and-doctor-pass
rollback:
  strategy: revert-commit-preserve-before-inventory
atomizationImpact:
  ownerAtomOrMap: atm.runner-publication-lifecycle
  mapUpdates:
    - docs/reports/atm-runner-publication-reconciliation-task-prf-0061.md
  extractionCandidates: []
outOfScope:
  - npm publish or npm token/2FA/trusted-publisher configuration
  - GitHub push or workflow permission changes
  - external A/B benchmark execution or metric interpretation
  - deletion of unreviewed release artifacts
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0061 Reconcile sealed runner publication inventory after product-proof delivery

## Intent

Reconcile the generated runner artifacts left by the product-proof delivery
with one exact sealed source and one receipt-backed terminal disposition. The
task exists because a task can close while release outputs remain dirty and
unattributed; that state must stay fail-closed until provenance is repaired.

## Acceptance

- [ ] **ACC-1 — Exact source binding:** the current one-file release manifest,
      selected runner-sync receipt, and report name the same sealed source
      commit; a missing or mismatched receipt remains blocked.
- [ ] **ACC-2 — Complete inventory:** every dirty release path is classified by
      the selected inventory as owned-current, deleted, foreign-retained, or
      otherwise explicitly dispositioned; no path is silently omitted.
- [ ] **ACC-3 — Terminal disposition:** the selected receipt is explicitly
      `published` or `recovery-retained`, or the artifacts are explicitly
      abandoned through a governed recovery record; no inferred success is
      allowed.
- [ ] **ACC-4 — Foreign-WIP boundary:** unrelated task files and release WIP
      are neither staged nor deleted; the before/after path set and digests are
      recorded in the external receipt.
- [ ] **ACC-5 — Reproducible readiness:** the disposition-gate, inventory-parity,
      reconciliation, internal-release, broker status, and doctor validators
      pass after the governed action; `doctor` must not be made green by a
      bypass or by hiding the outputs.
- [ ] **ACC-6 — Rollback and scope:** the report includes an executable revert or
      restoration path and confirms no npm publish, GitHub push, benchmark
      execution, or historical task rewrite occurred.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T04:57:11.467Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0061-reconcile-sealed-runner-publication-inventory-after-product-proof-delivery.task.md","contentDigest":"sha256:5688a00200d11bbedaf4657f76d8f93759dcde23a68ab7def4ba0260261402ac"} -->
