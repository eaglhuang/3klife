---
task_id: TASK-PRF-0039
title: Execute paired ATM and Git baseline arms
status: done
owner: benchmark-runner-owner
priority: P1
depends_on: ["TASK-PRF-0035","TASK-PRF-0036","TASK-PRF-0037","TASK-PRF-0038"]
causalGraph:
  causalDependencies: ["TASK-PRF-0035","TASK-PRF-0036","TASK-PRF-0037","TASK-PRF-0038"]
  startConditions: ["實作前以 target ATM 接手本卡；共用契約由 0034 定義，未交付前可做 docs-first 設計。"]
  softRelations: ["TASK-PRF-0008", "TASK-PRF-0019"]
  changedPublicSeams: ["benchmark_paired_runner"]
  causalImpactEdges: ["benchmark_paired_runner_verified"]
  parallelFrontierInputs: ["sealed-protocol", "role-and-tool-readiness"]
  validatorReferences: ["test_prf_benchmark_paired_runner_1","test_prf_benchmark_paired_runner_2","test_prf_benchmark_paired_runner_3"]
  phaseOwner: benchmark-instrumentation
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/run-atm-external-benchmark.ts"
  - "scripts/lib/external-benchmark/runner.ts"
  - "scripts/lib/external-benchmark/paired-executor.ts"
  - "tests/cli/external-benchmark-paired-executor.test.ts"
deliverables:
  - "scripts/run-atm-external-benchmark.ts"
  - "scripts/lib/external-benchmark/runner.ts"
  - "scripts/lib/external-benchmark/paired-executor.ts"
  - "tests/cli/external-benchmark-paired-executor.test.ts"
validators:
  - "node --strip-types tests/cli/external-benchmark-paired-executor.test.ts"
testContributions:
  - caseId: test_prf_benchmark_paired_runner_1
    semanticKey: benchmark_paired_runner_1
    coversAcceptance: [ACC-1]
    coversImpactEdges: ["benchmark_paired_runner_verified"]
    expectedRedPredicate: "只跑一 arm、provider 混淆、前組答案外洩、隱藏失败重跑或只有 summary 無 raw refs 均失敗。"
    responsibility: task-required
    contractEdge: benchmark_paired_runner
    resourceKey: benchmark_paired_runner
  - caseId: test_prf_benchmark_paired_runner_2
    semanticKey: benchmark_paired_runner_2
    coversAcceptance: [ACC-2]
    coversImpactEdges: ["benchmark_paired_runner_verified"]
    expectedRedPredicate: "只跑一 arm、provider 混淆、前組答案外洩、隱藏失败重跑或只有 summary 無 raw refs 均失敗。"
    responsibility: task-required
    contractEdge: benchmark_paired_runner
    resourceKey: benchmark_paired_runner
  - caseId: test_prf_benchmark_paired_runner_3
    semanticKey: benchmark_paired_runner_3
    coversAcceptance: [ACC-3]
    coversImpactEdges: ["benchmark_paired_runner_verified"]
    expectedRedPredicate: "只跑一 arm、provider 混淆、前組答案外洩、隱藏失败重跑或只有 summary 無 raw refs 均失敗。"
    responsibility: task-required
    contractEdge: benchmark_paired_runner
    resourceKey: benchmark_paired_runner
requiredTestCaseIds: ["test_prf_benchmark_paired_runner_1","test_prf_benchmark_paired_runner_2","test_prf_benchmark_paired_runner_3"]
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
    - atom: atm.benchmark-paired-runner
      pattern: Policy Object
      source: scripts/run-atm-external-benchmark.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-13T06:01:47.629Z"
completed_by_agent: "codex-benchmark-paired"
closedAt: "2026-09-13T06:01:47.629Z"
closedByActor: "codex-benchmark-paired"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-13T06-01-47-629Z-close-593adb04d4a5"
lastTransitionAt: "2026-09-13T06:01:47.629Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d8f17383b963674638b0ae989b2c43cd709f6523"
---

# TASK-PRF-0039 Execute paired ATM and Git baseline arms

## Intent

接合 runArm/adjudicate/aggregate；用真 Git 與公開 npm 完成雙 arm，同 provider 同時比較且支援全量 packet 驗證。

完整上下文：[隔離 AI benchmark 計畫](../isolated-ai-benchmark-plan.md)。沿用已批准 PRF family；本卡 owner 為角色，不代表已派出或具有外部獨立性。

## Acceptance

- [ ] ACC-1: 同模型/reasoning/budget/prompt/repo 的 AB/BA 配對，每 run 新 session，保存 seed/order、指令、merge/rebase 與失敗。
- [ ] ACC-2: baseline 執行真 worktree/Git/CI，ATM 完成公開 workflow；不使用 modeled Git 或模擬 provider 作產品數據。
- [ ] ACC-3: 提供 --verify-packet --stage pilot|formal|replication|product --packet <summary.json>，解析 Git 外 raw refs、reject 缺檔及偽造來源；支援 timeout/cancel resume。

## 執行與驗證

1. 閱讀母計畫及本卡，以自己的 actor identity 在 target 執行 next --prompt，遵循返回 playbook；不可接任其他歷史卡來代替本卡。
2. 確認依賴的具體產物與角色 readiness。共享 index/公用 schema 才進 broker；不得因不相干卡阻擋只讀或 planning。
3. 建立 tests/cli/external-benchmark-paired-executor.test.ts 並實作三個 case IDs；有意義的同一 case red/green 才可當 TDD，禁止字串存在測試替代行為。
4. 執行 validators 並以 ATM evidence 收錄；validator 尚未實作不是 PASS。無真實執行、零 case 或缺 artifact 不得 close。
5. 報告模型/provider/reasoning、operator/controller、來源版本、case results、raw digests、不可用欄位、總耗時與下一步。

## 負控制與停止規則

只跑一 arm、provider 混淆、前組答案外洩、隱藏失败重跑或只有 summary 無 raw refs 均失敗。

遇到缺環境、oracle 洩漏、未設定付費上限或版本不符，保存 readiness/失敗原因，不造數字、不更改 verdict 門檻。
不得讀其他 arm session 或正式 hidden labels。所有大型輸出在 Git 外保存；公開摘要不含密鑰或敏感 raw export。

## 範圍與回滾

只改 scopePaths；新檔案需在本卡 validator 覆蓋。schema/公共 policy 變更先回 0034 契約。
若實際目標模組超過 600 行，先提出可替换 extraction 邊界與更新卡片，不能只延長大模組。
實驗 worktree 限外部測試專案的拋棄式單位，不建立 framework 開發分支；外部 PR 僅能送往明確批准的 fork。
不推送、不改舊卡狀態或刪除使用者變更作為本卡的隱含收尾。負結果保留並列入整體產品決策。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T00:20:07.972Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0039-execute-paired-atm-and-git-baseline-arms.task.md","contentDigest":"sha256:351c9c52a36f54aacb7c9e93ae6fe065cfaa974a120e54c0ea2cf572baf56fa2"} -->
