---
task_id: ATM-GOV-0186
title: Real Shared Delivery Commit Executor
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
---

# ATM-GOV-0186 - Real Shared Delivery Commit Executor

以 temporary index 將同 wave、相容 surface 的 worker slices 與 generated outputs 實際提交；foreign staged 不吸收，commit 後 tree 必須與 receipt bit-for-bit 對帳。

本卡只重用 catalog 既有代碼；所有 emitter tests 都要透過 `atm-error-code-resolver` 契約檢查 trigger、details 與 recovery。
