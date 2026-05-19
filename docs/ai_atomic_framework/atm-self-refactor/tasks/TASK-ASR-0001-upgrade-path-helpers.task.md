---
doc_id: doc_other_asr_0001
task_id: TASK-ASR-0001
title: upgrade.ts 抽出 path-helpers
layer: L1
status: done
blocked_by: []
owner: atm-core
started_at: 2026-05-20T00:00:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-20T00:30:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: 85f2db1
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:cli
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/upgrade.ts
  - packages/cli/src/commands/upgrade/path-helpers.ts
forbidden_files:
  - packages/core/**
  - tests/cli-fixtures/**
non_goals:
  - 不改 public CLI surface
  - 不改 JSON envelope
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: ClaudeCode_Opus4.7
---

# TASK-ASR-0001 — upgrade.ts 抽出 path-helpers

## 目標

把 `packages/cli/src/commands/upgrade.ts` 內 4 個 pure path utility 函式抽到 `upgrade/path-helpers.ts`，作為 Layer 1 第一張示範卡。

## 輸入

- `packages/cli/src/commands/upgrade.ts` 第 574-605 行附近的 4 個函式：
  - `safeReadJson`
  - `sha256File`
  - `resolveRepositoryPath`
  - `normalizeRepositoryRelativePath`

## 輸出

1. 新檔 `packages/cli/src/commands/upgrade/path-helpers.ts`，包含 4 個函式 + 對應 export。
2. `upgrade.ts` 從新檔 import，移除原本實作。
3. 4 個函式的 signature 與行為不變（純機械搬移）。

## 驗收條件

- [ ] `npm run validate:cli` 全綠
- [ ] `npm run typecheck` 0 errors
- [ ] `upgrade.ts` 行數下降約 32 行
- [ ] 無新增外部依賴

## 影響檔案

- `packages/cli/src/commands/upgrade.ts`（modified）
- `packages/cli/src/commands/upgrade/path-helpers.ts`（new）

## 驗證方式

```bash
cd C:/Users/User/AI-Atomic-Framework
npm run typecheck
npm run validate:cli
```

## 回滾策略

`git revert` 該 commit；4 個函式回到 upgrade.ts。

## Notes

- Layer 1 第一張，沒有 I-invariant 風險。
- 確認 import path 為 `./upgrade/path-helpers.ts`（注意 `.ts` 後綴是 strip-types 模式必要）。

## Validation Evidence

2026-05-20 | 狀態: done | 驗證: typecheck 0 errors, validate:cli ok (27 commands) | 變更: 4 個 path helper 函式抽到 `packages/cli/src/commands/upgrade/path-helpers.ts`；upgrade.ts 移除孤立的 `createHash` 與 `readFileSync` import；commit 85f2db1。
