---
doc_id: doc_other_0160
task_id: TASK-MRP-0020
title: Shadow 模式 A/B 定量比對報告
milestone: M20
status: planned
blocked_by: [TASK-MRP-0010]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
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

## Checklist

- [ ] shadow comparator 實作（timing / memory / output hash）
- [ ] divergence 記錄格式
- [ ] promotionRecommendation 計算邏輯
- [ ] schema 定義完成
- [ ] CLI flag 整合
- [ ] TASK-MRP-0013 介面對齊
- [ ] CHANGELOG 補記
