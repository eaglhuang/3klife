---
doc_id: doc_other_1323
task_id: TASK-AAO-0005
title: CLI 巨型檔案 context slimming wave 1
milestone: M2
status: open
blocked_by:
  - TASK-AAO-0002
  - TASK-AAO-0003
  - TASK-ASA-0009
owner: atm-core
priority: P1
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/tasks/**
  - packages/cli/src/commands/next/**
  - tests/cli/**
forbidden_files:
  - packages/cli/src/commands/hook.ts
  - packages/cli/src/commands/framework-development.ts
  - unrelated command semantic rewrite
non_goals:
  - wave 1 不碰 `hook.ts`
  - wave 1 不碰 `framework-development.ts`
  - 不改 CLI JSON envelope 行為
doc_refs:
  - doc_other_0028
  - doc_other_0037
  - doc_other_1001
created_at: 2026-05-25T09:00:00+08:00
created_by_agent: codex
---

# TASK-AAO-0005 — CLI 巨型檔案 context slimming wave 1

## 目標

將 `tasks.ts` 與 `next.ts` 拆成較小的 decision core、pure helper 與 I/O boundary，降低 Agent 單次上下文負擔。

## 背景

巨型 command 檔案是報告中最成立的問題之一。  
AAO wave 1 只聚焦兩個最高價值入口，避免一次把 CLI 全面拆散而造成 review 風險。

## 阻塞

- `TASK-AAO-0002`
- `TASK-AAO-0003`
- `TASK-ASA-0009`

## 參考

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/next.ts`

## 交付物

- 模組拆分目標圖
- 第一波 helper / routing / output boundary 切分策略
- 對應 tests / validator fixture 計畫

## 驗收條件

- [ ] wave 1 只處理 `tasks.ts` 與 `next.ts`
- [ ] 新 helper 具備對應測試或 fixture
- [ ] CLI JSON envelope 不改版
- [ ] 不把 `hook.ts`、`framework-development.ts` 連帶拉進本卡

## 作用範圍

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/tasks/**`
- `packages/cli/src/commands/next/**`
- `tests/cli/**`

## 驗證命令

```bash
npm run typecheck
npm run validate:cli
node atm.mjs next --json
```

## 回滾方式

若拆分導致 command 行為漂移，回退 helper 抽離與 import rewiring，保留原單檔版本。

## Notes

2026-05-25 | 狀態: open | 驗證: pending | 變更: 待定義 `tasks.ts` / `next.ts` wave 1 拆分策略 | 阻塞: TASK-AAO-0002, TASK-AAO-0003, TASK-ASA-0009

