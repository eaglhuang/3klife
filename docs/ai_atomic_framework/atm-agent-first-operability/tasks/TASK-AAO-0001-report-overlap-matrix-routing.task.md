---
doc_id: doc_other_1319
task_id: TASK-AAO-0001
title: 報告問題 overlap matrix 與任務路由裁決
milestone: M1
status: open
blocked_by:
  - TASK-AAO-0000
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - docs/ai_atomic_framework/atm-agent-first-operability/**
  - docs/ai_atomic_framework/atm-self-atomization/**
  - docs/any-debt-budget.md
  - docs/testing-strategy.md
  - tests/e2e/**
  - release/atm-onefile/**
  - packages/cli/src/commands/**
forbidden_files:
  - .atm/**
  - upstream production mutation in this card
  - duplicate AAO/ASA/ATD task creation for the same problem
non_goals:
  - 不重開 `any` debt 任務卡
  - 不重開 root-drop sandbox E2E 任務卡
  - 不直接修改 upstream runtime 行為
doc_refs:
  - doc_other_0028
  - doc_other_0230
  - doc_other_0037
  - doc_other_1001
created_at: 2026-05-25T09:00:00+08:00
created_by_agent: codex
---

# TASK-AAO-0001 — 報告問題 overlap matrix 與任務路由裁決

## 目標

把架構分析報告中的問題逐條裁決為：

- 採納
- 部分採納
- 已過時
- 委派既有系列

並產出一張正式路由矩陣，作為後續 AAO 卡的入口。

## 背景

報告提供了壓力測試視角，但 repo 現況已與其中數項描述不一致。  
如果不先裁決哪些問題已被 ASA / ATD 承接，後續開發很容易重複施工。

## 阻塞

- `TASK-AAO-0000`

## 參考

- `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`
- `docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md`
- `docs/any-debt-budget.md`
- `docs/testing-strategy.md`

## 交付物

- 10 條報告問題的裁決表
- AAO / ASA / ATD 路由表
- 明確列出不重複開單的外部承接項

## 驗收條件

- [ ] 每條問題都被標記為採納、部分採納、過時或委派既有系列
- [ ] 問題 2 明確路由到 `TASK-ATD-0023`
- [ ] 問題 8 明確路由到 `TASK-ATD-0032`
- [ ] 問題 10 明確同時連到 `TASK-ASA-0014` 與 `TASK-AAO-0007`
- [ ] 結果可直接被 `TASK-AAO-0002` 到 `TASK-AAO-0007` 引用

## 作用範圍

- `docs/ai_atomic_framework/atm-agent-first-operability/**`
- `docs/ai_atomic_framework/atm-self-atomization/**`
- `docs/any-debt-budget.md`
- `docs/testing-strategy.md`
- `tests/e2e/**`

## 驗證命令

```bash
node atm.mjs next --json
node atm.mjs atomize score --repo . --json
node atm.mjs atomize inventory --repo . --json
node atm.mjs doctor --json
```

## 回滾方式

若裁決錯誤，只回滾 AAO 文件與路由表，不影響 upstream 程式碼。

## Notes

2026-05-25 | 狀態: open | 驗證: pending | 變更: 待產出正式 overlap matrix 與路由裁決 | 阻塞: TASK-AAO-0000

