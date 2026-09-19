---
task_id: TASK-PRF-0114
title: Build dry-run capable paired benchmark executor
status: done
owner: benchmark-executor-engineer
priority: P1
depends_on: ["TASK-PRF-0039"]
causalGraph:
  causalDependencies: ["TASK-PRF-0039"]
  startConditions: ["0034-0039 契約、隔離、遙測、封存語料與 packet verifier 已 done；本卡只建執行能力，不花付費 API。"]
  softRelations: ["TASK-PRF-0036", "TASK-PRF-0037", "TASK-PRF-0038", "TASK-PRF-0040"]
  changedPublicSeams: ["benchmark_executor"]
  causalImpactEdges: ["benchmark_executor_verified"]
  parallelFrontierInputs: ["paired-packet-verifier", "isolation-spec", "telemetry-contract"]
  validatorReferences: ["test_prf_benchmark_executor_1","test_prf_benchmark_executor_2","test_prf_benchmark_executor_3"]
  phaseOwner: executor
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/lib/external-benchmark/executor.ts"
  - "scripts/lib/external-benchmark/arm-driver.ts"
  - "scripts/run-atm-external-benchmark.ts"
  - "scripts/validators.config.json"
  - "tests/cli/external-benchmark-executor.test.ts"
deliverables:
  - "scripts/lib/external-benchmark/executor.ts"
  - "scripts/lib/external-benchmark/arm-driver.ts"
  - "tests/cli/external-benchmark-executor.test.ts"
validators:
  - "node --strip-types tests/cli/external-benchmark-executor.test.ts"
  - "node --strip-types scripts/run-validators.ts standard --filter validate-external-benchmark-executor"
testContributions:
  - caseId: test_prf_benchmark_executor_1
    semanticKey: benchmark_executor_1
    coversAcceptance: [ACC-1]
    coversImpactEdges: ["benchmark_executor_verified"]
    expectedRedPredicate: "executor 未依 AB/BA 產出兩 arm、worktree 不在框架工作區之外、或 raw evidence 寫進 Git 追蹤路徑。"
    responsibility: task-required
    contractEdge: benchmark_executor
    resourceKey: benchmark_executor
  - caseId: test_prf_benchmark_executor_2
    semanticKey: benchmark_executor_2
    coversAcceptance: [ACC-2]
    coversImpactEdges: ["benchmark_executor_verified"]
    expectedRedPredicate: "simulated driver 產出的 packet 能通過 pilot/formal stage 的 verifyPacket。"
    responsibility: task-required
    contractEdge: benchmark_executor
    resourceKey: benchmark_executor
  - caseId: test_prf_benchmark_executor_3
    semanticKey: benchmark_executor_3
    coversAcceptance: [ACC-3]
    coversImpactEdges: ["benchmark_executor_verified"]
    expectedRedPredicate: "未設定 token/費用/時間上限時真實 driver 仍啟動，或超出上限時未停止並保留中斷紀錄。"
    responsibility: task-required
    contractEdge: benchmark_executor
    resourceKey: benchmark_executor
requiredTestCaseIds: ["test_prf_benchmark_executor_1","test_prf_benchmark_executor_2","test_prf_benchmark_executor_3"]
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: command-backed-test-with-negative-controls
rollback:
  strategy: revert-commit
  notes: "只回滾本卡新增的 executor/driver 與 CLI 入口；不動 0034-0039 已交付的 verifier 與契約。"
atomizationImpact:
  ownerAtomOrMap: atm.external-proof-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.benchmark-executor
      pattern: Strategy
      source: scripts/lib/external-benchmark/arm-driver.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-19T02:43:15.939Z"
completed_by_agent: "claude-code-opus-5"
closedAt: "2026-09-19T02:43:15.939Z"
closedByActor: "claude-code-opus-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-19T02-43-15-939Z-close-9893670c3927"
lastTransitionAt: "2026-09-19T02:43:15.939Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ec1b7e69d"
---

