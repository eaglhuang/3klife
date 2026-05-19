---
doc_id: doc_other_asr_0004
task_id: TASK-ASR-0004
title: command-specs.ts 抽出 _common shared options
layer: L2
status: done
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:cli
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/command-specs.ts
  - packages/cli/src/commands/command-specs/_common.ts
non_goals:
  - 不改 28 個 command spec 的內容
  - 不動 help-snapshot fixture
created_at: 2026-05-20T01:00:00+08:00
created_by_agent: ClaudeCode_Opus4.7
started_at: 2026-05-20T01:05:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-20T01:15:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: 48dd41b
---

# TASK-ASR-0004 — command-specs.ts 抽出 _common shared options

## 目標

把 4 個 shared option 常數抽到 `command-specs/_common.ts`，是後續「28 個 spec 各自一檔」拆分的第一步準備。

## 輸入

`packages/cli/src/commands/command-specs.ts` line 3-6 的 4 個常數：
- `commonJsonOption`、`commonPrettyOption`、`commonHelpOption`、`commonCwdOption`

## 輸出

`packages/cli/src/commands/command-specs/_common.ts`（new）

## 驗收條件

- [x] `npm run validate:cli` ok (27 commands, standalone fixture verified)
- [x] `npm run typecheck` 0 errors

## Validation Evidence

2026-05-20 | 狀態: done | 驗證: typecheck 0 errors, validate:cli ok | 變更: 4 個 shared option 常數抽到 `packages/cli/src/commands/command-specs/_common.ts`；help-snapshot fixture 不變；commit 48dd41b。
