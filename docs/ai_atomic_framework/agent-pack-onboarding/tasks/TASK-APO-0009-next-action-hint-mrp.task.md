---
doc_id: doc_other_0160
task_id: TASK-APO-0009
title: Slash Command nextActionHint 對接 MRP
milestone: M8
status: open
blocked_by: [TASK-APO-0003, TASK-MRP-0009]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/next.ts
  - schemas/agent-prompt.schema.json
  - packages/agent-pack-*/**
  - tests/**
forbidden_files:
  - packages/core/registry/**
  - assets/**
non_goals:
  - 不實作 MRP create-map schema
  - 不讓 prompt 自建狀態機
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0009 — Slash Command nextActionHint 對接 MRP

## 目標

讓 `atm next --json` 能回傳 agent-pack 可消費的下一步 hint，並與 MRP `nextActionHint` 欄位共用 schema 語意，避免 onboarding 與 map replacement 長出雙頭命名。

## 前置依賴

- TASK-APO-0003
- TASK-MRP-0009

## 輸入

- 計畫書 §6.5、§15/M8。
- MRP TASK-MRP-0009 的 `nextActionHint` 決策。

## 輸出

1. `packages/cli/src/commands/next.ts` output JSON 新增 `agent_pack_hint` 或與 MRP 共用的 hint 欄位。
2. `schemas/agent-prompt.schema.json` 同步擴充。
3. agent-pack templates 能讀取 hint 並引導使用者進入下一個 slash command。

## 驗收條件

- [ ] `packages/cli/src/commands/next.ts` output JSON 新增 `agent_pack_hint` 欄位。
- [ ] `agent_pack_hint` 內容指向下一個建議的 slash command id（例如 `atm-map-equivalence`）。
- [ ] `schemas/agent-prompt.schema.json` 同步擴充 `agent_pack_hint` 與 `handoff_chain[]`。
- [ ] 與 MRP TASK-MRP-0009 的 `nextActionHint` 共用 schema 欄位（避免雙頭命名）。
- [ ] agent-pack 模板能讀 `agent_pack_hint` 並引導使用者進入下一個 slash command。

## 影響檔案

- `packages/cli/src/commands/next.ts`
- `schemas/agent-prompt.schema.json`
- `packages/agent-pack-*/**`
- `tests/**`

## 驗證方式

```bash
cmd /c npm run validate:cli
cmd /c npm run validate:agent-prompt
cmd /c npm run validate:standard
```

## 回滾策略

移除 hint 欄位與模板 consumption；`atm next --json` 回到純 nextAction output。

## Checklist

- [ ] next output 欄位
- [ ] schema 擴充
- [ ] MRP 共用命名
- [ ] template consumption
- [ ] CLI validator

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M8 開卡，尚未接手實作 | 阻塞: TASK-APO-0003 / TASK-MRP-0009