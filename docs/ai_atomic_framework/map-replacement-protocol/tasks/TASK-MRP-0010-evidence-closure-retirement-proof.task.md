---
doc_id: doc_other_0144
task_id: TASK-MRP-0010
title: Replacement Evidence Closure + Retirement Proof
milestone: M10
status: pending
blocked_by: [TASK-MRP-0003, TASK-MRP-0004, TASK-MRP-0005, TASK-MRP-0006]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0010 — Replacement Evidence Closure + Retirement Proof

## 目標

補齊計畫書 §7 / §11 / §14.2 中 active 與 legacy-retired 所需的完整 evidence 閉環。TASK-MRP-0005 只建立 upgrade proposal 的基礎 equivalence / rollback gate；本卡負責 propagation、review-advisory、human review 與 retirement proof 的正式接入。

## 前置依賴

- TASK-MRP-0003
- TASK-MRP-0004
- TASK-MRP-0005
- TASK-MRP-0006

## 輸入

- 計畫書 §6.4、§6.5、§7、§11、§14.2、§17.5
- `schemas/governance/map-equivalence-report.schema.json`
- `schemas/governance/rollback-proof.schema.json`
- `packages/core/src/upgrade/propose.ts`
- `packages/core/src/registry/replacement-lane.ts`
- 既有 `test --propagate <atomId> --json` report contract

## 輸出

1. Evidence input kind / schema 決策：
   - `propagation-report`
   - `review-advisory`
   - `human-review`
   - `retirement-proof`
2. `canary → active` gate：
   - map equivalence passed
   - propagation passed
   - review-advisory passed
   - human review approved
3. `active → legacy-retired` gate：
   - valid rollback-proof 或 valid retirement-proof
   - caller / entrypoint risk cleared
4. blocked output：列出缺失 evidence、requiredJustification、nextActionHint。
5. positive / negative fixtures 覆蓋 active 與 legacy-retired 兩條路徑。

若最終技術決策是不新增 `retirement-proof`，本卡必須同步回改計畫書與 TASK-MRP-0005，把退場安全正式收斂為只接受 `rollback-proof`。

## 驗收條件

- [ ] 缺 propagation report 時 `canary → active` 被擋
- [ ] 缺 review-advisory 或 human-review 時 `canary → active` 被擋
- [ ] 完整 evidence 時 `canary → active` 通過
- [ ] 缺 rollback-proof / retirement-proof 時 `active → legacy-retired` 被擋
- [ ] valid retirement-proof 且 caller / entrypoint risk cleared 時 `active → legacy-retired` 通過
- [ ] blocked JSON 同時包含 `blockedGateNames`、`requiredJustification`、`nextActionHint`

## 影響檔案

- `schemas/governance/retirement-proof.schema.json`（若採新增 proof）
- `packages/core/src/upgrade/propose.ts`
- `packages/core/src/registry/replacement-lane.ts`
- `tests/upgrade/propose-map-evidence-closure.test.ts`
- `tests/registry/replacement-lane-evidence.test.ts`
- `docs/MAP_REPLACEMENT_PROTOCOL.md`（若需補 gate 說明，一律英文）

## 回滾策略

- 將新增 evidence input kind 與 retirement-proof schema 移除；保留 TASK-MRP-0005 的 equivalence / rollback 基礎 gate。

## Checklist

- [ ] evidence input kind 決策完成
- [ ] active gate evidence closure 完成
- [ ] legacy-retired retirement proof path 完成
- [ ] blocked output contract 完成
- [ ] 正反 fixtures 完成
- [ ] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: pending | 驗證: pending | 變更: 由任務覆蓋性盤點補開，補齊 propagation / review / human / retirement evidence 缺口 | 阻塞: TASK-MRP-0003, TASK-MRP-0004, TASK-MRP-0005, TASK-MRP-0006