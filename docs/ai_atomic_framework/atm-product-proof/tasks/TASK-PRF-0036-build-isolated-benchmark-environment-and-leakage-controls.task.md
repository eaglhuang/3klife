---
task_id: TASK-PRF-0036
title: Build isolated benchmark environment and leakage controls
status: done
owner: benchmark-environment-owner
priority: P1
depends_on: ["TASK-PRF-0034"]
causalGraph:
  causalDependencies: ["TASK-PRF-0034"]
  startConditions: ["實作前以 target ATM 接手本卡；共用契約由 0034 定義，未交付前可做 docs-first 設計。"]
  softRelations: ["TASK-PRF-0008", "TASK-PRF-0019"]
  changedPublicSeams: ["benchmark_isolation"]
  causalImpactEdges: ["benchmark_isolation_verified"]
  parallelFrontierInputs: ["sealed-protocol", "role-and-tool-readiness"]
  validatorReferences: ["test_prf_benchmark_isolation_1","test_prf_benchmark_isolation_2","test_prf_benchmark_isolation_3"]
  phaseOwner: benchmark-instrumentation
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/lib/external-benchmark/isolation.ts"
  - "scripts/fixtures/atm-external-benchmark/environment.json"
  - "docs/benchmark/isolation-runbook.md"
  - "tests/cli/external-benchmark-isolation.test.ts"
deliverables:
  - "scripts/lib/external-benchmark/isolation.ts"
  - "scripts/fixtures/atm-external-benchmark/environment.json"
  - "docs/benchmark/isolation-runbook.md"
  - "tests/cli/external-benchmark-isolation.test.ts"
validators:
  - "node --strip-types tests/cli/external-benchmark-isolation.test.ts"
testContributions:
  - caseId: test_prf_benchmark_isolation_1
    semanticKey: benchmark_isolation_1
    coversAcceptance: [ACC-1]
    coversImpactEdges: ["benchmark_isolation_verified"]
    expectedRedPredicate: "同 host 全權限 subagent、錯 tarball、讀到 hidden sentinel 必須降級或拒絕強隔離。"
    responsibility: task-required
    contractEdge: benchmark_isolation
    resourceKey: benchmark_isolation
  - caseId: test_prf_benchmark_isolation_2
    semanticKey: benchmark_isolation_2
    coversAcceptance: [ACC-2]
    coversImpactEdges: ["benchmark_isolation_verified"]
    expectedRedPredicate: "同 host 全權限 subagent、錯 tarball、讀到 hidden sentinel 必須降級或拒絕強隔離。"
    responsibility: task-required
    contractEdge: benchmark_isolation
    resourceKey: benchmark_isolation
  - caseId: test_prf_benchmark_isolation_3
    semanticKey: benchmark_isolation_3
    coversAcceptance: [ACC-3]
    coversImpactEdges: ["benchmark_isolation_verified"]
    expectedRedPredicate: "同 host 全權限 subagent、錯 tarball、讀到 hidden sentinel 必須降級或拒絕強隔離。"
    responsibility: task-required
    contractEdge: benchmark_isolation
    resourceKey: benchmark_isolation
requiredTestCaseIds: ["test_prf_benchmark_isolation_1","test_prf_benchmark_isolation_2","test_prf_benchmark_isolation_3"]
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
    - atom: atm.benchmark-isolation
      pattern: Policy Object
      source: scripts/lib/external-benchmark/isolation.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-13T05:36:18.972Z"
completed_by_agent: "codex-benchmark-isolation"
closedAt: "2026-09-13T05:36:18.972Z"
closedByActor: "codex-benchmark-isolation"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-13T05-36-18-972Z-close-103e39dfb48d"
lastTransitionAt: "2026-09-13T05:36:18.972Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "879e222989b590325b93455d4a694ac8c883a676"
---

# TASK-PRF-0036 Build isolated benchmark environment and leakage controls

## Intent

建立 external-project clone 與受限容器/VM 的 run 環境，提供固定 image、Node、空白 session 與可驗證清理。

完整上下文：[隔離 AI benchmark 計畫](../isolated-ai-benchmark-plan.md)。沿用已批准 PRF family；本卡 owner 為角色，不代表已派出或具有外部獨立性。

## Acceptance

- [ ] ACC-1: 每 run 固定 repo SHA、工具/OS digest，ATM 僅安裝公開 pinned tarball，baseline 無 ATM hook/指令注入。
- [ ] ACC-2: 實際負控制證明不能讀 oracle、另一 run、framework 開發目錄或 home credentials；worktree-only 標弱隔離。
- [ ] ACC-3: 完成/失敗/取消產生 owner-bound cleanup receipt；只移除對應實驗暫存物，保留原始證據。

## 執行與驗證

1. 閱讀母計畫及本卡，以自己的 actor identity 在 target 執行 next --prompt，遵循返回 playbook；不可接任其他歷史卡來代替本卡。
2. 確認依賴的具體產物與角色 readiness。共享 index/公用 schema 才進 broker；不得因不相干卡阻擋只讀或 planning。
3. 建立 tests/cli/external-benchmark-isolation.test.ts 並實作三個 case IDs；有意義的同一 case red/green 才可當 TDD，禁止字串存在測試替代行為。
4. 執行 validators 並以 ATM evidence 收錄；validator 尚未實作不是 PASS。無真實執行、零 case 或缺 artifact 不得 close。
5. 報告模型/provider/reasoning、operator/controller、來源版本、case results、raw digests、不可用欄位、總耗時與下一步。

## 負控制與停止規則

同 host 全權限 subagent、錯 tarball、讀到 hidden sentinel 必須降級或拒絕強隔離。

遇到缺環境、oracle 洩漏、未設定付費上限或版本不符，保存 readiness/失敗原因，不造數字、不更改 verdict 門檻。
不得讀其他 arm session 或正式 hidden labels。所有大型輸出在 Git 外保存；公開摘要不含密鑰或敏感 raw export。

## 範圍與回滾

只改 scopePaths；新檔案需在本卡 validator 覆蓋。schema/公共 policy 變更先回 0034 契約。
若實際目標模組超過 600 行，先提出可替换 extraction 邊界與更新卡片，不能只延長大模組。
實驗 worktree 限外部測試專案的拋棄式單位，不建立 framework 開發分支；外部 PR 僅能送往明確批准的 fork。
不推送、不改舊卡狀態或刪除使用者變更作為本卡的隱含收尾。負結果保留並列入整體產品決策。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T00:19:58.331Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0036-build-isolated-benchmark-environment-and-leakage-controls.task.md","contentDigest":"sha256:696d11a0caf7170c9705b533f152d54908a389809516a46be8d3a8dde320c490"} -->