# TASK-PRF-0114 Build dry-run capable paired benchmark executor

## Intent

補上 Proof 3 缺少的執行能力。2026-09-19 審查發現 `scripts/lib/external-benchmark/` 共 682 行全是驗證、裁決、度量與報告的純函式：`scripts/run-atm-external-benchmark.ts` 只有 `--verify-packet`，`executeExternalBenchmark()` 接收已跑完的 runs 當輸入；全目錄沒有建立 worktree、執行 arm 或收集 raw evidence 的程式。0040 pilot 因此只能由真人手動跑 48 次 arm，框架只在事後驗格式。

本卡建立 executor：依封存的 trial plan（repo × 情境 × 配對順序）建立拋棄式隔離 worktree、依 AB/BA 執行 atm arm 與 baseline arm、收集 Git／provider／timing raw evidence 到 Git 外的 sink，並用既有 `createPairedPacket` 產出可被 `--verify-packet` 驗證的 packet。Arm 執行透過 driver 介面抽換：本卡只交付不花 API 費用的 `simulated` driver 與真實 driver 的預算閘門骨架；付費實跑仍屬 TASK-PRF-0040。

完整上下文：[隔離 AI benchmark 計畫](../isolated-ai-benchmark-plan.md)。沿用已批准 PRF family（owner 2026-09-19 授權「先開卡補執行器」）。本卡不定義 6 個情境的任務內容（屬 0038 封存語料與 hidden-corpus custodian），executor 只消費封存後的 trial plan。

## Acceptance

- [ ] ACC-1: `run-atm-external-benchmark.ts --execute --stage <stage> --plan <trial-plan.json> --driver simulated` 對 trial plan 中每個配對依 AB/BA 各跑兩 arm；worktree 建在框架工作區與 Git 追蹤路徑之外並於結束後清除（保留清除收據）；raw evidence 寫入指定 sink，packet 只含 digest 與 refs。
- [ ] ACC-2: simulated driver 產出的 runs 標記為 synthetic；既有 `verifyPacket` 對 pilot/formal/replication/product stage 必須拒絕 synthetic packet（若目前未拒絕，本卡補上並加負控制）。
- [ ] ACC-3: 真實 driver 在未提供 token／費用／時間上限時拒絕啟動；執行中超出任一上限即停止、保留中斷紀錄且不補造數字。本卡不得實際呼叫付費 provider。

## 執行與驗證

1. 以自己的 actor identity 在 target 執行 next --prompt，依 playbook claim 本卡；不得接任其他卡。
2. 先寫紅燈測試（三個 case ID），再實作；測試須登記進 `scripts/validators.config.json` 的 standard profile，並以 `node --strip-types scripts/run-validators.ts standard --filter validate-external-benchmark-executor` 驗證 passed=1（CI 不掃 `tests/` 目錄，未登記的測試永遠不會被執行）。
3. 以 simulated driver 端到端跑一次最小 trial plan（1 repo × 1 情境 × AB/BA），確認 packet 被 pilot stage 正確拒絕（synthetic），且在測試專用 stage 下結構驗證通過。
4. 回報模型/推理設定、實際檔案、測試與負控制結果、未完成項。

## 負控制與停止規則

synthetic packet 通過 pilot/formal 驗證、worktree 落在框架工作區內、raw evidence 進入 Git、或無預算上限仍能啟動真實 driver，任一成立即不可驗收。
不得呼叫付費 API、不得啟動 0040 pilot、不得修改 0034-0039 已封存契約的語意（需要時另開卡回 0034）。

## 範圍與回滾

只改 scopePaths。0040 啟動前應以本卡 done 為前提；0040 已封存，是否調整其 depends_on 由 owner 決定，本卡不直接修改 0040。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-19T02:05:01.065Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0114-build-dry-run-capable-paired-benchmark-executor.task.md","contentDigest":"sha256:3b436e7a2075e8f2e56682f740d3019e62ce942b5cbe849e32fb0c4c95e85345"} -->