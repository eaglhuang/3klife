---
doc_id: doc_other_0138
task_id: TASK-MRP-0004
title: Map Equivalence Test CLI
milestone: M4
status: pending
blocked_by: [TASK-MRP-0003]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0004 — Map Equivalence Test CLI

## 目標

讓 `node atm.mjs test --map <id> --equivalence-fixtures <path> --json` 可執行；產出符合 `atm.mapEquivalenceReport` 的報告，並寫入 `atomic_workbench/maps/<id>/map.equivalence.report.json`。

## 前置依賴

- TASK-MRP-0003

## 輸入

- 計畫書 §6.3
- 既有 `packages/cli/src/commands/test.ts`
- TASK-MRP-0003 產生的 schema 與 fixtures

## 輸出

1. CLI 旗標 `--equivalence-fixtures <path>`：必須與 `--map` 搭配；與 `--propagate`、`--spec`、`--atom` 互斥。
2. Runner：讀 fixtures → 對 map executor 跑 → 對 legacy URI 收集既有結果 → 比對 → 寫報告。
3. `case.passed=false` 且未列入 `knownDivergences` → CLI exit code ≠ 0。
4. 報告檔案路徑：`atomic_workbench/maps/<mapId>/map.equivalence.report.json`。

## 驗收條件

- [ ] 對 sample map（建議 checkout-mini）跑通 happy path
- [ ] 對 negative fixture 跑出 `passed:false` 且 exit code = 1
- [ ] `knownDivergences` 允許列舉時 exit code = 0
- [ ] `--help` 列出新旗標與互斥規則
- [ ] 報告通過 `atm spec --validate`

## 影響檔案

- `packages/cli/src/commands/test.ts`
- `packages/core/src/equivalence/run-map-equivalence.ts`（新）
- `tests/cli/test-map-equivalence.test.ts`
- `atomic_workbench/maps/<sample>/map.equivalence.report.json`

## 回滾策略

- 撤回 CLI 旗標；保留 runner 模組為內部 API 不影響穩定 CLI 介面。

## Checklist

- [ ] CLI 旗標 + mutual exclusion
- [ ] runner 實作
- [ ] exit code 行為
- [ ] sample 報告落地
- [ ] CHANGELOG 補一句
