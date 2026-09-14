---
task_id: TASK-PRF-0052
title: Repair public npm runtime schema closure and complete clean workflow
status: done
owner: release-runtime-steward
priority: P1
depends_on: [TASK-PRF-0050]
causalGraph:
  causalDependencies: [TASK-PRF-0050]
  startConditions: ["Fresh public-registry receipt identifies a missing published runtime schema; do not treat the old TASK-PRF-0022 close as proof of complete adopter workflow."]
  softRelations: [TASK-PRF-0022, TASK-PRF-0051]
  changedPublicSeams: [public_npm_runtime_schema_closure]
  causalImpactEdges: [public_install_complete]
  parallelFrontierInputs: [public-install-receipt, runtime-schema-inventory]
  validatorReferences: [test_prf_public_runtime_schema_1, test_prf_public_runtime_schema_2, test_prf_public_runtime_schema_3]
  phaseOwner: package
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/build-package-dist.ts
  - scripts/build-release-integrity.ts
  - packages/cli/package.json
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
  - packages/cli/dist/npm-runtime/**
deliverables:
  - packages/cli/dist/npm-runtime/runtime.mjs
  - packages/cli/dist/npm-runtime/manifest.json
  - packages/cli/dist/npm-runtime/schemas/**
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
validators:
  - npm run build --workspace packages/cli
  - npm pack --workspace packages/cli --dry-run --json
  - node --strip-types scripts/validate-adopter-artifact-manifest.ts --mode validate
  - node --strip-types scripts/validate-npm-clean-install.ts
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - npm run lint
  - npm run typecheck
testContributions:
  - caseId: test_prf_public_runtime_schema_1
    semanticKey: published_runtime_schema_closure
    coversAcceptance: [ACC-1, ACC-2, ACC-6]
    coversImpactEdges: [public_install_complete]
    expectedRedPredicate: "建置或封裝後缺任一 atm-chart source schema，或 clean install 的 chart render 仍回 ATM_CHART_SCHEMA_SOURCE_MISSING。"
    responsibility: task-required
    contractEdge: public_npm_runtime_schema_closure
    resourceKey: cli-runtime-schema-assets
  - caseId: test_prf_public_runtime_schema_2
    semanticKey: clean_bootstrap_chart_smoke
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [public_install_complete]
    expectedRedPredicate: "只通過 npm install、--version 或 doctor，但 bootstrap 後 render/verify 失敗，或依賴 monorepo/workspace residue 才能通過。"
    responsibility: task-required
    contractEdge: public_npm_runtime_schema_closure
    resourceKey: clean-install
  - caseId: test_prf_public_runtime_schema_3
    semanticKey: forbidden_extra_download
    coversAcceptance: [ACC-5]
    coversImpactEdges: [public_install_complete]
    expectedRedPredicate: "測試在安裝後額外下載 framework source、schemas 或未宣告套件，才使核心流程通過。"
    responsibility: task-required
    contractEdge: public_npm_runtime_schema_closure
    resourceKey: isolated-install
requiredTestCaseIds: [test_prf_public_runtime_schema_1, test_prf_public_runtime_schema_2, test_prf_public_runtime_schema_3]
tddMode: reasoned-not-applicable
tddNotApplicableReason: "本卡修復封裝邊界並補 clean-install regression；可執行 contract test 是主要行為 oracle，不先新增獨立 domain module。"
methodProfiles: [expand-contract]
evidence:
  required: command-backed-clean-install-with-runtime-inventory-and-digest
rollback:
  strategy: revert-commit-preserve-failed-public-receipt
  notes: "保留本次缺 schema 的外部 receipt 與歷史失敗；只回滾本卡建置／測試／產物，不刪除 raw evidence。"
atomizationImpact:
  ownerAtomOrMap: atm.product-delivery-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.public-runtime-closure
      pattern: Policy Object
      source: scripts/build-package-dist.ts
      disposition: follow-up-card
      inlineReason: "先以單一資料驅動 runtime asset manifest 修復，待多個 package 邊界重複出現後再評估 deep-module extraction。"
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T01:43:07.319Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T01:43:07.319Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T01-43-07-319Z-close-5523c6fcff8c"
lastTransitionAt: "2026-09-14T01:43:07.319Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e62546837cf7409cc45b54fa0a87f2ed0be02202"
---

# TASK-PRF-0052 Repair public npm runtime schema closure and complete clean workflow

## Intent

修復公開 registry 的 CLI runtime closure。2026-09-14 在 repo 外的乾淨目錄
安裝 `@ai-atomic-framework/cli@0.1.0` 成功，`--version`、`doctor` 與
`bootstrap` 成功，但 `atm-chart render` 因找不到
`schemas/governance/default-guards.schema.json` 失敗。這證明舊的
TASK-PRF-0022 close 與「市場使用者能完成核心流程」之間仍有缺口；本卡
只處理 published npm runtime 的 schema/data closure，不重寫舊卡歷史。

第一性原理邊界：npm install 成功只代表檔案可下載，不代表功能完整。完整
交付的必要條件是 clean install、bootstrap、chart render、chart verify 在
沒有 monorepo source、額外下載或 workspace residue 的環境中全部通過。

## Acceptance

- [ ] ACC-1: 由 ATM runtime 所需的 chart source schemas 建立可審計、資料驅動的
      asset closure；build 在缺少任何 required source 時 fail closed，不再靜默漏包。
- [ ] ACC-2: `npm pack --workspace packages/cli --dry-run --json` 與 manifest
      inventory 顯示 closure 內含所有 chart source schemas，且仍符合既有
      unpacked bytes／entry budget；不得把整個 framework source 或 test tree 帶入。
- [ ] ACC-3: 在全新空目錄從產生的 tarball 安裝後，執行 `atm --version`、
      `doctor`、`bootstrap`、`atm-chart render`、`atm-chart verify` 全部成功。
- [ ] ACC-4: clean-install contract test 必須從 package tarball 執行，並證明
      chart render/verify 不依賴 framework repo、workspace symlink、預先存在的
      `.atm` 或額外網路下載。
- [ ] ACC-5: validator、報告與 raw receipt 明確區分 local candidate 與 public
      registry；未經獨立 release/publish 授權，不宣稱 public latest 已修復。
- [ ] ACC-6: lint、typecheck、package build 與 focused contract 全部通過；失敗
      receipt 保留，不能以 `--version` 單點成功取代核心流程驗收。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T01:13:53.398Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0052-repair-public-npm-runtime-schema-closure-and-complete-clean-workflow.task.md","contentDigest":"sha256:880845ab00c5bab48815358d1f42d48b5e8f83c8541b6e4e2083f439a0136472"} -->
