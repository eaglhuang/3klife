---
task_id: TASK-PRF-0043
title: Verify sustained CI and clean adopter evidence
status: done
owner: atm-release-evidence-owner
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: ["實作前以 target ATM 接手本卡；共用契約由 0034 定義，未交付前可做 docs-first 設計。"]
  softRelations: ["TASK-PRF-0008", "TASK-PRF-0019"]
  changedPublicSeams: ["product_sustained_evidence"]
  causalImpactEdges: ["product_sustained_evidence_verified"]
  parallelFrontierInputs: ["sealed-protocol", "role-and-tool-readiness"]
  validatorReferences: ["test_prf_product_sustained_evidence_1","test_prf_product_sustained_evidence_2","test_prf_product_sustained_evidence_3"]
  phaseOwner: benchmark-instrumentation
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/reports/atm-product-proof-checkpoints.md"
  - "scripts/measure-product-ci-burn-in.ts"
  - "scripts/validate-public-npm-install.ts"
  - "tests/cli/product-proof-evidence-boundary.test.ts"
deliverables:
  - "docs/reports/atm-product-proof-checkpoints.md"
  - "scripts/measure-product-ci-burn-in.ts"
  - "scripts/validate-public-npm-install.ts"
  - "tests/cli/product-proof-evidence-boundary.test.ts"
validators:
  - "node --strip-types tests/cli/product-proof-evidence-boundary.test.ts"
testContributions:
  - caseId: test_prf_product_sustained_evidence_1
    semanticKey: product_sustained_evidence_1
    coversAcceptance: [ACC-1]
    coversImpactEdges: ["product_sustained_evidence_verified"]
    expectedRedPredicate: "短期大量重跑、workflow success 掩蓋 product skip、--version-only、workspace link 或 missing raw refs 不能通過。"
    responsibility: task-required
    contractEdge: product_sustained_evidence
    resourceKey: product_sustained_evidence
  - caseId: test_prf_product_sustained_evidence_2
    semanticKey: product_sustained_evidence_2
    coversAcceptance: [ACC-2]
    coversImpactEdges: ["product_sustained_evidence_verified"]
    expectedRedPredicate: "短期大量重跑、workflow success 掩蓋 product skip、--version-only、workspace link 或 missing raw refs 不能通過。"
    responsibility: task-required
    contractEdge: product_sustained_evidence
    resourceKey: product_sustained_evidence
  - caseId: test_prf_product_sustained_evidence_3
    semanticKey: product_sustained_evidence_3
    coversAcceptance: [ACC-3]
    coversImpactEdges: ["product_sustained_evidence_verified"]
    expectedRedPredicate: "短期大量重跑、workflow success 掩蓋 product skip、--version-only、workspace link 或 missing raw refs 不能通過。"
    responsibility: task-required
    contractEdge: product_sustained_evidence
    resourceKey: product_sustained_evidence
requiredTestCaseIds: ["test_prf_product_sustained_evidence_1","test_prf_product_sustained_evidence_2","test_prf_product_sustained_evidence_3"]
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: command-backed-bound-case-red-green
rollback:
  strategy: revert-commit-preserve-raw-evidence
  notes: "只回滾本卡程式/公開摘要，原始試驗不可刪改；暫存環境依 owner receipt 清理。"
atomizationImpact:
  ownerAtomOrMap: atm.external-proof-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.product-sustained-evidence
      pattern: Policy Object
      source: docs/reports/atm-product-proof-checkpoints.md
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-13T09:15:12.137Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-13T09:15:12.137Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-13T09-15-12-137Z-close-ed99c925a752"
lastTransitionAt: "2026-09-13T09:15:12.137Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "cbdb3aa5018a4d349687f4032762ea908163b6bf"
---

# TASK-PRF-0043 Verify sustained CI and clean adopter evidence

## Intent

累積真實長期 CI 與 clean adopter workflow 證據，核對 npm/root-drop budgets、evidence 儲存邊界及可重現性。

完整上下文：[隔離 AI benchmark 計畫](../isolated-ai-benchmark-plan.md)。沿用已批准 PRF family；本卡 owner 為角色，不代表已派出或具有外部獨立性。

## Acceptance

- [ ] ACC-1: 至少 30 連續日且 90 eligible protected-main runs 才宣稱 long-term-green；區分 product job/workflow/attempt，保留失敗和取消。
- [ ] ACC-2: 乾淨 consumer 從公開 tarball 執行 help/init/實際 workflow；公開版本、SHA、size/count 與 budgets 相符。
- [ ] ACC-3: append-only checkpoint 指向 Git 外原始資料並完成 restore；核對 runtime Git 邊界與歷史殘留，未完成不得宣稱清空 history。

## 執行與驗證

1. 閱讀母計畫及本卡，以自己的 actor identity 在 target 執行 next --prompt，遵循返回 playbook；不可接任其他歷史卡來代替本卡。
2. 確認依賴的具體產物與角色 readiness。共享 index/公用 schema 才進 broker；不得因不相干卡阻擋只讀或 planning。
3. 建立 tests/cli/product-proof-evidence-boundary.test.ts 並實作三個 case IDs；有意義的同一 case red/green 才可當 TDD，禁止字串存在測試替代行為。
4. 執行 validators 並以 ATM evidence 收錄；validator 尚未實作不是 PASS。無真實執行、零 case 或缺 artifact 不得 close。
5. 報告模型/provider/reasoning、operator/controller、來源版本、case results、raw digests、不可用欄位、總耗時與下一步。

## 負控制與停止規則

短期大量重跑、workflow success 掩蓋 product skip、--version-only、workspace link 或 missing raw refs 不能通過。

遇到缺環境、oracle 洩漏、未設定付費上限或版本不符，保存 readiness/失敗原因，不造數字、不更改 verdict 門檻。
不得讀其他 arm session 或正式 hidden labels。所有大型輸出在 Git 外保存；公開摘要不含密鑰或敏感 raw export。

## 範圍與回滾

只改 scopePaths；新檔案需在本卡 validator 覆蓋。schema/公共 policy 變更先回 0034 契約。
若實際目標模組超過 600 行，先提出可替换 extraction 邊界與更新卡片，不能只延長大模組。
實驗 worktree 限外部測試專案的拋棄式單位，不建立 framework 開發分支；外部 PR 僅能送往明確批准的 fork。
不推送、不改舊卡狀態或刪除使用者變更作為本卡的隱含收尾。負結果保留並列入整體產品決策。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T00:20:20.866Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0043-verify-sustained-ci-and-clean-adopter-evidence.task.md","contentDigest":"sha256:f50b9989df26ddef2f3843705774abbdc8ee9633ac8ca4ca220212efcb9093f6"} -->
