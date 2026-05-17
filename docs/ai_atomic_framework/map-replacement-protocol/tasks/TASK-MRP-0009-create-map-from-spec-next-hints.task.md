---
doc_id: doc_other_0143
task_id: TASK-MRP-0009
title: Create Map From Spec + Replacement Next Hints
milestone: M9
status: pending
blocked_by: [TASK-MRP-0002]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0009 — Create Map From Spec + Replacement Next Hints

## 目標

補齊計畫書 §6.1 明確優先要求的 `create-map --spec <path>` deterministic artifact 入口，並讓 replacement 相關 CLI 的 JSON output 能提供下一步建議。這張卡只做 CLI / JSON contract 層，不引入 slash command runtime。

## 前置依賴

- TASK-MRP-0002

## 輸入

- 計畫書 §6.1、§11、§17.5
- `schemas/registry/atomic-map.schema.json`
- `packages/cli/src/commands/create-map.ts`
- `packages/core/src/manager/map-generator.ts`
- 既有 `node atm.mjs next --json` routing contract

## 輸出

1. CLI：`create-map --spec <path>`
   - 讀取完整 draft map spec
   - 先跑 schema 驗證，再建立 canonical map workspace
   - invalid spec 回傳非零 exit code 與 `ATM_MAP_SPEC_INVALID`
2. 0.1.0 / 0.2.0 雙版本 smoke：
   - 0.1.0 map spec 可建立
   - 0.2.0 replacement map spec 可建立且不丟 `replacement.*`
3. replacement 相關 CLI JSON output 加入 `nextActionHint` 或同等欄位：
   - `create-map --spec` 完成後指向 `test --map`
   - equivalence report 完成後指向 upgrade proposal 或 lane transition
   - blocked gate 指向缺失 evidence 的 deterministic command
4. Windows PowerShell 空白路徑 smoke，確認 `--spec` 路徑含空白時可用。

## 驗收條件

- [ ] valid 0.1.0 spec 生成 canonical map workspace
- [ ] valid 0.2.0 replacement spec 生成 canonical map workspace，registry entry 保留 replacement 欄位
- [ ] invalid spec 回傳非零 exit code 與 `ATM_MAP_SPEC_INVALID`
- [ ] `--help` 列出 `--spec <path>` 並說明與既有 JSON input 的關係
- [ ] JSON output 至少含一個可機器讀取的 `nextActionHint`
- [ ] Windows PowerShell 空白路徑 smoke 通過

## 影響檔案

- `packages/cli/src/commands/create-map.ts`
- `packages/core/src/manager/map-generator.ts`
- `tests/cli/create-map-from-spec.test.ts`
- `tests/schema-fixtures/positive/atomic-map-0.2-replacement.json`
- `docs/MAP_REPLACEMENT_PROTOCOL.md`（若需補 CLI usage，一律英文）

## 回滾策略

- 移除 `--spec` 旗標與 nextActionHint 輸出；既有 `create-map` JSON 字串入口保持不變。

## Checklist

- [ ] `--spec` 旗標完成
- [ ] schema validate / error code 完成
- [ ] 0.1.0 / 0.2.0 smoke 完成
- [ ] nextActionHint contract 完成
- [ ] Windows path smoke 完成
- [ ] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: pending | 驗證: pending | 變更: 由任務覆蓋性盤點補開，補齊 `create-map --spec` 與 replacement next hints 缺口 | 阻塞: TASK-MRP-0002