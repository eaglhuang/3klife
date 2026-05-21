---
doc_id: doc_other_0142
task_id: TASK-MRP-0008
title: ScopeLock 0.2.0 + Polymorph Impact
milestone: M8
status: done
blocked_by: [TASK-MRP-0006]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-17T21:14:09.1021640+08:00
started_by_agent: vs-insiders-gpt-5.4
completed_at: 2026-05-17T21:26:39.0106386+08:00
completed_by_agent: vs-insiders-gpt-5.4
lastTransitionId: 2026-05-21T10-29-44-328Z-migrate-legacy-ledger-c5781c99ddf6
lastTransitionAt: 2026-05-21T10:29:44.328Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.328Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:81535e36b7e58ec040ebfd845c5b2db14836736998f0ad8a64b1dd3bf93a0090
---

# TASK-MRP-0008 — ScopeLock 0.2.0 + Polymorph Impact

## 目標

把 ScopeLock 從「file-only」升級為「file + map-selector」，並補上 polymorph impact gate，讓 replacement map 在 active 之前能正確盤點受影響的 instance maps。此卡可延後到 M5/M6 全綠後再啟動。

## 前置依賴

- TASK-MRP-0006

## 輸入

- 計畫書 §8、§9
- `schemas/governance/scope-lock.schema.json`
- `packages/core/src/polymorph/template.ts`

## 輸出

1. ScopeLock schema 0.2.0：新增 `selectors`
   - `mapId` / `mapMembers[]` / `mapEdges[]` / `mapEntrypoints[]` / `legacyUris[]`
   - 0.1.0 lock round-trip 必須仍能載入
2. `ScopeLockRecord` 型別擴充
3. polymorph impact runner：
   - 對 replacement map 的 member atoms 掃描 template / instance 關係
   - 找出受影響 instance maps 並跑 propagation
   - 產出 `polymorph-impact-report.json`
4. upgrade gate：target = map 且要求 `active` 時，若 member atoms 命中 polymorph template，必須消費 polymorph-impact-report

## 驗收條件

- [x] 0.1.0 lock round-trip 綠
- [x] 0.2.0 lock 接受 map-selector
- [x] polymorph 掃描在 sample template/instance 上回報正確 instance set
- [x] 缺報告時 active gate 被擋
- [x] 報告通過 schema 驗證

## 影響檔案

- `schemas/governance/scope-lock.schema.json`
- `packages/core/src/governance/scope-lock.ts`
- `packages/core/src/polymorph/impact.ts`（新）
- `schemas/governance/polymorph-impact-report.schema.json`（新）
- `tests/governance/scope-lock-0.2.0.test.ts`
- `tests/polymorph/impact.test.ts`

## 回滾策略

- 將 0.2.0 selector 從 schema enum 移除；polymorph impact 模組降為 internal API。

## Checklist

- [x] scope-lock schema bump
- [x] selector 行為測試
- [x] polymorph impact runner
- [x] upgrade gate 整合
- [x] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: done | 驗證: scope-lock-0.2.0.test.ts / impact.test.ts / propose-map-equivalence.test.ts / propose-map-rollback.test.ts / validate-schemas.ts pass | 變更: `scope-lock` 升成 `0.1.0`+`0.2.0` dual-version schema，新增 `selectors` 與 `ScopeLockRecord` 對應 helper；新增 `atm.polymorphImpactReport` schema、sample report fixture、`packages/core/src/polymorph/impact.ts` 掃描/propagation runner，並讓 `upgrade --propose --replacement-mode active` 在 template-bound member maps 上要求 `--polymorph-impact-report` | 阻塞: none
