---
doc_id: doc_other_0141
task_id: TASK-MRP-0007
title: Decomposition Plan → Map
milestone: M7
status: done
blocked_by: [TASK-MRP-0002, TASK-MRP-0006]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-17T20:39:07.4267792+08:00
started_by_agent: vs-insiders-gpt-5.4
completed_at: 2026-05-17T20:48:50.9607822+08:00
completed_by_agent: vs-insiders-gpt-5.4
lastTransitionId: 2026-05-21T10-29-44-327Z-migrate-legacy-ledger-0cedde1511bf
lastTransitionAt: 2026-05-21T10:29:44.327Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.327Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:748d828cbd93e72211e5fe7278e6144db87881d75e8542f47f10cd4e89c8a1ea
---

# TASK-MRP-0007 — Decomposition Plan → Map

## 目標

引入 `decomposition-plan.schema.json` 與 `create-map --from-plan`，讓「大功能 → atoms + map」的拆解產物是 deterministic 且強制聲明替代目標的 plan，而不是散落的 atom 群。這是目標 A「拆解後不留下孤立 atom」的入口閘門。

## 前置依賴

- TASK-MRP-0002
- TASK-MRP-0006
- TASK-MRP-0009

## 輸入

- 計畫書 §14.1、§6.1
- 既有 `packages/core/src/registry/map-generator.ts`
- TASK-MRP-0002 完成的 0.2.0 schema
- TASK-MRP-0009 完成的 `create-map --spec` deterministic artifact 入口

## 輸出

1. 新檔：`schemas/governance/decomposition-plan.schema.json`
   - 欄位：`legacyUris[]` / `proposedMapId` / `proposedMembers[]` / `proposedEdges[]` / `entrypoints[]` / `notes`
2. CLI：`create-map --from-plan <path>`
   - 缺 `legacyUris` 或 `proposedMapId` 時 hard-fail，error code `ATM_DECOMP_PLAN_INVALID`
   - 自動把 `legacyUris` 寫入新 map 的 `replacement.legacyUris`
3. 示範 plan：`samples/checkout-mini.plan.json`
4. End-to-end smoke：plan → create-map → test --map → equivalence runner → upgrade gate → replacement-lane transition。若 TASK-MRP-0010 已完成，smoke 必須同時驗證 active evidence closure。

## 驗收條件

- [x] schema 通過 AJV
- [x] CLI 對 valid plan 生成 0.2.0 map
- [x] CLI 對 invalid plan 回非零 exit 並輸出 ATM_DECOMP_PLAN_INVALID
- [x] 示範 plan 走完 e2e smoke
- [x] map registry entry 包含 `replacement.legacyUris`
- [x] plan 產生的 draft map 可再由 `create-map --spec` 路徑 round-trip

## 影響檔案

- `schemas/governance/decomposition-plan.schema.json`
- `packages/cli/src/commands/create-map.ts`
- `packages/core/src/registry/decomposition-plan.ts`（新）
- `samples/checkout-mini.plan.json`
- `tests/cli/create-map-from-plan.test.ts`

## 回滾策略

- 移除 `--from-plan` 旗標與 schema；既有 `create-map` JSON 入口保持不變。

## Checklist

- [x] schema 完成
- [x] CLI 旗標完成
- [x] sample plan 完成
- [x] e2e smoke 綠
- [x] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: done | 驗證: create-map-from-plan.test.ts / create-map.test.ts / validate-schemas.ts --mode validate pass | 變更: 新增 `atm.decompositionPlan` schema、`packages/core/src/registry/decomposition-plan.ts`、`create-map --from-plan`、sample `samples/checkout-mini.plan.json`，並補最小 `create-map --spec` round-trip slice 供 M7 smoke 使用 | 阻塞: none
