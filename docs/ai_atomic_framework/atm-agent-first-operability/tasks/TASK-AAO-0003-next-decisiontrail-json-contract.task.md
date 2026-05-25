---
doc_id: doc_other_1321
task_id: TASK-AAO-0003
title: "`next` decisionTrail JSON contract"
milestone: M1
status: open
blocked_by:
  - TASK-AAO-0001
  - TASK-ASA-0009
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/next.ts
  - scripts/validate-guidance.ts
  - tests/cli/**
  - docs/**
forbidden_files:
  - private chain-of-thought exposure
  - removal of existing `reason`
  - unrelated `next` route redesign
non_goals:
  - 不暴露模型私有思維鏈
  - 不取消 `reason`、`allowedCommands`、`blockedCommands`、`missingEvidence`
  - 不推翻 `next --json` 作為單一路由
doc_refs:
  - doc_other_0028
  - doc_other_0035
  - doc_other_0037
  - doc_other_1001
created_at: 2026-05-25T09:00:00+08:00
created_by_agent: codex
---

# TASK-AAO-0003 — `next` decisionTrail JSON contract

## 目標

為 `node atm.mjs next --json` 規劃一個穩定的 `decisionTrail` 欄位，讓 Agent 看得懂高層決策依據，同時維持既有相容性。

## 背景

`next` 已經有 `reason` 等欄位，但還缺少一個結構化、可驗證、可逐步追蹤的決策摘要。  
AAO 不會要求輸出模型思維鏈，而是建立可公開的檢查結果序列。

## 阻塞

- `TASK-AAO-0001`
- `TASK-ASA-0009`

## 參考

- `packages/cli/src/commands/next.ts`
- `scripts/validate-guidance.ts`

## 交付物

- `decisionTrail` JSON contract
- backward compatibility 說明
- sample payload 與 validator 需求

## 驗收條件

- [ ] `decisionTrail` 每筆至少包含 `check`、`result`、`reason`
- [ ] 可選欄位能表達 `evidencePath` 與 `nextCommand`
- [ ] 舊 consumer 仍可只讀 `reason`
- [ ] guidance session、blocked、ready、task-scoped prompt 路徑都有測試案例

## 作用範圍

- `packages/cli/src/commands/next.ts`
- `scripts/validate-guidance.ts`
- `tests/cli/**`

## 驗證命令

```bash
npm run validate:cli
npm run typecheck
node atm.mjs next --json
```

## 回滾方式

若 `decisionTrail` 造成 consumer 破壞，先回退新增欄位與 validator，再保留既有 `reason` surface。

## Notes

2026-05-25 | 狀態: open | 驗證: pending | 變更: 待規劃 `decisionTrail` 與 backward compatibility | 阻塞: TASK-AAO-0001, TASK-ASA-0009

