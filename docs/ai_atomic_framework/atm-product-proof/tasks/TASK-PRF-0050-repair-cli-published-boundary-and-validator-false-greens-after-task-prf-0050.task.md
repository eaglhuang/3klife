---
task_id: TASK-PRF-0050
title: Repair CLI published boundary and validator false greens after Gemini review
status: done
owner: unassigned
priority: P0
depends_on: [TASK-PRF-0049]
causalGraph:
  causalDependencies: [TASK-PRF-0049]
  startConditions: ["TASK-PRF-0049 external review recorded as FAIL/BLOCKED"]
  softRelations: [TASK-PRF-0050-external-review]
  changedPublicSeams: [cli-published-runtime-entrypoint, clean-install-smoke]
  causalImpactEdges: [published-package-completeness, validator-false-green-prevention]
  parallelFrontierInputs: [TASK-PRF-0050-Gemini-review]
  validatorReferences: [candidate-pack-install, core-command-smoke, package-boundary-audit]
  phaseOwner: release
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-package-skeleton.ts
  - scripts/validate-public-npm-install.ts
  - scripts/validate-candidate-npm-install.ts
  - tests/cli/npm-clean-install.test.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/cli-published-command-smoke.test.ts
  - docs/reports/atm-public-npm-install-proof-*.md
deliverables:
  - packages/cli/src/atm.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-package-skeleton.ts
  - scripts/validate-public-npm-install.ts
  - scripts/validate-candidate-npm-install.ts
  - tests/cli/npm-clean-install.test.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/cli-published-command-smoke.test.ts
  - docs/reports/atm-public-npm-install-proof-task-prf-0050.md
validators:
  - npm run typecheck
  - npm run lint
  - npm run validate:cli
  - npm run validate:package-install
  - npm run validate:candidate-npm-install
  - node --strip-types tests/cli/cli-published-command-smoke.test.ts
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - npm pack --dry-run --ignore-scripts --json
testContributions:
  - caseId: test_candidate_package_core_commands_0050
    targetGroupId: null
    semanticKey: candidate_package_core_commands
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [published-package-completeness]
    expectedRedPredicate: candidate tarball core commands must fail before boundary fix
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: cli-published-runtime-entrypoint
    resourceKey: candidate-pack-install
  - caseId: test_validator_rejects_version_only_smoke_0050
    targetGroupId: null
    semanticKey: validator_core_command_matrix
    coversAcceptance: [ACC-3]
    coversImpactEdges: [validator-false-green-prevention]
    expectedRedPredicate: version-only install smoke must not satisfy package validation
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: clean-install-smoke
    resourceKey: core-command-smoke
  - caseId: test_candidate_package_measurement_receipt_0050
    targetGroupId: null
    semanticKey: candidate_package_measurement
    coversAcceptance: [ACC-4, ACC-6]
    coversImpactEdges: [published-package-completeness]
    expectedRedPredicate: measurement receipt is absent, incomplete, or threshold result is hidden
    contributionResourceKey: package-measurement
    responsibility: task-required
    dependencyEdge: artifact-output-to-measurement
    contractEdge: cli-published-runtime-entrypoint
    resourceKey: candidate-pack-install
  - caseId: test_public_validator_separates_registry_and_candidate_0050
    targetGroupId: null
    semanticKey: candidate_registry_validation_separation
    coversAcceptance: [ACC-3, ACC-5]
    coversImpactEdges: [validator-false-green-prevention]
    expectedRedPredicate: candidate validation silently resolves the published registry version
    contributionResourceKey: validator-contract
    responsibility: task-required
    dependencyEdge: validator-to-candidate-artifact
    contractEdge: clean-install-smoke
    resourceKey: candidate-pack-install
requiredTestCaseIds:
  - test_candidate_package_core_commands_0050
  - test_validator_rejects_version_only_smoke_0050
  - test_candidate_package_measurement_receipt_0050
  - test_public_validator_separates_registry_and_candidate_0050
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates: [atomic_workbench/maps/atm-cli-command-router-map.json]
  extractionCandidates:
    - atom: atm.cli-published-runtime-boundary
      pattern: Strategy Object
      source: scripts/build-cli-npm-runtime.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T00:40:06.029Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-14T00:40:06.029Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T00-40-06-029Z-close-2983f8704ead"
lastTransitionAt: "2026-09-14T00:40:06.029Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a9c5b4148efe3b712f1f8e65a6770d2a54931a3a"
---

# TASK-PRF-0050 Repair CLI published boundary and validator false greens after Gemini review

## Intent

Gemini 007 的獨立審查證明 TASK-PRF-0049 的候選包因動態 import 未被封裝，`next`、`tasks`、`doctor` 在乾淨安裝環境崩潰；同時兩個既有 validator 只測版本或線上舊版，形成假綠燈。本卡修復「可發布邊界」與「驗證器必須測候選實體」這兩個同一交付契約，保留 TASK-PRF-0049 的歷史結果。

## Acceptance

- [ ] ACC-1: 候選 tarball 在乾淨 consumer 可執行 `atm --version`、`atm next`、`atm tasks`、`atm doctor`。
- [ ] ACC-2: 建置器明確輸出並封裝所有 lazy-loaded command modules 或等價 code-split chunks；不得依賴 `.ts` source 路徑。
- [ ] ACC-3: candidate validator 只驗證本次產生的 tarball；public registry check 與 candidate check 分開命名及報告。
- [ ] ACC-4: 以 npm pack inventory 實測 unpacked bytes、entry count、runtime bytes 與冷啟動 p50/p95；未達門檻即 FAIL。
- [ ] ACC-5: 新增 regression tests，能捕捉「只測 --version」與「測到線上舊版」兩種假綠燈。
- [ ] ACC-6: 產出 report，列出 baseline、candidate、完整命令矩陣、digest、scope 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T14:32:35.661Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0050-repair-cli-published-boundary-and-validator-false-greens-after-task-prf-0050.task.md","contentDigest":"sha256:578179fa7a4c74c0f55a5b2b0042317ff3a4fb1b519e794b771ad9f4af70b6bc"} -->
