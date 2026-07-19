---
task_id: ATM-GOV-0184
title: Real Team Wave Worker Executor
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0183
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Team Wave 正式執行仍屬 auto-batch governance，沿用 ATM-GOV 家族 0184。
scopePaths:
  - packages/core/src/team-agents/**
  - packages/cli/src/commands/team/**
  - packages/cli/src/commands/batch/**
  - tests/cli/real-team-wave-worker-executor.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli-team.json
deliverables:
  - provider/editor worker executor 與 atm.teamWorkerReport.v1 ingestion
  - per-task lane heartbeat/sweep、retry 與 coordinator authority guard
  - worker lifecycle telemetry 與 sealed task summary
validators:
  - node --strip-types tests/cli/real-team-wave-worker-executor.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: force serial fallback and revert-commit
errorCodes:
  - code: ATM_TEAM_RUN_INVALID
    disposition: reuse
    trigger: worker report schema 或 run binding 無效
    registryOwnerTask: existing
  - code: ATM_TEAM_WRITE_SCOPE_OUT_OF_BOUNDS
    disposition: reuse
    trigger: worker report 包含 claim scope 外修改
    registryOwnerTask: existing
  - code: ATM_TEAM_LEASE_CONFLICT
    disposition: reuse
    trigger: worker lane lease 與 active owner 衝突
    registryOwnerTask: existing
atomizationImpact:
  ownerAtomOrMap: atm.team-wave-worker-executor
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli-team.json
  extractionCandidates:
    - atom: atm.team-wave-worker-executor
      pattern: Strategy
      source: packages/cli/src/commands/team/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: team-wave
completed_at: "2026-07-19T09:13:36.490Z"
completed_by_agent: "codex-governance-optimizer"
closedAt: "2026-07-19T09:13:36.490Z"
closedByActor: "codex-governance-optimizer"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-19T09-13-36-490Z-close-980753ce33e9"
lastTransitionAt: "2026-07-19T09:13:36.490Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d5bd615463fd791123ae88eee4da9132fb2bf384"
---

# ATM-GOV-0184 - Real Team Wave Worker Executor

## 問題描述

真正啟動或接收 Team workers；每卡永久綁定 lane，worker 只回傳 scope-bounded patch/report/evidence，commit、checkpoint 與 close 只屬 coordinator。

## INPUT_CONTRACT

- 0183 BatchRun/journal seal、wave manifest、provider/editor bridge、claim scope 與 lane lease。

## OUTPUT_CONTRACT

- Worker start/report/heartbeat/sweep/retry/defer 流程、coordinator authority guard 與 serial fallback。

## Telemetry Contract

- Produces：worker lifecycle、report ingestion、scope/lease verdict、retry/defer 與 token source，皆帶 wave/member lane。
- Consumes：0183 sealed journal 與 0193 health；角色為 M1 baseline。
- 缺 worker report/usage 不得視為成功、零成本或零等待，只能 partial / `source: unavailable`。
- Closure evidence：worker/report coverage、sealed digest、missing/dropped 與 authority-guard 統計。

## 交付物

- provider/editor executor、report ingestion、lane lifecycle、authority guard 與 telemetry adapter。

## 以戰養戰決策點

- 開工前：讀取 0183 BatchRun/journal sealed summary、0182 route summary 與 0193 health，確認 worker lane、wave manifest 與 missing-report 規則足以比較；若前序資料顯示 team wave 只會製造等待或不可審計狀態，停止並提出是否重排/縮小 worker executor 的建議。
- 實作中：可依已封存的 wait、coverage、missing worker/report 訊號調整 retry/defer、heartbeat sweep 與 serial fallback threshold；不得把 missing report、missing usage 或 out-of-scope report 視為成功或零成本。
- 收口前：產出 `dataDrivenDecision`，留下 worker lifecycle baseline、report coverage、authority guard 結果與 0185/0186 可消費的 wave/member lane digest。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/real-team-wave-worker-executor.test.ts
npm run typecheck
npm run validate:cli
```

## ROLLBACK_HINT

強制 serial fallback 並 revert；不刪 sealed baseline。

## 執行步驟

1. 實作 worker/report adapter 與永久 lane binding。
2. 接線 lifecycle telemetry，覆蓋 partial、stale、out-of-scope 與 missing report。
3. seal 工作窗並驗證 worker 無 commit/close 權限。

本卡只重用既有 Team ErrorCodes；`partial`、`needs-review` 與 one-member fallback 是狀態，不建立新碼。focused tests 必須驗證 structured details 與安全復原路徑。
