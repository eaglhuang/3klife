---
task_id: ATM-GOV-0189
title: Plan-Level Executor 主迴圈、收單策略與復原 CLI
status: planned
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0188
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: plan-level 一條龍 driver 是 ATM-GOV auto-batch 執行入口，配置 0189。
scopePaths:
  - packages/cli/src/commands/batch/**
  - packages/cli/src/atm.ts
  - tests/cli/plan-level-executor-recovery.test.ts
  - docs/governance/command-surface.md
deliverables:
  - batch execute-plan 主迴圈、resume/pause/cancel/serial fallback/circuit breaker
  - push/divergence recovery 與 own-scope residue check
  - EMA/window/recovery treatment telemetry 與 decision input receipts
validators:
  - node --strip-types tests/cli/plan-level-executor-recovery.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: disable plan executor and resume existing serial commands
errorCodes:
  - code: ATM_BATCH_PUSH_DIVERGED
    disposition: register
    trigger: fetch 後 remote 與本 run commits 無法安全 fast-forward
    retryable: false
    requiresHumanApproval: true
    recovery: node atm.mjs git admit --actor <actor> --branch main --remote origin --json
    sourceOwner: packages/cli/src/commands/batch/
    registryOwnerTask: ATM-GOV-0183
  - code: ATM_BATCH_STATE_REPAIR_REQUIRED
    disposition: reuse
    trigger: durable run state 無法安全 resume
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs batch status --batch <id> --json
    registryOwnerTask: existing
atomizationImpact:
  ownerAtomOrMap: atm.plan-level-executor
  mapUpdates: []
  extractionCandidates:
    - atom: atm.plan-level-executor
      pattern: Process Manager
      source: packages/cli/src/commands/batch/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: plan-executor
---

# ATM-GOV-0189 - Plan-Level Executor 主迴圈、收單策略與復原 CLI

## 問題描述

以單一命令持續推進 preflight、wave work、validation、shared writes、checkpoint、push、planning closeback、analysis 與 next wave，且每次只輸出一個 next/recovery command。

## INPUT_CONTRACT

- 0188 durable saga、sealed telemetry density/health、commit/ticket events、M1 optimization/config digest 與 recovery state。

## OUTPUT_CONTRACT

- Plan driver、EMA collection policy、pause/resume/adopt/circuit-breaker、push recovery 與 decision receipts。

## Telemetry Contract

- Produces：EMA inputs/decision、actual wait、early-close、push/recovery/circuit-breaker treatment events。
- Consumes：sealed event density/meta-health 與 prior phase summaries；角色為 M2 treatment。
- 遙測缺漏時回退 floor policy並標 missing，不能當成事件密度為零；每次自動決策保存 report/config digest。
- Closure evidence：sealed treatment digest、window decision receipts、recovery refs、missing/dropped 與 own-scope cleanliness。

## 交付物

- 一條龍 driver、dynamic window、recovery CLI 與 treatment telemetry。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/plan-level-executor-recovery.test.ts
npm run typecheck
npm run validate:cli
```

## ROLLBACK_HINT

停用 plan executor，回既有 serial commands；保留 durable run 與 sealed evidence 供 resume/audit。

## 執行步驟

1. 串接既有 phase 與唯一 recovery command。
2. 用 sealed density 驅動 EMA，保存所有輸入/決策 digest 與 fallback。
3. 驗證 pause/adopt/divergence/circuit-breaker 後 seal 工作窗。

pause、cancel、circuit-open 與 push-pending 都是狀態；只有不可自動收斂的 push divergence 與 corrupt run state 使用 ErrorCode。新碼由 0183 登錄，本卡驗證 emitter、approval 與 recovery details。
