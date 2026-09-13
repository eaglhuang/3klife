---
task_id: TASK-PRF-0035
title: Repair operation denominators and total cost decision
status: done
owner: benchmark-measurement-owner
priority: P0
depends_on: ["TASK-PRF-0034"]
causalGraph:
  causalDependencies: ["TASK-PRF-0034"]
  startConditions: ["實作前以 target ATM 接手本卡；共用契約由 0034 定義，未交付前可做 docs-first 設計。"]
  softRelations: ["TASK-PRF-0008", "TASK-PRF-0019"]
  changedPublicSeams: ["benchmark_metrics"]
  causalImpactEdges: ["benchmark_metrics_verified"]
  parallelFrontierInputs: ["sealed-protocol", "role-and-tool-readiness"]
  validatorReferences: ["test_prf_benchmark_metrics_1","test_prf_benchmark_metrics_2","test_prf_benchmark_metrics_3"]
  phaseOwner: benchmark-instrumentation
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/lib/external-benchmark/adjudication.ts"
  - "scripts/lib/external-benchmark/metrics.ts"
  - "scripts/lib/external-benchmark/report.ts"
  - "tests/cli/external-benchmark-v2-metrics.test.ts"
deliverables:
  - "scripts/lib/external-benchmark/adjudication.ts"
  - "scripts/lib/external-benchmark/metrics.ts"
  - "scripts/lib/external-benchmark/report.ts"
  - "tests/cli/external-benchmark-v2-metrics.test.ts"
validators:
  - "node --strip-types tests/cli/external-benchmark-v2-metrics.test.ts"
testContributions:
  - caseId: test_prf_benchmark_metrics_1
    semanticKey: benchmark_metrics_1
    coversAcceptance: [ACC-1]
    coversImpactEdges: ["benchmark_metrics_verified"]
    expectedRedPredicate: "9 良性加 1 衝突資料必須分母為 9/1；廉價但未完成、缺成本、群聚重複樣本不得假綠。"
    responsibility: task-required
    contractEdge: benchmark_metrics
    resourceKey: benchmark_metrics
  - caseId: test_prf_benchmark_metrics_2
    semanticKey: benchmark_metrics_2
    coversAcceptance: [ACC-2]
    coversImpactEdges: ["benchmark_metrics_verified"]
    expectedRedPredicate: "9 良性加 1 衝突資料必須分母為 9/1；廉價但未完成、缺成本、群聚重複樣本不得假綠。"
    responsibility: task-required
    contractEdge: benchmark_metrics
    resourceKey: benchmark_metrics
  - caseId: test_prf_benchmark_metrics_3
    semanticKey: benchmark_metrics_3
    coversAcceptance: [ACC-3]
    coversImpactEdges: ["benchmark_metrics_verified"]
    expectedRedPredicate: "9 良性加 1 衝突資料必須分母為 9/1；廉價但未完成、缺成本、群聚重複樣本不得假綠。"
    responsibility: task-required
    contractEdge: benchmark_metrics
    resourceKey: benchmark_metrics
requiredTestCaseIds: ["test_prf_benchmark_metrics_1","test_prf_benchmark_metrics_2","test_prf_benchmark_metrics_3"]
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
    - atom: atm.benchmark-metrics
      pattern: Policy Object
      source: scripts/lib/external-benchmark/adjudication.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-13T05:28:55.940Z"
completed_by_agent: "codex-benchmark-metrics"
closedAt: "2026-09-13T05:28:55.940Z"
closedByActor: "codex-benchmark-metrics"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-13T05-28-55-940Z-close-990cd3607ef5"
lastTransitionAt: "2026-09-13T05:28:55.940Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "7becfb850d2f05ea75cb1b0dd61af4aab3cd1e05"
---

# TASK-PRF-0035 Repair operation denominators and total cost decision

## Intent

修正錯誤分母與只看 API 費的判優，依 operation 真值及群聚 paired data 計算安全、完成率與總成本。

完整上下文：[隔離 AI benchmark 計畫](../isolated-ai-benchmark-plan.md)。沿用已批准 PRF family；本卡 owner 為角色，不代表已派出或具有外部獨立性。

## Acceptance

- [ ] ACC-1: false-block 只除良性操作，missed-conflict 只除衝突操作；零分母 unavailable，輸出 count 與缺失率。
- [ ] ACC-2: 總成本包含事前時薪與人工介入、API 實付、運算分攤；首次導入與穩態分開，估價不能冒充帳務。
- [ ] ACC-3: 輸出群聚配對 95% 區間、完成率及 policy-based decision；不足樣本或安全／完成率不合格不得 keep。

## 執行與驗證

1. 閱讀母計畫及本卡，以自己的 actor identity 在 target 執行 next --prompt，遵循返回 playbook；不可接任其他歷史卡來代替本卡。
2. 確認依賴的具體產物與角色 readiness。共享 index/公用 schema 才進 broker；不得因不相干卡阻擋只讀或 planning。
3. 建立 tests/cli/external-benchmark-v2-metrics.test.ts 並實作三個 case IDs；有意義的同一 case red/green 才可當 TDD，禁止字串存在測試替代行為。
4. 執行 validators 並以 ATM evidence 收錄；validator 尚未實作不是 PASS。無真實執行、零 case 或缺 artifact 不得 close。
5. 報告模型/provider/reasoning、operator/controller、來源版本、case results、raw digests、不可用欄位、總耗時與下一步。

## 負控制與停止規則

9 良性加 1 衝突資料必須分母為 9/1；廉價但未完成、缺成本、群聚重複樣本不得假綠。

遇到缺環境、oracle 洩漏、未設定付費上限或版本不符，保存 readiness/失敗原因，不造數字、不更改 verdict 門檻。
不得讀其他 arm session 或正式 hidden labels。所有大型輸出在 Git 外保存；公開摘要不含密鑰或敏感 raw export。

## 範圍與回滾

只改 scopePaths；新檔案需在本卡 validator 覆蓋。schema/公共 policy 變更先回 0034 契約。
若實際目標模組超過 600 行，先提出可替换 extraction 邊界與更新卡片，不能只延長大模組。
實驗 worktree 限外部測試專案的拋棄式單位，不建立 framework 開發分支；外部 PR 僅能送往明確批准的 fork。
不推送、不改舊卡狀態或刪除使用者變更作為本卡的隱含收尾。負結果保留並列入整體產品決策。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T00:19:55.138Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0035-repair-operation-denominators-and-total-cost-decision.task.md","contentDigest":"sha256:4eecea6ed4fa01436028c7d6cc6d9c7e476f52b13a98a4bc45da314272a2a960"} -->
