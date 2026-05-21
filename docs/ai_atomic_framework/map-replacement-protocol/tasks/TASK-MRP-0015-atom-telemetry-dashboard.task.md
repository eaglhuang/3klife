---
doc_id: doc_other_0155
task_id: TASK-MRP-0015
title: Atom Telemetry 健康儀表板
milestone: M15
status: planned
blocked_by: [TASK-MRP-0011]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0015 — Atom Telemetry 健康儀表板

## 目標

每次 map 跑完後，自動記錄每個 atom 的執行時間、police violation 次數、edit 頻率（git log 統計）與 output schema drift rate。產生 `map-health-report.json`，讓下一個 Agent 進入 repo 時立即知道哪個 atom 是瓶頸、哪個最不穩定、哪個最常改動。

## 前置依賴

- TASK-MRP-0011（fingerprint 監控，提供 drift 資料）
- TASK-MRP-0012（edge contract，提供 schema 穩定性資料）

## 輸入

- map 執行 trace（每個 atom 的 start/end timestamp）
- `atm police --json` 輸出（police violation 記錄）
- `git log --follow` 統計各 atom 相關檔案改動次數

## 輸出

1. `map-health-report.json` schema（`atm.mapHealthReport`）
   - 欄位：`mapId` / `generatedAt` / `atoms[]`
   - `atoms[].atomId` / `.avgExecutionMs` / `.policeViolations` / `.editFrequency` / `.schemaDriftRate`
   - `hotspots`（執行最慢、最常違規、最常修改各 Top 3）
2. `node atm.mjs atm-chart --map <id> --health --json`（產生報告）
3. `node atm.mjs atm-chart --map <id> --health --render`（終端機 ASCII 表格輸出）

## 驗收條件

- [ ] 每個 atom 都有四個指標欄位
- [ ] hotspots 正確識別 Top 3（各維度）
- [ ] schema 通過 AJV 驗證
- [ ] `--render` 模式輸出可讀表格（不依賴瀏覽器）
- [ ] 報告寫入 `atomic_workbench/maps/<mapId>/map-health-report.json`

## 影響檔案

- `packages/core/src/maps/health-reporter.ts`（新增）
- `packages/core/src/cli/atm-chart.ts`（新增 `--health` flag）
- `schemas/reports/map-health-report.schema.json`（新增）
- `tests/maps/health-reporter.test.ts`（新增）

## 回滾策略

移除 health-reporter 模組；刪除 `map-health-report.json`；CLI flag 移除。

## Checklist

- [ ] 四個指標收集邏輯實作
- [ ] hotspot 計算邏輯
- [ ] schema 定義完成
- [ ] ASCII 渲染輸出
- [ ] CHANGELOG 補記
