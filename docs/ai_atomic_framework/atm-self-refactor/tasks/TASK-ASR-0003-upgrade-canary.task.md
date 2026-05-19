---
doc_id: doc_other_asr_0003
task_id: TASK-ASR-0003
title: upgrade.ts 抽出 canary helpers
layer: L1
status: done
blocked_by: [TASK-ASR-0001]
owner: atm-core
started_at: 2026-05-20T00:45:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-20T01:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: 41c8c96
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:cli
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/upgrade.ts
  - packages/cli/src/commands/upgrade/canary.ts
forbidden_files:
  - packages/core/**
  - tests/cli-fixtures/**
non_goals:
  - 不改 canary 演算法
  - 不改 selectedFiles 排序規則
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: ClaudeCode_Opus4.7
---

# TASK-ASR-0003 — upgrade.ts 抽出 canary helpers

## 目標

把 3 個 canary 計算函式從 `upgrade.ts` 抽到獨立檔案。純函式，無副作用。

## 輸入

- `packages/cli/src/commands/upgrade.ts` 內 3 個函式：
  - `parseCanaryPercent`（line 464）
  - `resolveCanarySelection`（line 472）
  - `shouldApplyUpgradeFile`（line 491）
- 依賴：`normalizeRepositoryRelativePath`（由 ASR-0001 抽出後從 path-helpers import）

## 輸出

1. 新檔 `packages/cli/src/commands/upgrade/canary.ts`
2. `upgrade.ts` 從新檔 import 使用
3. `canary.ts` 從 `./path-helpers.ts` import `normalizeRepositoryRelativePath`

## 驗收條件

- [ ] `npm run validate:cli` 全綠
- [ ] `npm run typecheck` 0 errors
- [ ] `upgrade.ts` 行數下降約 50 行
- [ ] selectedFiles 排序仍為 localeCompare

## 影響檔案

- `packages/cli/src/commands/upgrade.ts`（modified）
- `packages/cli/src/commands/upgrade/canary.ts`（new）

## 驗證方式

```bash
cd C:/Users/User/AI-Atomic-Framework
npm run typecheck
npm run validate:cli
```

## 回滾策略

`git revert` 該 commit。

## Notes

- Blocked by ASR-0001（需要先有 path-helpers.ts）
- canary 邏輯被 safe-upgrade apply path 使用，務必跑 validate:cli 確認 file selection 行為沒變

## Validation Evidence

2026-05-20 | 狀態: done | 驗證: typecheck 0 errors, validate:cli ok (27 commands) | 變更: 3 個 canary 函式抽到 `packages/cli/src/commands/upgrade/canary.ts`；從 `./path-helpers.ts` import `normalizeRepositoryRelativePath`；selectedFiles `localeCompare` 排序、Math.ceil 比例邏輯保留；commit 41c8c96。
