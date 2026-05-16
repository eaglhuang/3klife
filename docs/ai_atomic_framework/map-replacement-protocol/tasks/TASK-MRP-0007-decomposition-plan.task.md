---
doc_id: doc_other_0141
task_id: TASK-MRP-0007
title: Decomposition Plan → Map
milestone: M7
status: pending
blocked_by: [TASK-MRP-0002, TASK-MRP-0006]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0007 — Decomposition Plan → Map

## 目標

引入 `decomposition-plan.schema.json` 與 `create-map --from-plan`，讓「大功能 → atoms + map」的拆解產物是 deterministic 且強制聲明替代目標的 plan，而不是散落的 atom 群。這是目標 A「拆解後不留下孤立 atom」的入口閘門。

## 前置依賴

- TASK-MRP-0002
- TASK-MRP-0006

## 輸入

- 計畫書 §14.1、§6.1
- 既有 `packages/core/src/registry/map-generator.ts`
- TASK-MRP-0002 完成的 0.2.0 schema

## 輸出

1. 新檔：`schemas/governance/decomposition-plan.schema.json`
   - 欄位：`legacyUris[]` / `proposedMapId` / `proposedMembers[]` / `proposedEdges[]` / `entrypoints[]` / `notes`
2. CLI：`create-map --from-plan <path>`
   - 缺 `legacyUris` 或 `proposedMapId` 時 hard-fail，error code `ATM_DECOMP_PLAN_INVALID`
   - 自動把 `legacyUris` 寫入新 map 的 `replacement.legacyUris`
3. 示範 plan：`samples/checkout-mini.plan.json`
4. End-to-end smoke：plan → create-map → test --map → equivalence runner → upgrade gate → replacement-lane transition

## 驗收條件

- [ ] schema 通過 AJV
- [ ] CLI 對 valid plan 生成 0.2.0 map
- [ ] CLI 對 invalid plan 回非零 exit 並輸出 ATM_DECOMP_PLAN_INVALID
- [ ] 示範 plan 走完 e2e smoke
- [ ] map registry entry 包含 `replacement.legacyUris`

## 影響檔案

- `schemas/governance/decomposition-plan.schema.json`
- `packages/cli/src/commands/create-map.ts`
- `packages/core/src/registry/decomposition-plan.ts`（新）
- `samples/checkout-mini.plan.json`
- `tests/cli/create-map-from-plan.test.ts`

## 回滾策略

- 移除 `--from-plan` 旗標與 schema；既有 `create-map` JSON 入口保持不變。

## Checklist

- [ ] schema 完成
- [ ] CLI 旗標完成
- [ ] sample plan 完成
- [ ] e2e smoke 綠
- [ ] CHANGELOG 補一句
