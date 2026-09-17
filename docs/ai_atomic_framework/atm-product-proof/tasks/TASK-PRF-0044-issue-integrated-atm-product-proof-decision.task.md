---
task_id: TASK-PRF-0044
title: Issue integrated ATM product proof decision
status: planned
owner: product-proof-reviewer
priority: P1
depends_on: ["TASK-PRF-0041","TASK-PRF-0042","TASK-PRF-0043"]
causalGraph:
  causalDependencies: ["TASK-PRF-0041","TASK-PRF-0042","TASK-PRF-0043"]
  startConditions: ["已封存前置產物與真實操作者、credentials、run budget；未具備先完成文件/預檢，不啟動付費試驗。"]
  softRelations: ["TASK-PRF-0008", "TASK-PRF-0019"]
  changedPublicSeams: ["product_integrated_decision"]
  causalImpactEdges: ["product_integrated_decision_verified"]
  parallelFrontierInputs: ["sealed-protocol", "role-and-tool-readiness"]
  validatorReferences: ["test_prf_product_integrated_decision_1","test_prf_product_integrated_decision_2","test_prf_product_integrated_decision_3"]
  phaseOwner: product
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/reports/atm-product-proof-final.json"
  - "docs/reports/atm-product-proof-final.md"
  - "docs/reports/atm-external-benchmark-decision.md"
deliverables:
  - "docs/reports/atm-product-proof-final.json"
  - "docs/reports/atm-product-proof-final.md"
  - "docs/reports/atm-external-benchmark-decision.md"
validators:
  - "node --strip-types scripts/run-atm-external-benchmark.ts --verify-packet --stage product --packet docs/reports/atm-product-proof-final.json"
testContributions:
  - caseId: test_prf_product_integrated_decision_1
    semanticKey: product_integrated_decision_1
    coversAcceptance: [ACC-1]
    coversImpactEdges: ["product_integrated_decision_verified"]
    expectedRedPredicate: "任一必要證據缺失、簽章冒充獨立、只看平均成本或舊卡狀態即判完成均被拒絕。"
    responsibility: task-required
    contractEdge: product_integrated_decision
    resourceKey: product_integrated_decision
  - caseId: test_prf_product_integrated_decision_2
    semanticKey: product_integrated_decision_2
    coversAcceptance: [ACC-2]
    coversImpactEdges: ["product_integrated_decision_verified"]
    expectedRedPredicate: "任一必要證據缺失、簽章冒充獨立、只看平均成本或舊卡狀態即判完成均被拒絕。"
    responsibility: task-required
    contractEdge: product_integrated_decision
    resourceKey: product_integrated_decision
  - caseId: test_prf_product_integrated_decision_3
    semanticKey: product_integrated_decision_3
    coversAcceptance: [ACC-3]
    coversImpactEdges: ["product_integrated_decision_verified"]
    expectedRedPredicate: "任一必要證據缺失、簽章冒充獨立、只看平均成本或舊卡狀態即判完成均被拒絕。"
    responsibility: task-required
    contractEdge: product_integrated_decision
    resourceKey: product_integrated_decision
requiredTestCaseIds: ["test_prf_product_integrated_decision_1","test_prf_product_integrated_decision_2","test_prf_product_integrated_decision_3"]
tddMode: reasoned-not-applicable
tddNotApplicableReason: "本卡交付真實執行證據，不是行為修改；packet verifier 由 TASK-PRF-0039 實作。零次實驗不能驗收。"
methodProfiles: [expand-contract]
evidence:
  required: command-backed-real-execution-with-verifiable-raw-refs
rollback:
  strategy: revert-commit-preserve-raw-evidence
  notes: "只回滾本卡程式/公開摘要，原始試驗不可刪改；暫存環境依 owner receipt 清理。"
atomizationImpact:
  ownerAtomOrMap: atm.external-proof-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.product-integrated-decision
      pattern: Policy Object
      source: docs/reports/atm-product-proof-final.json
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0044 Issue integrated ATM product proof decision

## Intent

綜合原始七項問題與三條產品證據鏈，核驗證據等級、總成本與安全並給出可推翻的產品決策。

完整上下文：[隔離 AI benchmark 計畫](../isolated-ai-benchmark-plan.md)。沿用已批准 PRF family；本卡 owner 為角色，不代表已派出或具有外部獨立性。

## Acceptance

- [ ] ACC-1: 逐項對照 CI/npm/runtime history/bundle/external benchmark/誤擋漏衝突成本/複雜度價值，列 authoritative refs 與限制。
- [ ] ACC-2: 只有套件、長期 CI、安全/完成率/經濟及獨立重現全部成立才 keep；否則 narrow/stop/inconclusive 並指明最小可移除能力。
- [ ] ACC-3: 對帳 0008/0019 未完義務，來源卡及 target ledger 另依治理收口，不覆寫舊結果或以新卡 done 代替原始證據。

## 執行與驗證

1. 閱讀母計畫及本卡，以自己的 actor identity 在 target 執行 next --prompt，遵循返回 playbook；不可接任其他歷史卡來代替本卡。
2. 確認依賴的具體產物與角色 readiness。共享 index/公用 schema 才進 broker；不得因不相干卡阻擋只讀或 planning。
3. 執行真實 run 並產生 summary packet，必須能解析全部 Git 外 raw refs；0039 的 stage verifier 必須實際執行本卡三個 case IDs。
4. 執行 validators 並以 ATM evidence 收錄；validator 尚未實作不是 PASS。無真實執行、零 case 或缺 artifact 不得 close。
5. 報告模型/provider/reasoning、operator/controller、來源版本、case results、raw digests、不可用欄位、總耗時與下一步。

## 負控制與停止規則

任一必要證據缺失、簽章冒充獨立、只看平均成本或舊卡狀態即判完成均被拒絕。

遇到缺環境、oracle 洩漏、未設定付費上限或版本不符，保存 readiness/失敗原因，不造數字、不更改 verdict 門檻。
不得讀其他 arm session 或正式 hidden labels。所有大型輸出在 Git 外保存；公開摘要不含密鑰或敏感 raw export。

## 範圍與回滾

只改 scopePaths；新檔案需在本卡 validator 覆蓋。schema/公共 policy 變更先回 0034 契約。
本卡無授權新增 framework 行為；需要修正程式時另走對應工程卡。
實驗 worktree 限外部測試專案的拋棄式單位，不建立 framework 開發分支；外部 PR 僅能送往明確批准的 fork。
不推送、不改舊卡狀態或刪除使用者變更作為本卡的隱含收尾。負結果保留並列入整體產品決策。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T00:20:24.139Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0044-issue-integrated-atm-product-proof-decision.task.md","contentDigest":"sha256:60eed0739c59cefbb99f95ab8c0fc475146cfec0731e524bb5dd9a5c2b454c61"} -->
