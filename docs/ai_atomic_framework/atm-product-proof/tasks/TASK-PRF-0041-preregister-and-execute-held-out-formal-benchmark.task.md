---
task_id: TASK-PRF-0041
title: Preregister and execute held-out formal benchmark
status: planned
owner: benchmark-formal-steward
priority: P1
depends_on: ["TASK-PRF-0040"]
causalGraph:
  causalDependencies: ["TASK-PRF-0040"]
  startConditions: ["已封存前置產物與真實操作者、credentials、run budget；未具備先完成文件/預檢，不啟動付費試驗。"]
  softRelations: ["TASK-PRF-0008", "TASK-PRF-0019"]
  changedPublicSeams: ["benchmark_formal"]
  causalImpactEdges: ["benchmark_formal_verified"]
  parallelFrontierInputs: ["sealed-protocol", "role-and-tool-readiness"]
  validatorReferences: ["test_prf_benchmark_formal_1","test_prf_benchmark_formal_2","test_prf_benchmark_formal_3"]
  phaseOwner: formal
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/fixtures/atm-external-benchmark/formal-v2.json"
  - "docs/reports/atm-formal-benchmark.json"
  - "docs/reports/atm-formal-benchmark.md"
deliverables:
  - "scripts/fixtures/atm-external-benchmark/formal-v2.json"
  - "docs/reports/atm-formal-benchmark.json"
  - "docs/reports/atm-formal-benchmark.md"
validators:
  - "node --strip-types scripts/run-atm-external-benchmark.ts --verify-packet --stage formal --packet docs/reports/atm-formal-benchmark.json"
testContributions:
  - caseId: test_prf_benchmark_formal_1
    semanticKey: benchmark_formal_1
    coversAcceptance: [ACC-1]
    coversImpactEdges: ["benchmark_formal_verified"]
    expectedRedPredicate: "正式結果出來後改門檻、pilot 題重用、選擇性停止、只跑有利 provider 或缺 billed cost 不能 keep。"
    responsibility: task-required
    contractEdge: benchmark_formal
    resourceKey: benchmark_formal
  - caseId: test_prf_benchmark_formal_2
    semanticKey: benchmark_formal_2
    coversAcceptance: [ACC-2]
    coversImpactEdges: ["benchmark_formal_verified"]
    expectedRedPredicate: "正式結果出來後改門檻、pilot 題重用、選擇性停止、只跑有利 provider 或缺 billed cost 不能 keep。"
    responsibility: task-required
    contractEdge: benchmark_formal
    resourceKey: benchmark_formal
  - caseId: test_prf_benchmark_formal_3
    semanticKey: benchmark_formal_3
    coversAcceptance: [ACC-3]
    coversImpactEdges: ["benchmark_formal_verified"]
    expectedRedPredicate: "正式結果出來後改門檻、pilot 題重用、選擇性停止、只跑有利 provider 或缺 billed cost 不能 keep。"
    responsibility: task-required
    contractEdge: benchmark_formal
    resourceKey: benchmark_formal
requiredTestCaseIds: ["test_prf_benchmark_formal_1","test_prf_benchmark_formal_2","test_prf_benchmark_formal_3"]
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
    - atom: atm.benchmark-formal
      pattern: Policy Object
      source: scripts/fixtures/atm-external-benchmark/formal-v2.json
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0041 Preregister and execute held-out formal benchmark

## Intent

依 pilot 推估正式樣本量與預算，預先封存新 holdout、margin、完成率、經濟門檻，再執行正式試驗。

完整上下文：[隔離 AI benchmark 計畫](../isolated-ai-benchmark-plan.md)。沿用已批准 PRF family；本卡 owner 為角色，不代表已派出或具有外部獨立性。

## Acceptance

- [ ] ACC-1: 第一筆正式 run 前封存 power/sample-size、95% interval 方法、安全 margin、最低完成率、20%總成本目標及停止規則。
- [ ] ACC-2: 至少兩個 provider/model strata 各自跑兩 arm，或明確限定單 provider 結論；固定新 holdout、預算、全部 attempts。
- [ ] ACC-3: 完成事後裁決與 telemetry 綁定，公布原始 refs 與統計；未具外部控制者只標內部正式試驗。

## 執行與驗證

1. 閱讀母計畫及本卡，以自己的 actor identity 在 target 執行 next --prompt，遵循返回 playbook；不可接任其他歷史卡來代替本卡。
2. 確認依賴的具體產物與角色 readiness。共享 index/公用 schema 才進 broker；不得因不相干卡阻擋只讀或 planning。
3. 執行真實 run 並產生 summary packet，必須能解析全部 Git 外 raw refs；0039 的 stage verifier 必須實際執行本卡三個 case IDs。
4. 執行 validators 並以 ATM evidence 收錄；validator 尚未實作不是 PASS。無真實執行、零 case 或缺 artifact 不得 close。
5. 報告模型/provider/reasoning、operator/controller、來源版本、case results、raw digests、不可用欄位、總耗時與下一步。

## 負控制與停止規則

正式結果出來後改門檻、pilot 題重用、選擇性停止、只跑有利 provider 或缺 billed cost 不能 keep。

遇到缺環境、oracle 洩漏、未設定付費上限或版本不符，保存 readiness/失敗原因，不造數字、不更改 verdict 門檻。
不得讀其他 arm session 或正式 hidden labels。所有大型輸出在 Git 外保存；公開摘要不含密鑰或敏感 raw export。

## 範圍與回滾

只改 scopePaths；新檔案需在本卡 validator 覆蓋。schema/公共 policy 變更先回 0034 契約。
本卡無授權新增 framework 行為；需要修正程式時另走對應工程卡。
實驗 worktree 限外部測試專案的拋棄式單位，不建立 framework 開發分支；外部 PR 僅能送往明確批准的 fork。
不推送、不改舊卡狀態或刪除使用者變更作為本卡的隱含收尾。負結果保留並列入整體產品決策。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T00:20:14.350Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0041-preregister-and-execute-held-out-formal-benchmark.task.md","contentDigest":"sha256:3815c2fa32a7b8e5b90ec15f70acc7d14496a418918328713e8d22c3dc9dd904"} -->
