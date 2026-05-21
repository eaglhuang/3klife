---
doc_id: doc_other_0139
task_id: TASK-MRP-0005
title: Upgrade Gates — equivalence + rollback
milestone: M5
status: done
blocked_by: [TASK-MRP-0003, TASK-MRP-0004]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-17T17:45:45.4823360+08:00
started_by_agent: vs-insiders-github-copilot
completed_at: 2026-05-17T17:55:00.1648762+08:00
completed_by_agent: vs-insiders-github-copilot
lastTransitionId: 2026-05-21T10-29-44-325Z-migrate-legacy-ledger-e8bd4af16ace
lastTransitionAt: 2026-05-21T10:29:44.325Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.325Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:d90835660ca90916d8fc9bed18d907b83f7a2a9e031bb7dd1323b0a6abc0f935
---

# TASK-MRP-0005 — Upgrade Gates: equivalence + rollback

## 目標

擴充 `packages/core/src/upgrade/propose.ts`，讓 target = map 的 upgrade proposal 在缺乏 `map-equivalence` 或 `rollback-proof` 時 hard-block。這是保證目標 A「沒證據不准接管」的決定性閘門。

## 前置依賴

- TASK-MRP-0003
- TASK-MRP-0004

## 輸入

- 計畫書 §6.5、§14.1
- `packages/core/src/upgrade/propose.ts`
- `schemas/governance/rollback-proof.schema.json`
- `schemas/governance/map-equivalence-report.schema.json`

## 輸出

1. 新增 input kind：`map-equivalence`、`rollback-proof`
2. Gate 規則：
   - target = map 且要求 `active` → 需 `map-equivalence` 且 `passed:true`
   - target = map 且要求 `legacy-retired` → 需 `rollback-proof` 且 `verificationStatus:"passed"`，並通過 rollback validator
3. 缺證據時 proposal `status:"blocked"` 且 `blockedGateNames` 包含 `mapEquivalence` / `rollbackProof`
4. blocked proposal 需輸出 `requiredJustification` 或同等欄位，指明缺哪一種 evidence 或 human review 才能放行
5. `upgrade-map-propose.ts` CLI wrapper 暴露 `--replacement-mode <mode>`、`--equivalence-report <path>` / `--rollback-proof <path>`

完整 active / legacy-retired evidence 閉環（propagation、review-advisory、human-review、retirement-proof）由 TASK-MRP-0010 承接；本卡先完成 upgrade proposal 的基礎 evidence gate。

## 驗收條件

- [x] 兩個新 input kind 在 `propose.ts` 出現
- [x] negative fixture：缺 evidence 時 status = blocked
- [x] positive fixture：完整 evidence 時 `status = pending` 且 `automatedGates.allPassed = true`
- [x] CLI wrapper 旗標可被 `--help` 列出
- [x] 測試覆蓋兩個方向
- [x] blocked proposal JSON 含可機器讀取的 justification requirement

## 影響檔案

- `packages/core/src/upgrade/propose.ts`
- `packages/cli/src/commands/upgrade-map-propose.ts`
- `packages/cli/src/commands/upgrade.ts`
- `packages/cli/src/commands/command-specs.ts`
- `schemas/upgrade/upgrade-proposal.schema.json`
- `tests/upgrade/propose-map-equivalence.test.ts`
- `tests/upgrade/propose-map-rollback.test.ts`
- `docs/MAP_REPLACEMENT_PROTOCOL.md`
- `CHANGELOG.md`

## 回滾策略

- 將兩個 input kind 從 enum 移除即可；fixture 與測試一併撤回。

## Checklist

- [x] input kind 擴充
- [x] gate builder 實作
- [x] CLI wrapper 旗標
- [x] 正反測試
- [x] justification requirement output
- [x] CHANGELOG 補一句

## Notes

2026-05-17 | 狀態: done | 驗證: propose-map-equivalence.test.ts / propose-map-rollback.test.ts / validate-upgrade-proposal.ts / validate-schemas.ts --mode validate pass | 變更: `propose.ts` 新增 `map-equivalence` / `rollback-proof` input kind、`requestedReplacementMode`、map-specific automated gates 與 `requiredJustification`；upgrade CLI 新增 `--replacement-mode` / `--equivalence-report` / `--rollback-proof` | 阻塞: none
