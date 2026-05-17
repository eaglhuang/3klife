---
doc_id: doc_other_0157
task_id: TASK-APO-0006
title: Multi-Agent Pack 擴張
milestone: M5
status: open
blocked_by: [TASK-APO-0003]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/agent-pack-cursor/**
  - packages/agent-pack-copilot/**
  - packages/agent-pack-gemini/**
  - packages/agent-pack-windsurf/**
  - templates/**
  - tests/agent-pack/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不處理 npm publish
  - 不新增 marketplace governance
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0006 — Multi-Agent Pack 擴張

## 目標

在 Claude Code Pack MVP 之後，擴張 Cursor、Copilot、Gemini、Windsurf 四種 agent entry files，且每種 pack 都共享相同 SSoT / ATMChart / manifest freshness 機制。

## 前置依賴

- TASK-APO-0003

## 輸入

- 計畫書 §8、§15/M5。
- Claude Code Pack MVP 的 templates 與 e2e pattern。

## 輸出

1. Cursor / Copilot / Gemini / Windsurf 四個 pack package。
2. 每個 pack 支援 install / uninstall / diff / verify-fresh。
3. 每個 pack 的模板只導向 `node atm.mjs next --json` 或 deterministic CLI。

## 驗收條件

- [ ] `packages/agent-pack-cursor/` 存在，注入 `.cursor/rules/skills/`。
- [ ] `packages/agent-pack-copilot/` 存在，注入 `.github/` + `.github/prompts/*.prompt.md`。
- [ ] `packages/agent-pack-gemini/` 存在，注入 `.gemini/commands/*.toml`。
- [ ] `packages/agent-pack-windsurf/` 存在，注入 `.windsurf/workflows/*.md`。
- [ ] 每個 pack 通過 install / uninstall / diff / verify-fresh 一輪 e2e。

## 影響檔案

- `packages/agent-pack-cursor/**`
- `packages/agent-pack-copilot/**`
- `packages/agent-pack-gemini/**`
- `packages/agent-pack-windsurf/**`
- `templates/**`
- `tests/agent-pack/**`

## 驗證方式

```bash
cmd /c npm run validate:standard
```

## 回滾策略

逐一移除新增 pack package 與 e2e tests；SDK 與 Claude Code Pack 不回滾。

## Checklist

- [ ] Cursor pack
- [ ] Copilot pack
- [ ] Gemini pack
- [ ] Windsurf pack
- [ ] e2e roundtrip

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M5 開卡，尚未接手實作 | 阻塞: TASK-APO-0003