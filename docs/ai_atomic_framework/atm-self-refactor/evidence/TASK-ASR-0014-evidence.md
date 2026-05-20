---
doc_id: doc_evidence_asr_0014
task_id: TASK-ASR-0014
layer: L3-complete
status: done
completed_at: 2026-05-20T09:00:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
upstream_commit: 13fea94
---

# Evidence — TASK-ASR-0014 — upgrade.ts 完整拆分（experimental / safe-upgrade / scan / proposal）

## 完成摘要

| 指標 | Before | After | Δ |
|------|--------|-------|---|
| upgrade.ts 行數 | 1203 | 114 | -91% |
| 新模組數 | 3 (path-helpers/next-action-hint/canary) | 7 | +4 |
| I1 invariant 違反 | 0 | 0 | 0 |

## 新模組說明

**upgrade/experimental.ts**（新建，100 行）：
- `firstExperimentalUpgradeAction`（dispatcher helper）
- `runUpgradeExperimentalApi`（experimental API gating）
- Private: `parseExperimentalApiOptions`

**upgrade/safe-upgrade.ts**（新建，367 行）：
- `firstSafeUpgradeAction`（dispatcher helper）
- `parseSafeUpgradeOptions`（plan/apply/rollback option parser）
- `runSafeUpgradePlan`（safe upgrade plan）
- `runSafeUpgradeApply`（safe upgrade apply + backup）
- `runSafeUpgradeRollback`（safe upgrade rollback）
- `collectSafeUpgradeFiles`（file collection）
- Private: `addManifestFiles`, `extractManagedFilesFromManifest`, `addBackupRecord`, `backupSafeUpgradeFiles`

**upgrade/scan.ts**（新建，83 行）：
- `runUpgradeScan`（evidence pattern scan flow）
- Private: `discoverDetectorReportDocuments`

**upgrade/proposal.ts**（新建，604 行）：
- `parseUpgradeOptions`（全功能 proposal option parser）
- `isGuidedLegacyDryRun`, `runGuidedLegacyDryRunProposal`（guided legacy flow）
- `loadExplicitInputDocuments`, `discoverInputDocuments`（input discovery）
- `evaluateUpgradeContextBudget`（context budget gate）
- Private: `enqueueGuidedLegacyProposal`, `normalizeUpgradeInputDocument`, `inferInputKind`, `materializeUpgradeHardStop`, `readUpgradeContextBudgetPolicy`, `evaluateContextBudgetInline`, `sanitizeUpgradeBudgetId`

**upgrade/path-helpers.ts**（擴充）：
- 新增 `requireOptionValue`（CLI option parser utility）
- 新增 `collectJsonFiles`（recursive JSON file scanner）

## 設計決策

**scan.ts → proposal.ts dependency**：`runUpgradeScan` 複用 `loadExplicitInputDocuments`（scan 和 proposal 都能接受 --input 路徑）。這是單向依賴，無循環。

**requireOptionValue in path-helpers.ts**：被 experimental.ts、safe-upgrade.ts、proposal.ts 三個模組共用，放在既有的共用工具模組。

**collectJsonFiles in path-helpers.ts**：被 proposal.ts（discoverInputDocuments）和 scan.ts（discoverDetectorReportDocuments）共用，放在工具模組避免交叉依賴。

**runUpgradeExperimentalApi 簽名調整**：原本 `upgrade.ts` 先呼叫 `parseExperimentalApiOptions(argv)` 再傳入，重構後改為 `experimental.ts` 內部 parse，對外只暴露 `runUpgradeExperimentalApi(argv)`。語義等效，外部呼叫方（upgrade.ts）無感知。

## 驗收結果

| 測試 | 結果 |
|------|------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run validate:cli` | ✅ ok (28 commands, standalone fixture verified) |
| `npm run validate:quick` | ✅ ok 4/4 |
| upgrade.ts 行數 | ✅ 114 行（目標 ~120） |

## Upstream Commit

- 13fea94：6 files changed (+1197 -1109)
