---
task_id: ATM-GOV-0190
title: Real Paired A/B、Analyzer v3 與 Rollout Verdict
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0189
  - ATM-GOV-0195
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
completed_at: "2026-07-19T14:40:09.624Z"
completed_by_agent: "codex-governance-optimizer"
closedAt: "2026-07-19T14:40:09.624Z"
closedByActor: "codex-governance-optimizer"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-19T14-40-09-509Z-close-df4a5f5a3489"
lastTransitionAt: "2026-07-19T14:40:09.624Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ffdbb13b8daee730095617fe03b75e63d854500a"
---

# ATM-GOV-0190 - Real Paired A/B、Analyzer v3 與 Rollout Verdict

## 問題描述

以 lane/ticket/report/receipt/commit/checkpoint/provider usage 與 sealed gate history join 真實 control/treatment，證明哪些治理步驟有效、重複或無法判定。

## INPUT_CONTRACT

- 0193+0182-0189 sealed history、0195 coverage/M2 preflight report、M1 cohort/optimization receipts、historical incidents、shadow/parity samples 與 provider usage。

## OUTPUT_CONTRACT

- `atm.planPerformanceReport.v1`、matched cohorts、四維 rollout verdict、per-check effectiveness/retirement proposal 與 telemetry self-governance receipt。

## Telemetry Contract

- Produces：matched A/B、broker correctness/compose effectiveness、historical replay、shadow false-positive/latency、canonical evaluator parity、unique block/true-positive/evidence-readback verdict。
- Consumes：正式證據只讀 digest-only sealed history、0193 registry coverage report 與 0195 M2 preflight report；角色為 M2 analyzer，不得用 `--include-runtime` 作 Git-tracked 正式證據。若需要本機重算，可讀 gitignored runtime archive，但 raw log/counter/event stream 不提交。任何 `not-yet-covered` 節點都必須在 verdict 中列為 coverage limitation，不能把缺事件解讀為零成本、零阻擋或無效。
- Broker analyzer 必須輸出 parallel admission rate、conflict detection precision/recall、compose acceptance/rollback/escape、false-positive/false-negative conflict、manual override、decision latency 與 waitedMs saved；無 correctness verdict 或缺 outcomeRef 時該 broker 結論為 `inconclusive`。
- 以 correlation/reason 去重；true positive 必須有 classification/resolution/incident ref。資料缺漏、去重失敗或 cohort 不可比一律 `inconclusive`。
- Kill criteria：eligible >=500，或完整 >=4 週且覆蓋合理觸發機會，仍零 unique block/true positive/evidence readback/escaped incident，才提降頻/合併/退場；低頻安全 check 另做 replay 與 owner 裁決。
- 若 telemetry 未驅動任何實際決策，提出縮減 detail/採樣率；保留 meta-health、sealed digest、retirement/rollback receipt。

## 交付物

- Analyzer/report、matched replay/dogfood harness、retirement proposal 與 telemetry self-review。

## 以戰養戰決策點

- 開工前：讀取 0193+0182-0189 全部 sealed summaries、0195 coverage/M2 preflight report、M1 cohort/optimization receipts、coverage report、historical incidents 與 treatment config digest；若 0195 verdict 不是 `ready`，本卡不得宣稱 M2 因果或裁汰成立，只能輸出 `inconclusive` 或停下請 owner 裁決。任何缺關鍵 join key、coverage gap 或 cohort 不可比，都必須在 verdict 中列 limitation，不能補成零成本/零阻擋。
- 實作中：依 broker correctness/compose effectiveness、歷史事故 replay、shadow false-positive/latency、canonical evaluator parity 與 matched A/B 實際結果，重新評估 gate/broker policy 是否保留、降頻、合併、重排、compose 或撤回先前優化；若結果足以推翻 2.0 任務假設，停止 rollout，提出 plan/task revision 給 owner。
- 收口前：產出最終 `dataDrivenDecision`、rollout verdict、frequency-aware retirement proposal、telemetry self-governance receipt 與下一輪 config digest；`inconclusive` 是合法結論，不得包裝成成功。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/real-paired-ab-analyzer-v3.test.ts
npm run typecheck
npm run validate:cli
```

## ROLLBACK_HINT

保持 rollout disabled，revert default/analyzer changes；保留 digest-only cohort summary 與 verdict receipts。raw cohort/event/log 僅留本機 gitignored runtime archive，不進 Git。

## 執行步驟

1. 固定 cohort matcher、dedupe 與 missing-data rules。
2. 依序跑 historical replay、shadow、evaluator parity、AB/BA paired dogfood。
3. 分開輸出 speed/cost/safety/batching 與 gate effectiveness，owner 裁決後才 rollout/retire。

本卡不新增 ErrorCode。`improved`、`inconclusive`、`regressed` 與缺某一維樣本都是 report verdict；任一實際 runtime failure 必須重用其來源階段已登錄的代碼，不建立 analyzer 私有码。
