---
task_id: ATM-GOV-0185
title: Validator DAG、共享結果與安全 Cache
status: planned
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0183
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: wave validator 去重與證據 fan-out 是治理效能工作，沿用 ATM-GOV 家族 0185。
scopePaths:
  - packages/core/src/evidence/**
  - packages/cli/src/commands/evidence/**
  - scripts/run-validators/**
  - tests/cli/validator-dag-shared-cache.test.ts
deliverables:
  - validator DAG planner、sealed-input cache key 與 evidence fan-out
  - telemetry-informed ordering 與 M1 baseline cohort seal
validators:
  - node --strip-types tests/cli/validator-dag-shared-cache.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: disable cache and revert-commit
errorCodes:
  - code: ATM_VALIDATOR_FAILED
    disposition: reuse
    trigger: command-backed validator 真正失敗
    registryOwnerTask: existing
atomizationImpact:
  ownerAtomOrMap: atm.validator-dag-cache
  mapUpdates: []
  extractionCandidates:
    - atom: atm.validator-dag-cache
      pattern: DAG Scheduler
      source: packages/core/src/evidence/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: validator
---

# ATM-GOV-0185 - Validator DAG、共享結果與安全 Cache

## 問題描述

相同 sealed inputs 與完整 toolchain/env key 的 validator 每 wave 只跑一次並 fan-out；用已封存實測成本排序，不靠直覺增加等待。

## INPUT_CONTRACT

- 0183 journal、sealed inputs/HEAD、toolchain/lockfile/env whitelist、0193 sealed duration/check report。

## OUTPUT_CONTRACT

- Validator DAG、safe cache、evidence fan-out、planner decision receipt 與 M1 cohort manifest/report。

## Telemetry Contract

- Produces：queue/execute duration、cache hit/miss/bypass、fan-out coverage、validator result 與 M1 seal。
- Consumes：0193 sealed p50/p95 與 config/history digest；角色為 M1 baseline 與第一個資料 consumer。
- 缺資料時只使用宣告成本並標 `observability-missing`，不得授權自動重排、cache 擴張或 gate 裁汰。
- Closure evidence：0193+0182-0185 cohort manifest、eligible opportunity、workload strata、config digest 與 dropped/missing 摘要。

## 交付物

- DAG/cache/fan-out、telemetry-informed planner 與可重現 M1 report。

## 以戰養戰決策點

- 開工前：讀取 0193 sealed duration/check report、0182-0184 sealed summaries 與 coverage gaps；若 validator duration 或 identity 不可比較，只能用宣告成本，禁止自動 cache/ordering 優化。
- 實作中：可依實測 p50/p95、cache hit/miss、fan-out coverage 與 dropped/malformed 調整 validator ordering 或 cache bypass；若任何安全 key 不完整、failure 被 cache、或資料顯示 cache 反而增加風險，停止並提出是否拆卡或改 acceptance criteria。
- 收口前：封存 M1 數據 v1.0，產出 `dataDrivenDecision`、cohort manifest、optimization candidate/rollback/config digest，並明確標示 0186 開工前是否可做 M1-informed treatment。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/validator-dag-shared-cache.test.ts
npm run typecheck
npm run validate:cli
```

## ROLLBACK_HINT

停用 cache/telemetry ordering，回到宣告成本與逐項執行；保留 M1 seal。

## 執行步驟

1. 建安全 cache key 與 DAG/fan-out。
2. 接入 sealed report，保存每次 planner input digest 與 fallback 理由。
3. 以固定 watermark 產生 M1 cohort；不可比較時明示 inconclusive。

cache miss、unsafe cache 與 bypass 是正常 planner decision；只有命令實際失敗才重用 `ATM_VALIDATOR_FAILED`。
