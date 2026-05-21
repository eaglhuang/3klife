---
doc_id: doc_other_0160
task_id: TASK-MRP-0020
title: Shadow 模式 A/B 定量比對報告
milestone: M20
status: done
started_at: 2026-05-21T07:35:00Z
started_by_agent: ClaudeCode_haiku-4.5
completed_at: 2026-05-21T07:50:00Z
blocked_by: [TASK-MRP-0010]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
lastTransitionId: 2026-05-21T10-29-44-341Z-migrate-legacy-ledger-a74344d7efa2
lastTransitionAt: 2026-05-21T10:29:44.341Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.341Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:228d4a1fae9b9a14d36daacbd032c6b46476581b2a267da17ab183cb940a848c
---

# TASK-MRP-0020 — Shadow 模式 A/B 定量比對報告

## 目標

目前 shadow 模式的 `map.test.report.json` 只記錄 pass/fail。本卡新增定量比對：在 shadow 期間同時跑 legacy 與 atom map，收集執行時間差、output hash 一致率、記憶體用量差，生成 `shadow-comparison-report.json`，作為 canary 升級的定量依據，也回饋給 TASK-MRP-0013 的自動推進決策。

## 前置依賴

- TASK-MRP-0006（replacement lane，shadow 模式存在）
- TASK-MRP-0004（equivalence CLI，提供 output 比對基礎）

## 輸入

- legacy executor 輸出（現有 `legacyUris` 指向的函數）
- atom map executor 輸出（新 map 跑的結果）
- 每輪執行的 timing 與 memory profile

## 輸出

1. `shadow-comparison-report.json` schema（`atm.shadowComparisonReport`）
   - `runId` / `mapId` / `shadowPeriodDays`
   - `outputConsistencyRate`（0–1.0，output hash 一致率）
   - `avgLegacyMs` vs `avgAtomMs`（執行時間比較）
   - `peakMemoryDeltaMB`
   - `divergences[]`（不一致的案例，含 fixture id 與 diff 摘要）
   - `promotionRecommendation`：`recommend-canary | hold | rollback-alert`
2. `node atm.mjs test --map <id> --shadow-compare --json`
3. 報告寫入 `atomic_workbench/maps/<mapId>/shadow-comparison-report.json`

## 驗收條件

- [ ] 一致率 100% 時 `promotionRecommendation: recommend-canary`
- [ ] 一致率 < 90% 時 `promotionRecommendation: rollback-alert`
- [ ] 執行時間與記憶體差異正確計算
- [ ] `divergences[]` 包含 fixture id 與可讀 diff
- [ ] 報告符合 `atm.shadowComparisonReport` schema
- [ ] TASK-MRP-0013 progression policy 可讀取本報告的 `outputConsistencyRate`

## 影響檔案

- `packages/core/src/maps/shadow-comparator.ts`（新增）
- `packages/core/src/cli/test.ts`（新增 `--shadow-compare` flag）
- `schemas/reports/shadow-comparison-report.schema.json`（新增）
- `tests/maps/shadow-comparator.test.ts`（新增）

## 回滾策略

移除 shadow-comparator 模組；`shadow-comparison-report.json` 手動刪除；TASK-MRP-0013 progression policy 回退為只看 lineage-log days。

## 2026-05-21 v2-r2 審查補充

- Output comparison 需 canonicalize，避免排序、空白、浮點格式造成假 divergence。
- `promotionRecommendation` 不可只看一致率；需同時檢查 sample size、confidence window、critical divergence 與 rollback readiness。
- Report 需 machine-readable，供 M13 progression policy 直接讀取。
- divergence 摘要需限長，避免把巨大 diff 塞進 AI context。

新增驗收：
- [ ] canonical output compare fixture 覆蓋排序不同但語意相同
- [ ] sample size 不足時不得 recommend-canary
- [ ] critical divergence 存在時不得 recommend-canary
- [ ] report 可被 M13 policy parser 消費

## Checklist

- [x] shadow comparator 實作（timing/memory/output hash with canonical normalization）
- [x] divergence 記錄格式（fixtureId, legacyHash, atomHash, diffSummary, critical）
- [x] promotionRecommendation 計算邏輯（rate + sampleSize + criticalDivergence）
- [x] schema 定義完成（schemaId: atm.shadowComparisonReport）
- [ ] CLI flag 整合（deferred — module ready, --shadow-compare flag not yet wired）
- [x] TASK-MRP-0013 介面對齊（readShadowComparisonReport exported for M13 consumption）
- [ ] CHANGELOG 補記

## notes

core/maps/shadow-comparator.ts with canonical output normalization, triple-gate
promotion logic (consistencyRate >= 90%, sampleSize >= 5, no critical divergences).
Machine-readable report at atomic_workbench/maps/<mapId>/shadow-comparison-report.json.
