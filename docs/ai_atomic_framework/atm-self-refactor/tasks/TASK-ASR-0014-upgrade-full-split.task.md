---
doc_id: doc_other_asr_0014
task_id: TASK-ASR-0014
title: upgrade.ts 完整拆分（experimental / safe-upgrade / scan / proposal）
layer: L3-complete
status: done
blocked_by: [TASK-ASR-0001, TASK-ASR-0002, TASK-ASR-0003]
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate:cli
public_tracking: false
public_surface_risk: none
allowed_files:
  - packages/cli/src/commands/upgrade.ts
  - packages/cli/src/commands/upgrade/path-helpers.ts
  - packages/cli/src/commands/upgrade/experimental.ts
  - packages/cli/src/commands/upgrade/safe-upgrade.ts
  - packages/cli/src/commands/upgrade/scan.ts
  - packages/cli/src/commands/upgrade/proposal.ts
created_at: 2026-05-20T08:00:00+08:00
created_by_agent: ClaudeCode_Sonnet4.6
started_at: 2026-05-20T08:00:00+08:00
started_by_agent: ClaudeCode_Sonnet4.6
completed_at: 2026-05-20T09:00:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
upstream_commit: 13fea94
lastTransitionId: 2026-05-21T10-29-44-197Z-migrate-legacy-ledger-73f122cd9dab
lastTransitionAt: 2026-05-21T10:29:44.197Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.197Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:1d24d27268806b24ad88f68b91243228f68c7b5d7fe7adbf709f5ddaa98c9abe
---

# TASK-ASR-0014 — upgrade.ts 完整拆分（experimental / safe-upgrade / scan / proposal）

## 目標

把 `packages/cli/src/commands/upgrade.ts`（1203 行）的四個職責完整拆開：

1. **`upgrade/experimental.ts`**：experimental API gating（firstExperimentalUpgradeAction, parseExperimentalApiOptions, runUpgradeExperimentalApi）
2. **`upgrade/safe-upgrade.ts`**：safe-upgrade plan/apply/rollback/collect（firstSafeUpgradeAction, parseSafeUpgradeOptions, runSafeUpgradePlan, runSafeUpgradeApply, runSafeUpgradeRollback, collectSafeUpgradeFiles, backupSafeUpgradeFiles）
3. **`upgrade/scan.ts`**：scan flow（runUpgradeScan, discoverDetectorReportDocuments）
4. **`upgrade/proposal.ts`**：parseUpgradeOptions + guided legacy + input discovery + context budget（parseUpgradeOptions, isGuidedLegacyDryRun, runGuidedLegacyDryRunProposal, loadExplicitInputDocuments, discoverInputDocuments, evaluateUpgradeContextBudget）
5. **`upgrade/path-helpers.ts`**（擴充）：加入 requireOptionValue + collectJsonFiles 工具函式
6. **`upgrade.ts`**（縮小）：只保留 runUpgrade entry + dispatch（~120 行）

## 背景

- TASK-ASR-0001/0002/0003 已抽出 path-helpers / next-action-hint / canary
- upgrade.ts 目前 1203 行，Invariant I1（public CLI surface stable）
- 驗收閘門：validate:cli ok（28 commands, standalone fixture verified）

## 驗收條件

- [x] `npm run typecheck` 0 errors
- [x] `npm run validate:cli` ok（28 commands）
- [x] `npm run validate:quick` ok 4/4
- [x] upgrade.ts 行數從 1203 降至 114 行（-91%）

## Invariant

| Invariant | 說明 | 策略 |
|-----------|------|------|
| I1 Public CLI surface | atm.mjs upgrade <action> --json shape | validate:cli 驗收 |
