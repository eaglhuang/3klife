---
task_id: ATM-GOV-0190
title: Real Paired A/B、Analyzer v3 與 Rollout Verdict
status: planned
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0189
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: auto-batch 的真實效能與 rollout 證明是 ATM-GOV 計畫終點，配置 0190。
scopePaths:
  - scripts/analyze-captain-parallel-ledger.ts
  - packages/cli/src/commands/batch/**
  - scripts/fixtures/auto-batch-analyzer/**
  - docs/reports/captain-parallel-ledger-analysis.md
  - tests/cli/real-paired-ab-analyzer-v3.test.ts
deliverables:
  - atm.planPerformanceReport.v1 analyzer v3
  - deterministic replay、prospective paired dogfood 與 rollout verdict
  - gate effectiveness 四法驗證、frequency-aware retirement 與 telemetry self-governance receipt
validators:
  - node --strip-types tests/cli/real-paired-ab-analyzer-v3.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: keep rollout disabled and revert analyzer/default changes
errorCodes: []
atomizationImpact:
  ownerAtomOrMap: atm.plan-performance-analyzer
  mapUpdates: []
  extractionCandidates:
    - atom: atm.plan-performance-analyzer
      pattern: Analyzer
      source: scripts/analyze-captain-parallel-ledger.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: performance-evidence
---

# ATM-GOV-0190 - Real Paired A/B、Analyzer v3 與 Rollout Verdict

## 問題描述

以 lane/ticket/report/receipt/commit/checkpoint/provider usage 與 sealed gate history join 真實 control/treatment，證明哪些治理步驟有效、重複或無法判定。

## INPUT_CONTRACT

- 0193+0182-0189 sealed history、M1 cohort/optimization receipts、historical incidents、shadow/parity samples 與 provider usage。

## OUTPUT_CONTRACT

- `atm.planPerformanceReport.v1`、matched cohorts、四維 rollout verdict、per-check effectiveness/retirement proposal 與 telemetry self-governance receipt。

## Telemetry Contract

- Produces：matched A/B、historical replay、shadow false-positive/latency、canonical evaluator parity、unique block/true-positive/evidence-readback verdict。
- Consumes：只讀 sealed history 與 0193 registry coverage report；角色為 M2 analyzer，不得用 `--include-runtime` 作正式證據。任何 `not-yet-covered` 節點都必須在 verdict 中列為 coverage limitation，不能把缺事件解讀為零成本、零阻擋或無效。
- 以 correlation/reason 去重；true positive 必須有 classification/resolution/incident ref。資料缺漏、去重失敗或 cohort 不可比一律 `inconclusive`。
- Kill criteria：eligible >=500，或完整 >=4 週且覆蓋合理觸發機會，仍零 unique block/true positive/evidence readback/escaped incident，才提降頻/合併/退場；低頻安全 check 另做 replay 與 owner 裁決。
- 若 telemetry 未驅動任何實際決策，提出縮減 detail/採樣率；保留 meta-health、sealed digest、retirement/rollback receipt。

## 交付物

- Analyzer/report、matched replay/dogfood harness、retirement proposal 與 telemetry self-review。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/real-paired-ab-analyzer-v3.test.ts
npm run typecheck
npm run validate:cli
```

## ROLLBACK_HINT

保持 rollout disabled，revert default/analyzer changes；保留 raw sealed cohorts 與 verdict receipts。

## 執行步驟

1. 固定 cohort matcher、dedupe 與 missing-data rules。
2. 依序跑 historical replay、shadow、evaluator parity、AB/BA paired dogfood。
3. 分開輸出 speed/cost/safety/batching 與 gate effectiveness，owner 裁決後才 rollout/retire。

本卡不新增 ErrorCode。`improved`、`inconclusive`、`regressed` 與缺某一維樣本都是 report verdict；任一實際 runtime failure 必須重用其來源階段已登錄的代碼，不建立 analyzer 私有码。
