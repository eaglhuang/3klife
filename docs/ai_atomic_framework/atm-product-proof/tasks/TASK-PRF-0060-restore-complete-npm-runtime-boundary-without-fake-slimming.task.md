---
task_id: TASK-PRF-0060
title: Restore complete npm runtime boundary without fake slimming
status: done
owner: release-runtime-steward
priority: P0
depends_on: [TASK-PRF-0052]
causalGraph:
  causalDependencies: [TASK-PRF-0052]
  startConditions:
    - "A clean public-registry install of @ai-atomic-framework/cli@0.1.0 fails atm-chart render and verify while a local candidate can pass the same workflow."
    - "The deep-module review receipt recommends a single self-contained runtime and rejects code-splitting as a default slimming strategy."
  softRelations: [TASK-PRF-0053, TASK-PRF-0054]
  changedPublicSeams: [cli_npm_runtime_closure, public_npm_install_proof]
  causalImpactEdges: [complete_public_install, measured_adopter_bundle_size]
  parallelFrontierInputs: [candidate_runtime_build, required_schema_assets, baseline_tarball_receipt]
  validatorReferences: [public-npm-install-contract, candidate-npm-install, adopter-artifact-budget]
  phaseOwner: release
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/build-cli-npm-runtime.ts
  - scripts/build-package-dist.ts
  - packages/cli/package.json
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - docs/reports/atm-public-npm-install-proof.md
  - docs/reports/atm-public-npm-install-proof-task-prf-0060.md
deliverables:
  - scripts/build-cli-npm-runtime.ts
  - scripts/build-package-dist.ts
  - packages/cli/package.json
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - docs/reports/atm-public-npm-install-proof-task-prf-0060.md
  - candidate npm tarball and digest-bearing measurement receipt outside Git
validators:
  - npm run build --workspace packages/cli
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types tests/cli/adopter-artifact-budget.test.ts
  - npm run validate:candidate-npm-install -- --candidate-dir packages/cli --measurement-runs 3 --record-blocked
  - npm run validate:public-npm-install -- --package @ai-atomic-framework/cli --version 0.1.0 --record-blocked --measurement-runs 1
testContributions:
  - caseId: test_prf0060_runtime_asset_closure_6d8f2b19
    targetGroupId: null
    semanticKey: npm_runtime_required_asset_closure
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [complete_public_install, measured_adopter_bundle_size]
    expectedRedPredicate: candidate or published tarball can pass shallow smoke while a required ATMChart schema is absent from the installed runtime
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0052
    contractEdge: cli_npm_runtime_closure
    resourceKey: npm-runtime-manifest
  - caseId: test_prf0060_clean_candidate_workflow_4a5e7c20
    targetGroupId: null
    semanticKey: clean_candidate_core_workflow
    coversAcceptance: [ACC-2, ACC-4]
    coversImpactEdges: [complete_public_install]
    expectedRedPredicate: clean candidate install does not complete version, doctor, bootstrap, atm-chart render, and atm-chart verify
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0052
    contractEdge: public_npm_install_proof
    resourceKey: clean-consumer-core-workflow
  - caseId: test_prf0060_measured_size_stop_rule_9c0d4e31
    targetGroupId: null
    semanticKey: bundle_measurement_stop_rule
    coversAcceptance: [ACC-5, ACC-6, ACC-7]
    coversImpactEdges: [measured_adopter_bundle_size]
    expectedRedPredicate: reported slimming omits required files, shifts cost to runtime downloads, or fails the fixed bytes/entries budget
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: measured_bundle_contract
    resourceKey: npm-artifact-budget
requiredTestCaseIds:
  - test_prf0060_runtime_asset_closure_6d8f2b19
  - test_prf0060_clean_candidate_workflow_4a5e7c20
  - test_prf0060_measured_size_stop_rule_9c0d4e31
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed-clean-candidate-install-and-fixed-baseline-measurement
rollback:
  strategy: revert-commit-preserve-failed-public-receipt
atomizationImpact:
  ownerAtomOrMap: atm.public-runtime-closure
  mapUpdates:
    - docs/reports/atm-public-npm-install-proof-task-prf-0060.md
  extractionCandidates:
    - atom: atm.public-runtime-asset-closure
      pattern: Policy Object
      source: scripts/build-package-dist.ts
      disposition: extract
      inlineReason: null
    - atom: atm.public-runtime-measurement-contract
      pattern: Policy Object
      source: tests/cli/public-npm-install-contract.test.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T04:22:05.609Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T04:22:05.609Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T04-22-05-609Z-close-2812dc4b3ed7"
lastTransitionAt: "2026-09-14T04:22:05.609Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2cc287d11d3c3379be9ef0df12e3863b8720be25"
---

# TASK-PRF-0060 Restore complete npm runtime boundary without fake slimming

## Intent

Repair the npm runtime boundary exposed by the public `0.1.0` tarball. The
published package must carry every immutable schema and template required by
the complete core workflow, while the build remains a single self-contained
runtime unless measured evidence proves another boundary is both smaller and
equally complete. The prior public receipt and the deep-module review are
inputs, not permission to call the current package verified.

## Acceptance

- [ ] **ACC-1 — Reachable closure:** the runtime manifest enumerates the command entrypoint and every required ATMChart schema/template asset; a clean installed candidate contains each path and no runtime path depends on the workspace or an extra download.
- [ ] **ACC-2 — Complete workflow:** a clean candidate install passes `version`, `doctor`, `bootstrap`, `atm-chart render`, and `atm-chart verify`, with per-command exit codes, module-resolution state, and output digests.
- [ ] **ACC-3 — Public failure remains visible:** the existing public `0.1.0` receipt remains labelled blocked/incomplete and is never overwritten by candidate evidence or a local workspace result.
- [ ] **ACC-4 — Baseline comparison:** candidate and fixed published baseline are installed from tarballs in separate clean consumers; packed bytes, unpacked bytes, entry count, dependency footprint, startup measurements, source/version, and tarball digests are recorded.
- [ ] **ACC-5 — No fake slimming:** the candidate may claim bundle reduction only if all required workflow checks pass and the fixed byte/entry budget and declared reduction thresholds pass; missing assets, workspace links, or runtime downloads are failures.
- [ ] **ACC-6 — Stop rule and rollback:** if complete behavior cannot coexist with the reduction threshold, stop with an explicit inconclusive/failed measurement and preserve the receipt; do not enable code-splitting, publish, push, or weaken the validator solely to obtain a green number.
- [ ] **ACC-7 — Scope:** no npm token/2FA policy, public publish, GitHub push, external benchmark arm, or historical task record is changed.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T04:08:48.055Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0060-restore-complete-npm-runtime-boundary-without-fake-slimming.task.md","contentDigest":"sha256:15c8bf1c4088e686db6f562d1521cdcbb6feb956c503f5b84cdb4fd35ba6c95e"} -->
