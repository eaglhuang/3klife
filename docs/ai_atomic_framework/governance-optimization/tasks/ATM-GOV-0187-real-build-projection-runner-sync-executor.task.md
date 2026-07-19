---
task_id: ATM-GOV-0187
title: Real Build、Projection 與 Runner-Sync Executor
status: planned
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0184
  - ATM-GOV-0185
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: shared generated-write executor 延續 ATM-GOV auto-batch 主線，與 0186 平行配置 0187。
scopePaths:
  - packages/core/src/broker/**
  - packages/cli/src/commands/broker/**
  - packages/cli/src/commands/runner-mode/**
  - scripts/build-onefile-release.ts
  - tests/cli/real-build-projection-runner-sync-executor.test.ts
deliverables:
  - real build/projection executor、content-addressed skip 與 generated-write receipt
  - runner-sync enqueue/release 與 residue-clean closeout
validators:
  - node --strip-types tests/cli/real-build-projection-runner-sync-executor.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit and remove only run-owned generated residue
errorCodes:
  - code: ATM_BROKER_BATCH_GENERATED_BLOCKED
    disposition: reuse
    trigger: build/projection shared-write admission 或 execution 失敗
    registryOwnerTask: existing
  - code: ATM_RUNNER_SYNC_RECEIPT_INVALID
    disposition: reuse
    trigger: runner receipt 無法證明 sealed inputs/outputs
    registryOwnerTask: existing
atomizationImpact:
  ownerAtomOrMap: atm.generated-write-executor
  mapUpdates: []
  extractionCandidates:
    - atom: atm.generated-write-executor
      pattern: Command Adapter
      source: packages/cli/src/commands/broker/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: generated-write
---

# ATM-GOV-0187 - Real Build、Projection 與 Runner-Sync Executor

從 manifest/repository policy 執行真實 commands，每個相容 wave/surface 最多一次，觀測後產生 digest 與 receipt；失敗不得生成成功 receipt、commit 或 checkpoint。

一般 command exit code 放在 receipt details；只重用 catalog 內兩個 operator-actionable ErrorCodes，避免一個失敗衍生多個同義碼。
