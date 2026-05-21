---
doc_id: doc_other_0156
task_id: TASK-MRP-0016
title: 受控 Atom 邊界調整（behavior.reshape）
milestone: M16
status: done
started_at: 2026-05-21T08:20:00Z
started_by_agent: ClaudeCode_haiku-4.5
completed_at: 2026-05-21T08:40:00Z
blocked_by: [TASK-MRP-0013, TASK-MRP-0015, TASK-MRP-0017, TASK-MRP-0020]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
lastTransitionId: 2026-05-21T10-29-44-337Z-migrate-legacy-ledger-9237a567bdc5
lastTransitionAt: 2026-05-21T10:29:44.337Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.337Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:930e0e38882b7a94c250624fb381246829cd0566536fb0aa7b7eeff318e73ecc
---

# TASK-MRP-0016 — 受控 Atom 邊界調整（behavior.reshape）

## 目標

目前 atom 邊界一旦固定就難以調整（需從 draft 重來）。新增 `behavior.reshape`，允許在不更動 map 外部 edge binding schema 的前提下：
- 把一個 atom 拆成兩個（細分）
- 把兩個鄰近 atom 合併成一個（過度拆分的修復）

條件：外部 edge binding contract 不變、equivalence test 通過、police gate 通過。

## 設計原則

- reshape 是「外科手術」，不是「重寫」
- `reshape.mode: split | merge`
- 拆分後舊 atom 自動進入 `deprecated`，新 atom 繼承其 lineage
- 合併後舊兩個 atom 自動退場，新 atom 的 ID 為新號碼
- reshape 必須保持 map 的 `semanticFingerprint` 不變（外部合約不動）

## 前置依賴

- TASK-MRP-0013（progression automation，了解自動化邊界）
- TASK-MRP-0015（telemetry，提供哪些 atom 需要 reshape 的依據）
- TASK-MRP-0017（retire，拆分後舊 atom 走退役流程）

## 輸入

- `map.spec.json`（現有 atom 與 edge 定義）
- reshape proposal JSON（指定 mode、source atoms、target atoms）

## 輸出

1. `node atm.mjs upgrade --propose --behavior behavior.reshape --map <id> --json`
   - dry-run 模式輸出 reshape 計畫（新舊 atom 對照、edge re-routing）
2. 核准後：新 atom 加入 registry，舊 atom 標記 `deprecated`，map.spec.json 更新
3. `lineage-log.json` 記錄 reshape 事件
4. `mapHash` 更新（成員改動）

## 驗收條件

- [ ] split dry-run 輸出正確的新舊 atom 對照
- [ ] merge dry-run 輸出 edge re-routing 計畫
- [ ] 外部 edge binding schema 不變（equivalence test 仍通過）
- [ ] 舊 atom 進入 deprecated（非刪除）
- [ ] reshape 無 human review 不能 apply

## 影響檔案

- `packages/core/src/upgrade/behaviors/reshape.ts`（新增）
- `packages/core/src/cli/upgrade.ts`（新增 `behavior.reshape` handler）
- `schemas/governance/reshape-proposal.schema.json`（新增）
- `tests/upgrade/reshape.test.ts`（新增）

## 回滾策略

移除 `reshape.ts`；registry 中 deprecated atom 重新標回 `active`；map.spec.json git restore。

## 2026-05-21 v2-r2 審查補充

- Reshape 是受控 proposal，不是直接重寫；apply 必須等 human review 與 evidence gates。
- 外部 edge contract 必須不變；map internal hash 可變，但 public semantic fingerprint 不可退轉。
- split / merge 都要跑 old fixtures against new code 與 new fixtures against new code。
- 舊 atom 必須走 M17 retire/deprecated 流程，不可直接刪除。

新增驗收：
- [ ] reshape dry-run 不寫 registry / map.spec.json
- [ ] old fixtures against new code 報告存在且通過 gate
- [ ] 外部 binding schema hash 不變
- [ ] 未附 human review decision 時 apply 被拒絕

## Checklist

- [x] split 模式實作（dryRunReshape + applyReshape）
- [x] merge 模式實作（dryRunReshape + applyReshape）
- [x] edge re-routing 計算（auto-compute if not provided）
- [x] semanticFingerprint 不變驗證（external binding hash unchanged check）
- [x] lineage-log 記錄（reshape lineageEvent appended）
- [ ] CHANGELOG 補記

## notes

core/upgrade/behaviors/reshape.ts. dryRunReshape produces pending-human-review proposal only.
applyReshape requires humanReviewDecisionId + approved status. Deprecated atoms never deleted.
External binding schema hash validated before/after rerouting.
