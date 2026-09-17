---
task_id: TASK-PRF-0072
title: Reconcile public runtime budget metadata with manifest
status: planned
owner: release-runtime-steward
priority: P1
depends_on: [TASK-PRF-0068]
causalGraph:
  causalDependencies: [TASK-PRF-0068]
  startConditions:
    - "Public budget-binding receipt shows a 6,712-byte runtime budget drift and manifest file-count mismatch."
    - "No implementation or publication is authorized until the runtime-boundary review and governed claim are available."
  softRelations: [TASK-PRF-0069, TASK-PRF-0054]
  changedPublicSeams: [npm_runtime_budget_metadata, runtime_manifest, release_validation]
  causalImpactEdges: [size_gate_truthfulness, public_artifact_provenance]
  parallelFrontierInputs: [runtime_boundary_definition, manifest_generation, release_validator]
  validatorReferences: [test_prf0072_budget_manifest_binding, test_prf0072_budget_drift_negative]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/package.json
  - packages/cli/dist/npm-runtime/manifest.json
  - scripts/build-package-dist.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-adopter-artifact-manifest.ts
  - scripts/validate-public-npm-install.ts
  - tests/cli/public-runtime-budget-binding.test.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-budget-binding.md
deliverables:
  - packages/cli/package.json
  - packages/cli/dist/npm-runtime/manifest.json
  - scripts/build-package-dist.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-adopter-artifact-manifest.ts
  - scripts/validate-public-npm-install.ts
  - tests/cli/public-runtime-budget-binding.test.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-budget-binding.md
validators:
  - npm run typecheck
  - npm run lint
  - npm run build
  - npm test
  - node --strip-types tests/cli/public-runtime-budget-binding.test.ts
  - node --strip-types tests/cli/adopter-artifact-budget.test.ts
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types scripts/validate-public-npm-install.ts --version 0.1.0 --measurement-runs 3 --record-blocked
  - node atm.mjs tasks import --from C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0072-reconcile-public-runtime-budget-metadata-with-manifest.task.md --dry-run --json
testContributions:
  - caseId: test_prf0072_budget_manifest_binding
    targetGroupId: null
    semanticKey: public_runtime_budget_manifest_binding
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [size_gate_truthfulness, public_artifact_provenance]
    expectedRedPredicate: "A packed public artifact's package budget, runtime manifest entries, and actual runtime files disagree in bytes or counts while validation still reports success."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0068
    contractEdge: npm_runtime_budget_metadata
    resourceKey: public-budget
  - caseId: test_prf0072_budget_drift_negative
    targetGroupId: null
    semanticKey: public_runtime_budget_drift_negative
    coversAcceptance: [ACC-2, ACC-4]
    coversImpactEdges: [size_gate_truthfulness]
    expectedRedPredicate: "A one-byte, one-entry, stale-manifest, or omitted-file mutation is accepted as a valid budget comparison."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0068
    contractEdge: release_validation
    resourceKey: budget-negative
  - caseId: test_prf0072_budget_receipt_completeness
    targetGroupId: null
    semanticKey: public_budget_receipt_completeness
    coversAcceptance: [ACC-5]
    coversImpactEdges: [public_artifact_provenance]
    expectedRedPredicate: "A budget-binding receipt omits the packed artifact digest, authoritative file boundary, validator result, or missing-data verdict while the task is treated as complete."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0068
    contractEdge: npm_runtime_budget_metadata
    resourceKey: budget-receipt
requiredTestCaseIds: [test_prf0072_budget_manifest_binding, test_prf0072_budget_drift_negative, test_prf0072_budget_receipt_completeness]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed-public-budget-binding-receipt
rollback:
  strategy: revert-commit-preserve-historical-budget-receipts
  notes: "回滾只撤銷新的 budget/manifest 產生與驗證邏輯；保留 0068 及本次 drift receipt，不重寫歷史 artifact 或 registry。"
atomizationImpact:
  ownerAtomOrMap: atm.public-runtime-closure
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runtime-budget-binding
      pattern: Policy Object
      source: scripts/build-package-dist.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
acceptanceEvidence: '{"runtime-budget-binding":{"id":"runtime-budget-binding","claim":"The published package budget and runtime manifest are generated from and validated against the same explicit file boundary.","authoritativeSources":["packed-tarball","runtime-manifest","package-json-budget","clean-consumer-receipt"],"derivationRule":"sum exactly the manifest-listed regular files and fail on byte/count/digest drift","requiredRealness":"sealed-replay","verifier":{"mode":"separate-actor"},"negativeControls":[{"id":"byte-drift","expectedFailureReason":"changed byte total is rejected"},{"id":"entry-drift","expectedFailureReason":"changed entry count is rejected"},{"id":"omitted-file","expectedFailureReason":"missing manifest file is rejected"}],"missingDataVerdict":"inconclusive","closureCritical":true}}'
createdByCommand: atm plan card create
---

# TASK-PRF-0072 Reconcile public runtime budget metadata with manifest

## Intent

The 2026-09-14 public budget-binding receipt found that the published
`@ai-atomic-framework/cli@0.1.0` payload is 3,357,358 bytes / 78 files, while
the package metadata declares a runtime closure of 3,340,892 bytes and the
manifest's 75 entries sum to 3,334,180 bytes. The manifest also reports
`fileCount=76` although its entry array contains 75 files. This makes the size
claim non-reproducible at the metadata boundary even before considering the
known chart workflow failure.

This card repairs the contract at its source. The implementation must define
one explicit runtime-closure file set, generate the manifest and package budget
from that set in the same build, and make public-install validation compare the
packed tarball, manifest, package metadata, and clean-consumer files. It must
not hide the discrepancy by changing thresholds, excluding files without a
documented boundary, splitting packages, publishing, or rewriting historical
receipts.

The read-only root-cause assessment is retained at
`reviews/TASK-PRF-0072-budget-drift-root-cause-2026-09-14.json`; it identifies
the current `files.length + 1` count, manifest-excluded byte total, hand-pinned
runtime budget, and cap-only validation as the causal chain to repair.
The planning-only negative-control probe
`reviews/TASK-PRF-0072-budget-binding-negative-control-2026-09-14.json` confirms
that a corrected boundary passes while baseline drift, byte/entry mutations,
omitted or extra files, and digest mutations fail. It is contract evidence only,
not target implementation evidence.

## Acceptance

- [ ] **ACC-1 — Single authoritative boundary:** The build emits a manifest and
      package budget from the same explicit runtime file set; the manifest's
      entry array, declared count, and declared bytes agree.
- [ ] **ACC-2 — Fail-closed drift detection:** A changed byte, changed entry,
      omitted file, extra file, stale count, or mismatched digest produces a
      semantic validation failure, even if the process exits zero.
- [ ] **ACC-3 — Packed-artifact binding:** A clean pack/unpack replay proves the
      published tarball's actual runtime files match the manifest and package
      metadata; no workspace source or display-only value is accepted.
- [ ] **ACC-4 — Historical and release safety:** Existing 0068 receipts remain
      immutable; no npm publish, registry mutation, Git history rewrite, or
      target change outside `scopePaths` is authorized by this card.
- [ ] **ACC-5 — Evidence quality:** Required focused red/green tests, full
      typecheck/lint/build/test, public-install validation, and import dry-run
      pass with a command-backed receipt. Missing artifact or incomplete replay
      is `inconclusive`, never a green product claim.
