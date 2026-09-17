---
task_id: TASK-PRF-0053
title: Complete public npm core-workflow proof and authorized release handoff
status: blocked
owner: release-runtime-steward
priority: P1
depends_on: [TASK-PRF-0052]
causalGraph:
  causalDependencies: [TASK-PRF-0052]
  startConditions:
    - "A live registry receipt shows @ai-atomic-framework/cli@0.1.0 exists but the core chart workflow is not yet proven."
    - "Any publish attempt requires an explicit owner authorization and a configured npm trusted publisher or compliant automation token."
  softRelations: [TASK-PRF-0015, TASK-PRF-0051]
  changedPublicSeams: [public_registry_core_workflow, release_provenance_handoff]
  causalImpactEdges: [public_install_complete, release_provenance]
  parallelFrontierInputs: [candidate-delivery-commit, registry-metadata, release-authentication]
  validatorReferences: [test_prf_registry_core_workflow_matrix, test_prf_registry_candidate_registry_separation, test_prf_registry_release_provenance]
  phaseOwner: release
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-public-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
  - docs/reports/atm-public-npm-install-proof.md
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-product-proof-checkpoints.md
deliverables:
  - scripts/validate-public-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-install-proof.md
  - docs/reports/atm-product-proof-checkpoints.md
  - external evidence receipt binding registry metadata, tarball digest, and full core-workflow command matrix
validators:
  - npm run build --workspace packages/cli
  - npm run typecheck
  - npm run lint
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types tests/cli/product-proof-evidence-boundary.test.ts
  - npm run validate:public-npm-install -- --package @ai-atomic-framework/cli --version 0.1.0 --require-default-tag
  - node --strip-types scripts/validate-release-trust.ts
testContributions:
  - caseId: test_prf_registry_core_workflow_matrix
    semanticKey: public_registry_core_workflow_matrix
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [public_install_complete]
    expectedRedPredicate: "Validator reports success after version-only smoke while bootstrap, atm-chart render, or atm-chart verify is missing or fails in the clean registry consumer."
    responsibility: task-required
    contractEdge: public_registry_core_workflow
    resourceKey: clean-registry-install
  - caseId: test_prf_registry_candidate_registry_separation
    semanticKey: candidate_registry_separation
    coversAcceptance: [ACC-2, ACC-4]
    coversImpactEdges: [public_install_complete, release_provenance]
    expectedRedPredicate: "A local candidate receipt is presented as public registry proof, or a mutable latest tag is used without recording the exact requested version and tarball digest."
    responsibility: task-required
    contractEdge: public_registry_core_workflow
    resourceKey: registry-metadata
  - caseId: test_prf_registry_release_provenance
    semanticKey: authorized_release_provenance
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: [release_provenance]
    expectedRedPredicate: "Release handoff lacks provenance, explicit authorization, or an auditable post-publish revalidation receipt."
    responsibility: task-required
    contractEdge: release_provenance_handoff
    resourceKey: npm-trusted-publisher
requiredTestCaseIds: [test_prf_registry_core_workflow_matrix, test_prf_registry_candidate_registry_separation, test_prf_registry_release_provenance]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: external-registry-clean-install-with-full-command-matrix-and-provenance
rollback:
  strategy: revert-commit-preserve-public-receipt
  notes: "保留失敗或不完整的 registry receipt；只回滾本卡 validator、報告與測試變更，不刪除外部 raw evidence。"
atomizationImpact:
  ownerAtomOrMap: atm.public-runtime-closure
  mapUpdates: []
  extractionCandidates:
    - atom: atm.public-registry-workflow-validator
      pattern: Policy Object
      source: scripts/validate-public-npm-install.ts
      disposition: follow-up-card
      inlineReason: "先把完整命令矩陣補進既有 public-install validator；若多個發布面重複相同 registry/provenance 判定，再另卡抽出 deep module。"
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0053 Complete public npm core-workflow proof and authorized release handoff

## Intent

0052 已證明本地 candidate tarball 可以在隔離 consumer 完成
`bootstrap → atm-chart render → atm-chart verify`，但現有 public-registry
validator 只執行 `version/doctor/next/tasks`，因此仍可能對不完整的 registry
套件產生假綠。2026-09-14 的 live install 也確認
`@ai-atomic-framework/cli@0.1.0` 的 chart schema 仍缺失。

本卡只負責把「公開 registry 的核心工作流」變成不可縮減的驗收契約，並在
取得 owner 明確授權、trusted publisher 或合規 automation token 後，完成一次
可追溯的發布交接與 post-publish revalidation。沒有授權時，卡片必須停在
candidate-ready 或 blocked/inconclusive，不得自行 publish、push 或改 npm 政策。

第一性原理邊界：npm install、版本輸出或 doctor 成功，只代表可下載與啟動；
產品交付的必要條件是 registry tarball 在乾淨 consumer 中完成完整核心流程，
且 receipt 綁定精確版本、tarball digest、解壓大小、entry count、命令結果與
環境隔離。candidate 證據與 public registry 證據必須永遠分開。

## Acceptance

- [ ] ACC-1: public-install validator 在乾淨、無 workspace/link/source residue 的
      consumer 中，對精確 registry version 依序執行 `version`、`doctor`、
      `bootstrap`、`atm-chart render`、`atm-chart verify`，逐項保留 exit code、
      module-resolution 狀態與 output digest；只跑 version/doctor 不得判定通過。
- [ ] ACC-2: validator 與 report 明確區分 registry package、local candidate 與
      baseline；每次 public proof 記錄 requested version、default latest tag、
      tarball URL/integrity/SHA-256、unpacked bytes、entry count、Node/npm 版本、
      是否使用 workspace link，以及完整命令矩陣。
- [ ] ACC-3: 當 registry package 缺 schema、命令失敗或依賴額外下載時，結果必須
      fail closed 為 blocked/inconclusive，保留外部 raw receipt，不得被 `--version`
      或舊報告覆蓋成 verified。
- [ ] ACC-4: 只有在 candidate 與 validator 全部通過後，才可進入發布交接；未經
      owner 明確授權不得執行 publish。發布後必須重新從 registry 安裝同一版本，
      重跑完整命令矩陣並確認 digest/metadata 與發布 artifact 一致。
- [ ] ACC-5: release handoff receipt 綁定 trusted publisher 或符合 npm 2FA/automation
      policy 的認證方式、workflow run/commit、發布版本與 post-publish receipt；
      不記錄 token 內容，也不把設定意圖當成成功證據。
- [ ] ACC-6: build、typecheck、lint、focused contract、evidence-boundary test 與
      release-trust validator 全部通過；失敗與人工授權缺口都保留為可重跑證據。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T01:49:55.873Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0053-complete-public-npm-core-workflow-proof-and-authorized-release-handoff.task.md","contentDigest":"sha256:82dbc4bf0f7b8c5c0e7d6ae78adfa826193c0fd3d0ce59abc4e7fb5413372b27"} -->
