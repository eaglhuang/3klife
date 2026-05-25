---
doc_id: doc_other_1322
task_id: TASK-AAO-0004
title: validator failure envelope 標準化
milestone: M2
status: open
blocked_by:
  - TASK-AAO-0001
  - TASK-ASA-0010
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - scripts/run-validators.ts
  - scripts/lib/validator-harness.ts
  - scripts/validate-*.ts
  - tests/**
  - docs/testing-strategy.md
forbidden_files:
  - full testing framework replacement
  - unrelated release pipeline changes
  - CLI breaking rename
non_goals:
  - 不改成 Vitest-first 架構
  - 不移除 validator-first 治理層
  - 不把所有 validator 合併成單一黑箱腳本
doc_refs:
  - doc_other_0028
  - doc_other_0037
  - doc_other_1001
created_at: 2026-05-25T09:00:00+08:00
created_by_agent: codex
---

# TASK-AAO-0004 — validator failure envelope 標準化

## 目標

讓 validator 失敗輸出固定欄位，讓 Agent 不需要閱讀 validator 原始碼也知道要改哪裡、跑哪個命令。

## 背景

ATM 已有 `node:test`、validator harness 與 release smoke，但失敗資訊仍偏向人類工程師閱讀。  
AAO 要補的是 Agent 可修 surface，而不是取代既有測試策略。

## 阻塞

- `TASK-AAO-0001`
- `TASK-ASA-0010`

## 參考

- `scripts/run-validators.ts`
- `scripts/lib/validator-harness.ts`
- `docs/testing-strategy.md`

## 交付物

- failure envelope 欄位定義
- code / path / nextCommand / owner surface 規範
- validator output normalization 導入策略

## 驗收條件

- [ ] 每個 validator failure 至少包含 stable code
- [ ] human text、machine path、suggested command 皆可輸出
- [ ] 能掛回 related atom / map 或 owner surface
- [ ] 明確保留 validator-first，不改成 Vitest rewrite

## 作用範圍

- `scripts/run-validators.ts`
- `scripts/lib/validator-harness.ts`
- `scripts/validate-*.ts`
- `tests/**`
- `docs/testing-strategy.md`

## 驗證命令

```bash
npm run validate:standard
npm run typecheck
node atm.mjs doctor --json
```

## 回滾方式

若新 envelope 影響既有 consumer，回退 envelope 欄位與 adapter 層映射，保留原 validator 執行邏輯。

## Notes

2026-05-25 | 狀態: open | 驗證: pending | 變更: 待標準化 validator failure envelope | 阻塞: TASK-AAO-0001, TASK-ASA-0010

