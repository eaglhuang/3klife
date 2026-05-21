---
doc_id: doc_other_0157
task_id: TASK-MRP-0017
title: Atom 退役流程（behavior.retire）
milestone: M17
status: planned
blocked_by: [TASK-MRP-0010]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0017 — Atom 退役流程（behavior.retire）

## 目標

Legacy 代碼被 atom map 完全取代後，舊 atom 或已不再使用的 atom 缺少受控的下線流程。本卡新增 `behavior.retire`：從標記 deprecated → 等待無流量確認 → 生成 retirement-proof → 從 map.spec.json 正式移除。

## 設計原則

- 退役分三階段：`deprecated` → `shadow-off`（確認無引用）→ `legacy-retired`
- 退役不等於刪除：代碼仍在 git history；registry 保留 `legacy-retired` 記錄
- retirement-proof 復用 TASK-MRP-0010 定義的 `atm.retirementProof` schema
- 強制通過：所有引用此 atom 的 downstream map 已更新或也已退役

## 前置依賴

- TASK-MRP-0010（retirement-proof schema）
- TASK-MRP-0016（reshape 可觸發退役）

## 輸入

- 待退役 atom ID
- `atomic-registry.json`（確認無 active downstream 引用）
- shadow 期間流量記錄（確認真的無引用）

## 輸出

1. `node atm.mjs upgrade --propose --behavior behavior.retire --atom <id> --json`
2. retirement-proof JSON（符合 `atm.retirementProof` schema）
3. registry 中 atom status 更新為 `legacy-retired`
4. `lineage-log.json` 記錄退役事件與 retirement-proof ref

## 驗收條件

- [ ] 有 active downstream 引用時退役被擋
- [ ] shadow-off 確認後可進入 legacy-retired
- [ ] retirement-proof 符合既有 schema
- [ ] registry 記錄 legacy-retired 而非刪除
- [ ] 正負 fixtures 各一

## 影響檔案

- `packages/core/src/upgrade/behaviors/retire.ts`（新增）
- `packages/core/src/cli/upgrade.ts`（新增 `behavior.retire` handler）
- `packages/core/src/registry/replacement-lane.ts`（新增 shadow-off 判斷）
- `tests/upgrade/retire.test.ts`（新增）

## 回滾策略

registry 中 legacy-retired atom 重新標回 deprecated；lineage-log 不可回退（記錄保留）。

## Checklist

- [ ] 三階段退役流程實作
- [ ] downstream 引用檢查
- [ ] retirement-proof 生成
- [ ] registry 狀態更新
- [ ] CHANGELOG 補記
