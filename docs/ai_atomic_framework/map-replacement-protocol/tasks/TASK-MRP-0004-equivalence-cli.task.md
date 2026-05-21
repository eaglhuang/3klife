---
doc_id: doc_other_0138
task_id: TASK-MRP-0004
title: Map Equivalence Test CLI
milestone: M4
status: done
blocked_by: [TASK-MRP-0003]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-17T14:07:27.5766827+08:00
started_by_agent: vs-insiders-github-copilot
completed_at: 2026-05-17T14:07:27.5766827+08:00
completed_by_agent: vs-insiders-github-copilot
lastTransitionId: 2026-05-21T10-29-44-324Z-migrate-legacy-ledger-4a18d7aac083
lastTransitionAt: 2026-05-21T10:29:44.324Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.324Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:7205ff9f0fe394c6d6c9139fb99601e3907f660330ac997e0f483558b5acf7e2
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
2. Runner：讀 fixtures → 分別呼叫 `mapExecutor` 與 `legacyExecutor` → 比對 → 寫報告；`legacyUris` 由 map spec 的 `replacement.legacyUris` 提供 lineage/evidence 來源。
3. `case.passed=false` 且未列入 `knownDivergences` → CLI exit code ≠ 0。
4. 報告檔案路徑：`atomic_workbench/maps/<mapId>/map.equivalence.report.json`。

## 驗收條件

- [x] 對 sample map（建議 checkout-mini）跑通 happy path
- [x] 對 negative fixture 跑出 `passed:false` 且 exit code = 1
- [x] `knownDivergences` 允許列舉時 exit code = 0
- [x] `--help` 列出新旗標與互斥規則
- [x] 報告通過 `atm spec --validate`

## 影響檔案

- `packages/cli/src/commands/test.ts`
- `packages/core/src/equivalence/run-map-equivalence.ts`（新）
- `tests/cli/test-map-equivalence.test.ts`
- `CHANGELOG.md`
- `atomic_workbench/maps/<mapId>/map.equivalence.report.json`（runtime generated artifact）

## 回滾策略

- 撤回 CLI 旗標；保留 runner 模組為內部 API 不影響穩定 CLI 介面。

## Checklist

- [x] CLI 旗標 + mutual exclusion
- [x] runner 實作
- [x] exit code 行為
- [x] sample 報告落地
- [x] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: done | 驗證: test-map-equivalence.test.ts / test-map.test.ts / map-equivalence-report.test.ts / validate-schemas.ts --mode validate pass | 變更: 新增 delegated `run-map-equivalence` runner、`test --map --equivalence-fixtures` CLI 分支、known divergence gate、canonical report output 與 CLI acceptance coverage | 阻塞: none
