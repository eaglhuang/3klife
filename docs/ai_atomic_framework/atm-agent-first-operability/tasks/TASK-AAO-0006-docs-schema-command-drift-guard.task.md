---
doc_id: doc_other_1324
task_id: TASK-AAO-0006
title: docs / schema / command drift guard
milestone: M3
status: open
blocked_by:
  - TASK-AAO-0002
  - TASK-AAO-0004
  - TASK-ASA-0010
  - TASK-ASA-0014
owner: atm-core
priority: P1
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - docs/**
  - schemas/**
  - packages/cli/src/commands/command-specs.ts
  - scripts/validate-*.ts
  - tests/**
forbidden_files:
  - unrelated product feature additions
  - new public command surface without governance review
  - duplicate any-debt task creation
non_goals:
  - 不重開 `any` debt budget 任務卡
  - 不把所有 Markdown 改成 schema-only
  - 不建立第二套 docs registry
doc_refs:
  - doc_other_0028
  - doc_other_0035
  - doc_other_0230
  - doc_other_0037
  - doc_other_1001
created_at: 2026-05-25T09:00:00+08:00
created_by_agent: codex
---

# TASK-AAO-0006 — docs / schema / command drift guard

## 目標

為 command list、testing strategy、release parity、any-debt policy 與關鍵 invariant 文件建立 drift guard。

## 背景

報告指出 docs 與實作可能脫節，這在 ATM 這種依賴明確文件路由的框架中特別危險。  
AAO 的做法不是廢掉 Markdown，而是建立 source-of-truth 與文件摘要之間的驗證關係。

## 阻塞

- `TASK-AAO-0002`
- `TASK-AAO-0004`
- `TASK-ASA-0010`
- `TASK-ASA-0014`

## 參考

- `docs/testing-strategy.md`
- `docs/any-debt-budget.md`
- `packages/cli/src/commands/command-specs.ts`

## 交付物

- drift guard 範圍清單
- source-of-truth mapping
- validator 候選命令與 failure surface

## 驗收條件

- [ ] command list 可回指 spec / runner registry
- [ ] release parity 文件可回指 release validators
- [ ] testing strategy 與真實驗證層一致
- [ ] `any` debt policy 只引用既有 `TASK-ATD-0023`，不重開平行卡

## 作用範圍

- `docs/**`
- `schemas/**`
- `packages/cli/src/commands/command-specs.ts`
- `scripts/validate-*.ts`
- `tests/**`

## 驗證命令

```bash
npm run validate:standard
npm run validate:cli
npm run typecheck
```

## 回滾方式

若 drift guard 範圍過廣導致噪音過高，回退 validator 接線，保留文件本體與 mapping 草案。

## Notes

2026-05-25 | 狀態: open | 驗證: pending | 變更: 待建立 docs / schema / command drift guard 範圍與 mapping | 阻塞: TASK-AAO-0002, TASK-AAO-0004, TASK-ASA-0010, TASK-ASA-0014

