---
task_id: ATM-GOV-0188
title: Atomic Wave Checkpoint 與 Cross-Repo Closeback Saga
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0186
  - ATM-GOV-0187
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: wave checkpoint/closeback 是 ATM-GOV auto-batch 收口層，配置 0188。
scopePaths:
  - packages/cli/src/commands/batch/**
  - packages/cli/src/commands/taskflow/**
  - packages/cli/src/commands/git-governance/**
  - tests/cli/atomic-wave-checkpoint-closeback-saga.test.ts
  - scripts/validators/task-ledger/**
deliverables:
  - atm.atomicWaveCheckpointReceipt.v1 與 fan-out closure driver
  - target closure commit/push、planning CAS closeback 與 adopt-safe resume
  - checkpoint/rejection/evidence-readback treatment telemetry
validators:
  - node --strip-types tests/cli/atomic-wave-checkpoint-closeback-saga.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: preserve pushed target closure; resume or repair planning side only
errorCodes:
  - code: ATM_BATCH_WAVE_CHECKPOINT_BLOCKED
    disposition: reuse
    trigger: 任一 member readiness/receipt/evidence 未齊
    registryOwnerTask: existing
  - code: ATM_BATCH_PLANNING_CLOSEBACK_CONFLICT
    disposition: register
    trigger: planning source seal compare-and-swap 不符
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs batch execute-plan --batch <id> --json
    sourceOwner: packages/cli/src/commands/batch/
    registryOwnerTask: ATM-GOV-0183
atomizationImpact:
  ownerAtomOrMap: atm.atomic-wave-checkpoint
  mapUpdates: []
  extractionCandidates:
    - atom: atm.atomic-wave-checkpoint
      pattern: Saga
      source: packages/cli/src/commands/batch/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: checkpoint
completed_at: "2026-07-19T12:19:39.875Z"
completed_by_agent: "codex-governance-optimizer"
closedAt: "2026-07-19T12:19:39.875Z"
closedByActor: "codex-governance-optimizer"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-19T12-19-39-875Z-close-cf94a04f74fe"
lastTransitionAt: "2026-07-19T12:19:39.875Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "4083157505847f5a0b246c45fbb2574449c80d68"
---

# ATM-GOV-0188 - Atomic Wave Checkpoint 與 Cross-Repo Closeback Saga

## 問題描述

全部 member ready 後才 fan-out target closures；target push 成功後再以 planning seal CAS closeback。跨 repo 是可 resume saga，不宣稱單一 Git 原子交易。

## INPUT_CONTRACT

- 0186 shared delivery receipt、0187 generated receipt、member evidence、0193 sealed rejection/classification 與 planning source seal。

## OUTPUT_CONTRACT

- Atomic checkpoint receipt、per-card closure、target/planning saga state 與 adopt-safe resume。

## Telemetry Contract

- Produces：readiness/close audit/CAS/checkpoint、evidence readback、rejection classification treatment events。
- Consumes：sealed rejection/history 與 member summaries；角色為 M2 treatment。
- stdout-only failure 不算 durable evidence；缺 envelope/ref 必須標 missing，不能解讀為零拒絕。
- Closure evidence：checkpoint watermark、sealed digest、evidenceConsumed/readback、unique block 與 missing/dropped 摘要。

## 交付物

- checkpoint/closeback saga、receipt、audit rule 與 rejection/evidence telemetry。

## 以戰養戰決策點

- 開工前：讀取 0186/0187 treatment summaries、sealed rejection/history、member evidence summaries 與 planning source seal；若證據讀回或 checkpoint coverage 不足，先停下補 evidence contract，不用 stdout 重建狀態。
- 實作中：可依 rejection classification、evidence readback、CAS conflict 與 checkpoint duration 調整 closeback retry、adopt/takeover 與 reconcile policy；若資料顯示 cross-repo closeback 無法安全 resume，停止並提出拆分或降級計畫。
- 收口前：產出 `dataDrivenDecision`，留下 checkpoint watermark、evidenceConsumed/readback、unique block 與 0189 dynamic window 可消費的 sealed density/health。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/atomic-wave-checkpoint-closeback-saga.test.ts
npm run typecheck
npm run validate:cli
```

## ROLLBACK_HINT

已 push 的 target closure 保持有效；只 resume/repair planning side，保留 sealed rejection history。

## 執行步驟

1. 驗證所有 member receipt/evidence，再啟動 checkpoint。
2. 封存 rejection/classification 與 evidence readback。
3. 注入各 crash/CAS/adopt 場景，確認 side effects exactly once。

`reconcile-required`、`committed-not-pushed` 是狀態；只有 readiness command failure 與 planning CAS conflict 使用 catalog 代碼。新碼由 0183 統一登錄，本卡只實作 emitter 與整合測試。
