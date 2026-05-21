---
doc_id: doc_other_0143
task_id: TASK-MRP-0009
title: Create Map From Spec + Replacement Next Hints
milestone: M9
status: done
blocked_by: [TASK-MRP-0002]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-17T20:56:40.1303430+08:00
started_by_agent: vs-insiders-gpt-5.4
completed_at: 2026-05-17T21:02:56.9087336+08:00
completed_by_agent: vs-insiders-gpt-5.4
lastTransitionId: 2026-05-21T10-29-44-329Z-migrate-legacy-ledger-f8b39a738e43
lastTransitionAt: 2026-05-21T10:29:44.329Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.329Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:e2d0ac4bee568321826cec22faa574f6995621dc2d10acacf9866233e1025d24
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

- [x] valid 0.1.0 spec 生成 canonical map workspace
- [x] valid 0.2.0 replacement spec 生成 canonical map workspace，registry entry 保留 replacement 欄位
- [x] invalid spec 回傳非零 exit code 與 `ATM_MAP_SPEC_INVALID`
- [x] `--help` 列出 `--spec <path>` 並說明與既有 JSON input 的關係
- [x] JSON output 至少含一個可機器讀取的 `nextActionHint`
- [x] Windows PowerShell 空白路徑 smoke 通過

## 影響檔案

- `packages/cli/src/commands/create-map.ts`
- `packages/cli/src/commands/test.ts`
- `packages/cli/src/commands/upgrade.ts`
- `packages/cli/src/commands/spec-shared.ts`
- `packages/cli/src/commands/shared.ts`
- `packages/cli/src/commands/command-specs.ts`
- `tests/cli/create-map-from-spec.test.ts`
- `tests/schema-fixtures/positive/atomic-map-0.2-replacement.json`
- `docs/MAP_REPLACEMENT_PROTOCOL.md`（若需補 CLI usage，一律英文）

## 回滾策略

- 移除 `--spec` 旗標與 nextActionHint 輸出；既有 `create-map` JSON 字串入口保持不變。

## Checklist

- [x] `--spec` 旗標完成
- [x] schema validate / error code 完成
- [x] 0.1.0 / 0.2.0 smoke 完成
- [x] nextActionHint contract 完成
- [x] Windows path smoke 完成
- [x] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: done | 驗證: create-map-from-spec.test.ts / create-map.test.ts / create-map-from-plan.test.ts / validate-cli.ts pass | 變更: `create-map --spec` 改為先走 `atomic-map.schema.json` 驗證，補上 0.1.0 / 0.2.0 canonical map smoke、Windows PowerShell 空白路徑 smoke，並讓 `create-map` / `test --map` / `upgrade --propose` JSON output 帶 `nextActionHint` | 阻塞: none