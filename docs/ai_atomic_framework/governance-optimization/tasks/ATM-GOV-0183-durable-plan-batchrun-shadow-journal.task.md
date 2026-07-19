---
task_id: ATM-GOV-0183
title: Durable Plan BatchRun、Lane Stamping 與 Shadow Journal
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0182
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: governance-optimization 的 plan-run durability 與觀測地基，沿用 ATM-GOV 家族下一號 0183。
scopePaths:
  - packages/core/src/batch/**
  - packages/core/src/broker/**
  - packages/cli/src/commands/batch/**
  - packages/cli/src/commands/tasks/**
  - packages/cli/src/commands/taskflow/**
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - tests/cli/durable-plan-batchrun-shadow-journal.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
deliverables:
  - atm.batchRun.v1 0.2 compatible store 與 append-only plan journal
  - lane/token stamping 與 serial shadow instrumentation
  - plan-wide ErrorCode registry entries 與 regenerated docs/ERROR_CODES.md
  - plan/shadow telemetry join 與 sealed task summary
validators:
  - node --strip-types tests/cli/durable-plan-batchrun-shadow-journal.test.ts
  - npm run generate:error-codes
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: disable shadow instrumentation and revert-commit
errorCodes:
  - code: ATM_BATCH_PLAN_DIGEST_MISMATCH
    disposition: register
    category: batch
    trigger: resume plan digest 與 pinned digest 不符
    retryable: true
    requiresHumanApproval: true
    recovery: node atm.mjs batch execute-plan --batch <id> --accept-plan-change --json
    sourceOwner: packages/cli/src/commands/batch/
    registryOwnerTask: ATM-GOV-0183
  - code: ATM_BATCH_RUN_EVENT_JOURNAL_INVALID
    disposition: register
    category: batch
    trigger: event schema、digest 或 idempotency key 矛盾
    retryable: false
    requiresHumanApproval: false
    recovery: node atm.mjs batch status --batch <id> --json
    sourceOwner: packages/core/src/batch/
    registryOwnerTask: ATM-GOV-0183
  - code: ATM_BATCH_PLANNING_CLOSEBACK_CONFLICT
    disposition: register
    category: batch
    trigger: planning closeback compare-and-swap seal 不符
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs batch execute-plan --batch <id> --json
    sourceOwner: packages/cli/src/commands/batch/
    registryOwnerTask: ATM-GOV-0183
  - code: ATM_BATCH_PUSH_DIVERGED
    disposition: register
    category: git-governance
    trigger: remote 與本 run commits 無法安全 fast-forward
    retryable: false
    requiresHumanApproval: true
    recovery: node atm.mjs git admit --actor <actor> --branch main --remote origin --json
    sourceOwner: packages/cli/src/commands/batch/
    registryOwnerTask: ATM-GOV-0183
atomizationImpact:
  ownerAtomOrMap: atm.plan-run-journal
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.plan-run-journal
      pattern: Event Log
      source: packages/core/src/batch/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: plan-runtime
completed_at: "2026-07-19T08:52:22.347Z"
completed_by_agent: "codex-governance-optimizer"
closedAt: "2026-07-19T08:52:22.347Z"
closedByActor: "codex-governance-optimizer"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-19T08-52-22-347Z-close-d9545c9d14d2"
lastTransitionAt: "2026-07-19T08:52:22.347Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "09039fe624f2f8844b78a5e4aac61445bb1884fb"
---

# ATM-GOV-0183 - Durable Plan BatchRun、Lane Stamping 與 Shadow Journal

## 問題描述

建立可 resume 的 plan run、全鏈 lane/token stamps 與不改變 serial 行為的 shadow events。本卡是計畫唯一 ErrorCode registry owner。

## INPUT_CONTRACT

- 0182 sealed route/preflight summary、plan digest、member cards、coordinator/member lanes 與 0193 correlation schema。

## OUTPUT_CONTRACT

- Durable BatchRun/journal、合法 phase transition、lane/token stamps 與 serial shadow lifecycle events。
- ErrorCode registry 由本卡集中寫入；其他卡只接 emitter。

## Telemetry Contract

- Produces：BatchRun phase、shadow claim/close/runner-sync、broker decision journal、wait start/end、journal validity、join keys 與 token source。
- Consumes：0182 sealed summary；角色為 M1 baseline。
- Broker decision journal 必須保留平行 admission 是否先發生、衝突軸、ticket/queue/batch/compose/serialize 決策與 final disposition；缺 broker event 時，後續 analyzer 必須標 coverage limitation。
- 缺 wait end 表示 incomplete，不是 `waitedMs: 0`；本機無 provider usage 必須記 `source: unavailable`。
- Closure evidence：shadow parity、sealed history/config digest、join coverage、dropped/malformed 摘要。

## 交付物

- BatchRun store/journal、shadow adapter、lane/token schema、ErrorCode registry 更新與 telemetry join。

## 以戰養戰決策點

- 開工前：讀取 0182 route/preflight sealed summary 與 0193 coverage/meta-health，確認 plan membership、lane presence 與 WIP provenance 足以建立 BatchRun；若前序 summary 不完整，先回報 owner 決定補 0182 或降級為保守 serial path。
- 實作中：可依 0182/0193 的實測缺口調整 journal join keys、token source fallback、broker decision journal 與 shadow sampling；若 shadow/broker 事件會重複記錄 gate telemetry 已有事實，停止並修正分工，避免第二套儀表。
- 收口前：產出 `dataDrivenDecision`，列明 0184/0185 可消費的 BatchRun phase、wait start/end、token source 與 missing-data semantics。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/durable-plan-batchrun-shadow-journal.test.ts
npm run generate:error-codes
npm run typecheck
npm run validate:cli
```

## ROLLBACK_HINT

關閉 shadow instrumentation 並 revert；保留 journal 與 sealed telemetry 供 audit。

## 執行步驟

1. 抽取 journal/adapter modules，先釘 phase 與 idempotency。
2. 接線 shadow 與 0193 correlation，做開關前後 bit-for-bit parity。
3. 登錄 ErrorCodes、seal baseline 工作窗並驗證 join。

驗收包含 crash/restart、duplicate event、digest amendment、legacy reader、malformed shadow warning、wait start/end、token unavailable，以及 0184 起可取得真實 serial baseline。所有新碼均須用 `atm-error-code-resolver` authoring flow 登錄。
