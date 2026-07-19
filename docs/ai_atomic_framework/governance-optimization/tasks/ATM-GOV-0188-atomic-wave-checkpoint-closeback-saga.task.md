---
task_id: ATM-GOV-0188
title: Atomic Wave Checkpoint 與 Cross-Repo Closeback Saga
status: planned
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
---

# ATM-GOV-0188 - Atomic Wave Checkpoint 與 Cross-Repo Closeback Saga

全部 member ready 後才 fan-out target closures；target push 成功後再以 planning seal CAS closeback。跨 repo 是可 resume saga，不宣稱單一 Git 原子交易。

`reconcile-required`、`committed-not-pushed` 是狀態；只有 readiness command failure 與 planning CAS conflict 使用 catalog 代碼。新碼由 0183 統一登錄，本卡只實作 emitter 與整合測試。
