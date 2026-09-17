---
task_id: TASK-PRF-0073
title: Restore public chart schema closure before bundle optimization
status: planned
owner: release-runtime-steward
priority: P0
depends_on: [TASK-PRF-0069]
causalGraph:
  causalDependencies: [TASK-PRF-0069]
  startConditions:
    - "TASK-PRF-0069 review is accepted or explicitly records the smallest safe runtime-boundary repair."
    - "The public lifecycle replay shows bootstrap succeeds but render cannot resolve a packaged schema source."
    - "No npm publish, bundler optimization, code splitting, or package splitting is authorized by this card."
  softRelations: [TASK-PRF-0072, TASK-PRF-0068, TASK-PRF-0071]
  changedPublicSeams: [public_chart_lifecycle, npm_runtime_schema_closure, clean_install_validator]
  causalImpactEdges: [package_completeness, no_hidden_downloads, semantic_failure_truthfulness]
  parallelFrontierInputs: [runtime_boundary_review, schema_source_inventory, public_install_replay]
  validatorReferences: [test_prf0073_public_chart_schema_closure, test_prf0073_public_chart_lifecycle, test_prf0073_missing_schema_negative, test_prf0073_runtime_boundary_receipt]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/atm-chart/constants.ts
  - packages/cli/src/commands/atm-chart/render-verify.ts
  - packages/cli/src/commands/atm-chart/compatibility.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-public-npm-install.ts
  - packages/cli/package.json
  - packages/cli/dist/npm-runtime/**
  - release/atm-root-drop/packages/cli/dist/npm-runtime/**
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/public-runtime-schema-closure.test.ts
  - docs/reports/atm-public-npm-install-proof.md
deliverables:
  - packages/cli/src/commands/atm-chart/constants.ts
  - packages/cli/src/commands/atm-chart/render-verify.ts
  - packages/cli/src/commands/atm-chart/compatibility.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-public-npm-install.ts
  - packages/cli/package.json
  - packages/cli/dist/npm-runtime/**
  - release/atm-root-drop/packages/cli/dist/npm-runtime/**
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/public-runtime-schema-closure.test.ts
  - docs/reports/atm-public-npm-install-proof.md
validators:
  - npm run typecheck
  - npm run lint
  - npm run build
  - npm test
  - node --strip-types tests/cli/public-runtime-schema-closure.test.ts
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types scripts/validate-public-npm-install.ts --version <fixed-candidate> --measurement-runs 3 --record-blocked
  - node atm.mjs tasks import --from C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0073-restore-public-chart-schema-closure-before-bundle-optimization.task.md --dry-run --json
testContributions:
  - caseId: test_prf0073_public_chart_schema_closure
    targetGroupId: null
    semanticKey: public_chart_schema_closure
    coversAcceptance: [ACC-1]
    coversImpactEdges: [package_completeness, no_hidden_downloads]
    expectedRedPredicate: "The clean installed runtime references a chart schema that is absent from the package or requires an unrecorded download."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0069
    contractEdge: public_chart_lifecycle
    resourceKey: public-schema-closure
  - caseId: test_prf0073_public_chart_lifecycle
    targetGroupId: null
    semanticKey: public_chart_lifecycle
    coversAcceptance: [ACC-2, ACC-3]
    coversImpactEdges: [package_completeness, semantic_failure_truthfulness]
    expectedRedPredicate: "A clean consumer can bootstrap but cannot complete render and verify with the fixed candidate package while the validator reports success."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0069
    contractEdge: public_chart_lifecycle
    resourceKey: public-chart-lifecycle
  - caseId: test_prf0073_missing_schema_negative
    targetGroupId: null
    semanticKey: missing_schema_negative_control
    coversAcceptance: [ACC-4]
    coversImpactEdges: [semantic_failure_truthfulness]
    expectedRedPredicate: "Deleting or corrupting one required schema input is accepted as a successful chart render."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0069
    contractEdge: clean_install_validator
    resourceKey: public-schema-negative
  - caseId: test_prf0073_runtime_boundary_receipt
    targetGroupId: null
    semanticKey: runtime_boundary_receipt
    coversAcceptance: [ACC-3, ACC-5, ACC-6]
    coversImpactEdges: [package_completeness]
    expectedRedPredicate: "The receipt omits the resolved root, schema source metadata, packed/unpacked bytes, dependency bytes, or startup measurements while the card is treated as complete."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0072
    contractEdge: npm_runtime_schema_closure
    resourceKey: runtime-boundary-receipt
requiredTestCaseIds: [test_prf0073_public_chart_schema_closure, test_prf0073_public_chart_lifecycle, test_prf0073_missing_schema_negative, test_prf0073_runtime_boundary_receipt]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed-clean-install-schema-closure-receipt
rollback:
  strategy: revert-commit-preserve-public-failure-receipts
  notes: "回滾只撤銷新的 schema-closure packaging/validation 變更；保留 0069/0071 failure evidence，不重寫歷史 artifact 或 registry。"
atomizationImpact:
  ownerAtomOrMap: atm.public-runtime-closure
  mapUpdates: []
  extractionCandidates:
    - atom: atm.public-chart-schema-source
      pattern: Policy Object
      source: packages/cli/src/commands/atm-chart/constants.ts
      disposition: inline
      inlineReason: "The existing schema-source registry is already the single lookup seam; splitting it would add a second boundary before the deep-module review."
errorCodes:
  - code: ATM_CHART_SCHEMA_SOURCE_MISSING
    disposition: reuse
    category: runtime-guard
    trigger: "A required chart schema source is absent from the resolved public runtime boundary."
    retryable: false
    requiresHumanApproval: false
    recovery: "Rebuild the package with the declared schema closure and rerun the clean-install lifecycle validator."
    sourceOwner: packages/cli/src/commands/atm-chart/render-verify.ts
    registryOwnerTask: TASK-PRF-0067
    tests: [test_prf0073_missing_schema_negative]
  - code: ATM_CHART_MISSING
    disposition: reuse
    category: runtime-guard
    trigger: "Chart verification is requested before a valid chart has been rendered."
    retryable: false
    requiresHumanApproval: false
    recovery: "Run atm-chart render after restoring the required schema source."
    sourceOwner: packages/cli/src/commands/atm-chart/render-verify.ts
    registryOwnerTask: TASK-PRF-0067
    tests: [test_prf0073_public_chart_lifecycle]
acceptanceEvidence: '{"public-chart-schema-closure":{"id":"public-chart-schema-closure","claim":"A clean public npm consumer can bootstrap, render, and verify ATMChart without hidden downloads, and the shipped schema boundary is explicit and digest-bound.","authoritativeSources":["fixed-candidate-tarball","runtime-manifest","clean-consumer-lifecycle-receipt","schema-source-inventory"],"derivationRule":"every schema read by the lifecycle is either packaged in the declared runtime boundary or explicitly embedded, and the receipt records source kind/path/digest","requiredRealness":"sealed-replay","verifier":{"mode":"separate-actor"},"negativeControls":[{"id":"missing-schema","expectedFailureReason":"schema deletion is rejected with ATM_CHART_SCHEMA_SOURCE_MISSING"},{"id":"network-disabled","expectedFailureReason":"lifecycle does not download omitted files"}],"missingDataVerdict":"inconclusive","closureCritical":true}}'
createdByCommand: atm plan card create
---

# TASK-PRF-0073 Restore public chart schema closure before bundle optimization

## Intent

The fixed public `@ai-atomic-framework/cli@0.1.0` lifecycle replay proves that
`bootstrap` succeeds, while `atm-chart render` fails closed because
`schemas/governance/default-guards.schema.json` is not reachable from the
published runtime. `verify` then reports `ATM_CHART_MISSING`. The evidence is
retained in `reviews/TASK-PRF-0069-public-chart-lifecycle-reproduction-2026-09-14.json`.

This card repairs completeness at the smallest explicit runtime boundary. It
must inventory every schema read by the chart lifecycle, package or embed the
required sources, and prove the fixed candidate in a clean consumer with no
workspace link and no hidden network fetch. It must not optimize bytes by
removing required files, changing historical evidence, splitting packages, or
publishing.

## Acceptance

- [ ] **ACC-1 — Explicit schema closure:** Every chart schema read is packaged
      or embedded through one declared boundary; manifest entries and source
      metadata identify the exact kind/path/digest.
- [ ] **ACC-2 — Complete clean lifecycle:** In a fresh fixed-candidate install,
      `bootstrap`, `atm-chart render --json`, and `atm-chart verify --json` all
      exit 0 in the same consumer without workspace links or extra downloads.
- [ ] **ACC-3 — Semantic evidence:** The receipt records resolved framework
      root, guard path, schema source kind/path/digest, command outputs or
      structured result details, packed/unpacked bytes, dependency bytes, and
      startup measurements.
- [ ] **ACC-4 — Fail-closed negative controls:** Removing or corrupting a
      required schema causes `ATM_CHART_SCHEMA_SOURCE_MISSING`; disabling
      network access cannot turn an incomplete package into a pass.
- [ ] **ACC-5 — Measurement honesty:** The candidate is compared with the
      fixed public baseline for package, dependency, and startup cost. Any
      size regression or unmeasured field is reported as a trade-off or
      `inconclusive`; no shrink claim is made from the lifecycle repair alone.
- [ ] **ACC-6 — Governance boundary:** Existing 0068/0069/0071 evidence stays
      immutable; no npm publish, registry mutation, Git history rewrite, or
      target change outside `scopePaths` is authorized by this card.
