---
doc_id: doc_other_0152
task_id: TASK-MRP-0012
title: Map Edge Contract 自動合約測試
milestone: M12
status: planned
blocked_by: [TASK-MRP-0011]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0012 — Map Edge Contract 自動合約測試

## 目標

Map 的每條 edge（例如 `ATM-NPCBRAIN-0002 → ATM-NPCBRAIN-0003`，binding=`external-summary`）應有自動生成的 contract test，驗證上游 atom 的 output schema 確實符合下游 atom 的 input 期望。任何 atom 改動觸發對應 edge 的 contract test，不需跑全系統整合測試。

## 前置依賴

- TASK-MRP-0003（map-equivalence-report schema）
- TASK-MRP-0011

## 輸入

- `map.spec.json` 中的 `edges[]`（含 `binding` 名稱與 `edgeKind`）
- 每個 atom 的 output/input schema（從 atom spec 或 TypeScript type 推導）

## 輸出

1. `node atm.mjs test --map <id> --edge-contracts --json`
   - 針對每條 edge 執行 binding schema 驗證
   - 回傳 `edgeContractResults[]`，含 edge id / binding / passed / failReason
2. 自動產生的 edge contract fixture 存放於 `atomic_workbench/maps/<mapId>/edge-contracts/`
3. 新增 `binding-schema-registry.json`：記錄每個 binding 名稱對應的 schema 路徑

## 驗收條件

- [ ] 正常 binding schema 一致時全部 edge 通過
- [ ] 上游 atom output 缺少必要欄位時對應 edge contract 失敗
- [ ] `edge-contracts/` 目錄在首次執行後自動建立
- [ ] CI 在 atom 檔案改動時自動觸發對應 edge contract tests（非全 map）

## 影響檔案

- `packages/core/src/maps/edge-contract-runner.ts`（新增）
- `packages/core/src/cli/test.ts`（新增 `--edge-contracts` flag）
- `schemas/governance/binding-schema-registry.schema.json`（新增）
- `tests/maps/edge-contract.test.ts`（新增）

## 回滾策略

移除 `--edge-contracts` flag 與 `edge-contract-runner.ts`；`binding-schema-registry.json` 可選保留。

## Checklist

- [ ] edge contract runner 實作完成
- [ ] binding schema registry schema 定義
- [ ] CLI flag 整合
- [ ] CI 選擇性觸發邏輯（只跑受影響 edge）
- [ ] CHANGELOG 補記
