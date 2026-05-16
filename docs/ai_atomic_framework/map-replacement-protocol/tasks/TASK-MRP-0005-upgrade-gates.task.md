---
doc_id: doc_other_0139
task_id: TASK-MRP-0005
title: Upgrade Gates — equivalence + rollback
milestone: M5
status: pending
blocked_by: [TASK-MRP-0003, TASK-MRP-0004]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
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
   - target = map 且要求 `legacy-retired` → 需 `rollback-proof` 且 `valid:true`
3. 缺證據時 proposal `status:"blocked"` 且 `blockedGateNames` 包含 `map-equivalence` / `rollback-proof`
4. `upgrade-map-propose.ts` CLI wrapper 暴露 `--equivalence-report <path>` / `--rollback-proof <path>`

## 驗收條件

- [ ] 兩個新 input kind 在 `propose.ts` 出現
- [ ] negative fixture：缺 evidence 時 status = blocked
- [ ] positive fixture：完整 evidence 時 status = accepted
- [ ] CLI wrapper 旗標可被 `--help` 列出
- [ ] 測試覆蓋兩個方向

## 影響檔案

- `packages/core/src/upgrade/propose.ts`
- `packages/cli/src/commands/upgrade-map-propose.ts`
- `tests/upgrade/propose-map-equivalence.test.ts`
- `tests/upgrade/propose-map-rollback.test.ts`

## 回滾策略

- 將兩個 input kind 從 enum 移除即可；fixture 與測試一併撤回。

## Checklist

- [ ] input kind 擴充
- [ ] gate builder 實作
- [ ] CLI wrapper 旗標
- [ ] 正反測試
- [ ] CHANGELOG 補一句
