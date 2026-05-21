---
doc_id: doc_other_0157
task_id: TASK-MRP-0017
title: Atom 退役流程（behavior.retire）
milestone: M17
status: done
started_at: 2026-05-21T08:45:00Z
started_by_agent: ClaudeCode_haiku-4.5
completed_at: 2026-05-21T09:00:00Z
blocked_by: [TASK-MRP-0010]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
lastTransitionId: 2026-05-21T10-29-44-338Z-migrate-legacy-ledger-552cfe385850
lastTransitionAt: 2026-05-21T10:29:44.338Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.338Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:3a968182e4ec0e43e1e0be5219e76c242b11c0f67c7cb6fd1f9a194feaa2e11c
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

## 2026-05-21 v2-r2 審查補充

- 退役前必須確認 active downstream reference 為 0；包含 map.spec、map:cid、capsule registry 與 consumer adapter reference。
- `legacy-retired` 是 registry 狀態，不代表刪除 source-of-truth 或 git history。
- 若 M18/M21 capsule 仍引用該 atom，退役 proposal 必須 blocked 並回報 routeHint。
- Retirement proof 需可被 M26 rescue police 與 M27 recovery report 驗證。

新增驗收：
- [ ] active downstream reference 不為 0 時 retire blocked
- [ ] capsule/map reference 未解除時 retire blocked
- [ ] retirement-proof 可被 rescue police 驗證
- [ ] registry 保留 `legacy-retired` 記錄與 lineage ref

## Checklist

- [x] 三階段退役流程實作（deprecated → shadow-off → legacy-retired）
- [x] downstream 引用檢查（map-spec + capsule-registry）
- [x] retirement-proof 生成（atm.atomRetirementProof schema）
- [x] registry 狀態更新（legacy-retired 保留 proofId + retiredAt）
- [ ] CHANGELOG 補記

## notes

core/upgrade/behaviors/retire.ts. proposeRetire blocks on active downstream refs.
applyRetire writes to atomic-registry.json + .atm/history/retirement-proofs/ +
appends lineage event. Compatible with M26 rescue police verification.
