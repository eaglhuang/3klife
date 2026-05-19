---
doc_id: doc_other_asr_0002
task_id: TASK-ASR-0002
title: upgrade.ts 抽出 next-action-hint
layer: L1
status: done
blocked_by: [TASK-ASR-0001]
owner: atm-core
started_at: 2026-05-20T00:30:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-20T00:45:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: f9d286a
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:cli
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/upgrade.ts
  - packages/cli/src/commands/upgrade/next-action-hint.ts
forbidden_files:
  - packages/core/**
  - tests/cli-fixtures/**
non_goals:
  - 不改 next-action-hint 字串輸出
  - 不改 JSON envelope shape
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: ClaudeCode_Opus4.7
---

# TASK-ASR-0002 — upgrade.ts 抽出 next-action-hint

## 目標

把 `buildUpgradeNextActionHint` 從 `upgrade.ts` 抽到獨立檔案。純 string builder，呼叫一次（line 112）。

## 輸入

- `packages/cli/src/commands/upgrade.ts` 第 607 行附近的 `buildUpgradeNextActionHint`（~45 行）

## 輸出

1. 新檔 `packages/cli/src/commands/upgrade/next-action-hint.ts`
2. `upgrade.ts` 從新檔 import 使用

## 驗收條件

- [ ] `npm run validate:cli` 全綠
- [ ] `npm run typecheck` 0 errors
- [ ] `atm upgrade --json` 對 sentinel fixture 的 `nextActionHint` 字串輸出 byte-identical

## 影響檔案

- `packages/cli/src/commands/upgrade.ts`（modified）
- `packages/cli/src/commands/upgrade/next-action-hint.ts`（new）

## 驗證方式

```bash
cd C:/Users/User/AI-Atomic-Framework
npm run typecheck
npm run validate:cli
```

## 回滾策略

`git revert` 該 commit。

## Notes

- Depends on ASR-0001 為了 import 順序一致性，但實際上獨立。
- `nextActionHint` 出現在 CLI JSON envelope 內，屬於使用者可見 string，務必確保 byte-identical。

## Validation Evidence

2026-05-20 | 狀態: done | 驗證: typecheck 0 errors, validate:cli ok (27 commands) | 變更: `buildUpgradeNextActionHint` (~45 行) 抽到 `packages/cli/src/commands/upgrade/next-action-hint.ts`；輸出 JSON envelope shape 不變；commit f9d286a。
