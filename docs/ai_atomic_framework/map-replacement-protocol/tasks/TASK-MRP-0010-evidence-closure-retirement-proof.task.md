---
doc_id: doc_other_0144
task_id: TASK-MRP-0010
title: Replacement Evidence Closure + Retirement Proof
milestone: M10
status: done
blocked_by: [TASK-MRP-0003, TASK-MRP-0004, TASK-MRP-0005, TASK-MRP-0006]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-17T21:50:21.7118521+08:00
started_by_agent: vs-insiders-gpt-5.4
completed_at: 2026-05-17T22:07:40.7734045+08:00
completed_by_agent: vs-insiders-gpt-5.4
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

- [x] 缺 propagation report 時 `canary → active` 被擋
- [x] 缺 review-advisory 或 human-review 時 `canary → active` 被擋
- [x] 完整 evidence 時 `canary → active` 通過
- [x] 缺 rollback-proof / retirement-proof 時 `active → legacy-retired` 被擋
- [x] valid retirement-proof 且 caller / entrypoint risk cleared 時 `active → legacy-retired` 通過
- [x] blocked JSON 同時包含 `blockedGateNames`、`requiredJustification`、`nextActionHint`

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

- [x] evidence input kind 決策完成
- [x] active gate evidence closure 完成
- [x] legacy-retired retirement proof path 完成
- [x] blocked output contract 完成
- [x] 正反 fixtures 完成
- [x] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: done | 驗證: propose-map-evidence-closure.test.ts / propose-map-rollback.test.ts / replacement-lane-evidence.test.ts / replacement-lane.test.ts / validate-schemas.ts / compute-gate standard pass | 變更: 新增 `atm.propagationReport` 與 `atm.retirementProof` schema，讓 `upgrade --propose` 正式接入 `propagation-report` / `review-advisory` / `human-review` / `retirement-proof` input kind，並讓 `replacement-lane transition` 在 `active` / `legacy-retired` 讀取 machine-readable evidence 做 gate 驗證，同步補齊 focused regression、protocol doc 與 CHANGELOG | 阻塞: none