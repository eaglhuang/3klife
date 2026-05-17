---
doc_id: doc_other_0140
task_id: TASK-MRP-0006
title: Replacement Lane Transition
milestone: M6
status: done
blocked_by: [TASK-MRP-0002]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-17T17:59:12.9966815+08:00
started_by_agent: vs-insiders-github-copilot
completed_at: 2026-05-17T18:04:26.6234416+08:00
completed_by_agent: vs-insiders-github-copilot
---

# TASK-MRP-0006 — Replacement Lane Transition

## 目標

把計畫書 §7 的 rollout lane（draft → shadow → canary → active → legacy-retired）落成可被 CLI 與 lineage 共同信任的 transition validator，並確保它與 registry status 互不自動同步。

## 前置依賴

- TASK-MRP-0002

## 輸入

- 計畫書 §7、§14.2
- 既有 `packages/core/src/registry/lineage-log.ts`（若已存在；否則需新增）

## 輸出

1. 新模組：`packages/core/src/registry/replacement-lane.ts`
   - 匯出 `ReplacementMode` enum
   - 匯出 `transitionReplacementMode(map, to, evidence)`
   - 違法轉移 throw `ATM_REPLACEMENT_TRANSITION_INVALID`
2. 轉移記錄寫入 `atomic_workbench/maps/<id>/lineage-log.json`，欄位與 MAP-0002 lineage 對齊，至少包含 `from` / `to` / `reason` / `evidenceRefs` / `actor` / `timestamp`
3. 新增 CLI 子命令：`atm replacement-lane transition --map <id> --to <mode> [--evidence <path>]`
4. 明確規則：registry status change 不會觸發 replacement.mode change，反向亦然

## 驗收條件

- [x] 合法五段轉移正向測試
- [x] 跳階轉移（draft → active）被擋
- [x] 缺 evidence 時被擋（active 與 legacy-retired）
- [x] lineage-log 寫入正確 ISO timestamp、actor、reason 與 evidenceRefs
- [x] registry status 改變不會自動改 replacement.mode

## 影響檔案

- `packages/core/src/registry/replacement-lane.ts`（新）
- `packages/cli/src/commands/replacement-lane.ts`（新）
- `tests/registry/replacement-lane.test.ts`
- `atomic_workbench/maps/<sample>/lineage-log.json`

## 回滾策略

- 移除新 CLI 命令並把 lane 模組降為 internal-only；現有 map 不受影響。

## Checklist

- [x] transition table 實作
- [x] lineage 寫入
- [x] CLI 子命令
- [x] 正反測試
- [x] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: done | 驗證: replacement-lane.test.ts pass（含 core transition + CLI help/command smoke） | 變更: 新增 `packages/core/src/registry/replacement-lane.ts`、`atm replacement-lane transition --map <id> --to <mode>`、lineage `transitions[]` 附加寫入，並以 focused test 驗證 forward chain / jump block / missing evidence / registry status independence | 阻塞: none
