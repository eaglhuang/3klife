---
task_id: ATM-GOV-0186
title: Real Shared Delivery Commit Executor
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0184
  - ATM-GOV-0185
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Broker shared delivery executor 延續 ATM-GOV auto-batch 主線，配置 0186。
scopePaths:
  - packages/core/src/broker/**
  - packages/cli/src/commands/broker/**
  - packages/cli/src/commands/git-governance/**
  - tests/cli/real-shared-delivery-commit-executor.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
deliverables:
  - temporary-index shared delivery executor 與 post-commit payload assertion
  - complete ticket transitions 與 wave lane acknowledgment
  - shared-write treatment telemetry 與 M1 consumption receipt
validators:
  - node --strip-types tests/cli/real-shared-delivery-commit-executor.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert shared delivery commit and executor commit
errorCodes:
  - code: ATM_BATCH_FILE_CONFLICT
    disposition: reuse
    trigger: sealed wave file slices 與 foreign changes 相交
    registryOwnerTask: existing
  - code: ATM_BROKER_BATCH_COMMIT_BLOCKED
    disposition: reuse
    trigger: broker admission、lane、HEAD 或 manifest guard 不成立
    registryOwnerTask: existing
  - code: ATM_GIT_RECORD_COMMIT_PAYLOAD_DROPPED
    disposition: reuse
    trigger: staged set、receipt slices 與 commit tree 不一致
    registryOwnerTask: existing
atomizationImpact:
  ownerAtomOrMap: atm.shared-delivery-commit-executor
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.shared-delivery-commit-executor
      pattern: Transaction Script
      source: packages/cli/src/commands/broker/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: shared-delivery
completed_at: "2026-07-19T11:39:13.637Z"
completed_by_agent: "codex-governance-optimizer"
closedAt: "2026-07-19T11:39:13.637Z"
closedByActor: "codex-governance-optimizer"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-19T11-39-13-521Z-close-7d3cd78d7769"
lastTransitionAt: "2026-07-19T11:39:13.637Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "111cbdc01a57f3c34b53ddecaf99a92d5654bf0d"
---

# ATM-GOV-0186 - Real Shared Delivery Commit Executor

## 問題描述

以 temporary index 將同 wave、相容 surface 的 worker slices 與 generated outputs 實際提交；foreign staged 不吸收，commit 後 tree 必須與 receipt bit-for-bit 對帳。

## INPUT_CONTRACT

- 0184/0185 worker/validator receipts、M1 report、optimization/config digest、sealed HEAD 與 wave manifest。

## OUTPUT_CONTRACT

- Shared delivery commit/receipt、ticket transitions、payload assertion 與 lane acknowledgment。

## Telemetry Contract

- Produces：admission、broker compose/serialize decision、pre-commit per-check、temporary-index、payload assertion 與 ticket treatment events。
- Consumes：M1 cohort/report 與 optimization receipt；角色為 M2 treatment。
- 沒有 matched baseline 不阻塞安全施工，但效果只能 `inconclusive`；payload/receipt mismatch 必須安全失敗，不能被 telemetry fail-open 掩蓋。
- 每次 shared-write broker 判斷都必須留下 composeCandidate、composeDecision、compositionGroupId、finalDisposition、sideEffectAllowed、safetyFallback 與 correctnessVerdict=pending；post-commit payload assertion 或 escaped conflict 再補 classification event。
- Closure evidence：sealed treatment digest、M1 input digest、unique rejection/classification 與 missing/dropped 摘要。

## 交付物

- 真實 executor、receipt/assertion、lane attribution 與 treatment telemetry。

## 以戰養戰決策點

- 開工前：condition review 必讀 0185 M1 report/cohort manifest、optimization/config digest、0184 worker summary 與 0193 coverage；若 M1 不足或不可比，本卡可施工但效果只能標 `inconclusive`，不得宣稱優化成立。
- 實作中：可依 M1 的 validator ordering、duration、unique block、false-positive、cache 或 broker conflict/compose 信號調整 shared commit admission、payload assertion 順序與 fallback；若資料顯示 wave shared commit 紀律比 serial 更危險或不可對帳，停止並提出改卡/改計畫。
- 收口前：產出 `dataDrivenDecision`，列明哪些 M1 信號被採用、哪些 treatment 事件供 0187-0190 配對，並留下 rollback/config digest。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/real-shared-delivery-commit-executor.test.ts
npm run typecheck
npm run validate:cli
```

## ROLLBACK_HINT

停用 executor、revert run-owned commits；不改 foreign index，保留 sealed evidence。

## 執行步驟

1. 驗證 M1/config input 後建立 temporary-index transaction。
2. 接線 per-check treatment 與 payload assertion。
3. seal 工作窗並驗證 crash resume、same/cross-wave 與 lane attribution。

本卡只重用 catalog 既有代碼；所有 emitter tests 都要透過 `atm-error-code-resolver` 契約檢查 trigger、details 與 recovery。
