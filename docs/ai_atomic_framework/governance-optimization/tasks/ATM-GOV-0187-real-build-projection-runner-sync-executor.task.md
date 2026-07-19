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
  - generated-write treatment telemetry 與 sealed task summary
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

## 問題描述

從 manifest/repository policy 執行真實 commands，每個相容 wave/surface 最多一次，觀測後產生 digest 與 receipt；失敗不得生成成功 receipt、commit 或 checkpoint。

## INPUT_CONTRACT

- 0184/0185 manifest/validator state、M1/config digest、repository build/projection policy 與 sealed inputs。

## OUTPUT_CONTRACT

- 真實 generated-write execution/skip、observed digest、receipt、runner-sync release 與 residue closeout。

## Telemetry Contract

- Produces：build/projection/runner-sync duration、skip reason、input/output digest、receipt validity treatment events。
- Consumes：M1 check identity/config 與 prior sealed duration；角色為 M2 treatment。
- 缺真實 output digest/receipt 不得補造成功或零成本事件；`source: unavailable` 必須顯式。
- Closure evidence：sealed treatment digest、exactly-once/skip 統計、missing/dropped 與 residue result。

## 交付物

- command adapter、content-addressed skip、receipt/release 與 treatment telemetry。

## 以戰養戰決策點

- 開工前：讀取 M1 report/config digest、0184/0185 manifest/validator state、0186 shared-write treatment summary（若已存在）與 runner-sync coverage；若 build/projection/runner receipt identity 不可比較，禁止以假 digest 補樣本。
- 實作中：可依 duration、skip、receipt validity、input/output digest mismatch 與 residue 信號調整 generated-write ordering、skip policy 或 retry；若 runner-sync 或 projection 數據顯示會污染 release/工作樹，停止並提出計畫修訂。
- 收口前：產出 `dataDrivenDecision`，留下 generated-write treatment digest、exactly-once/skip 統計、缺樣本原因與 0188/0190 可配對的 input/output digest。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/real-build-projection-runner-sync-executor.test.ts
npm run typecheck
npm run validate:cli
```

## ROLLBACK_HINT

停用 generated-write executor、移除 run-owned residue；保留 sealed evidence。

## 執行步驟

1. 解析並執行真實 commands，觀測後才產生 digest。
2. 接線 exactly-once/skip/receipt telemetry。
3. seal 工作窗並驗證 retry、mismatch 與 clean closeout。

一般 command exit code 放在 receipt details；只重用 catalog 內兩個 operator-actionable ErrorCodes，避免一個失敗衍生多個同義碼。
