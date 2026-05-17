---
doc_id: doc_other_0154
task_id: TASK-APO-0003
title: Claude Code Pack MVP
milestone: M2
status: open
blocked_by: [TASK-APO-0002]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/agent-pack-claude-code/**
  - templates/**
  - tests/agent-pack/**
  - examples/agent-onboarding-flow/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不實作 Cursor/Copilot/Gemini/Windsurf pack
  - 不寫死 MRP phase 狀態機
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0003 — Claude Code Pack MVP

## 目標

交付第一個可安裝、可驗證、可乾淨卸載的 Claude Code Agent Pack，所有模板只負責導向 `node atm.mjs next --json` 與 deterministic CLI，不 baked-in 完整流程。

## 前置依賴

- TASK-APO-0002

## 輸入

- 計畫書 §2.1、§3、§8、§15/M2。
- 既有 Claude Code skill / command 範例。

## 輸出

1. `packages/agent-pack-claude-code/` package。
2. 6 個 `*.md.tmpl`：bootstrap / lock / next / evidence / handoff / verify。
3. install 產出 `.claude/commands/atm-*.md` 或等價 Claude Code entry files。
4. uninstall 對 user-modified 檔案採保留 / `.bak` 策略。

## 驗收條件

- [ ] `packages/agent-pack-claude-code/` 存在，包含 6 個 `*.md.tmpl`。
- [ ] `node atm.mjs agent-pack install --id claude-code` 在乾淨 repo 產出 6 個 .md + 1 個 manifest。
- [ ] `node atm.mjs agent-pack uninstall --id claude-code` 後 `git status` 為空（乾淨卸載）。
- [ ] user-modified fixture 不會被 uninstall 誤刪。
- [ ] 模板內容只導向 `node atm.mjs next --json` 或 deterministic CLI。

## 影響檔案

- `packages/agent-pack-claude-code/**`
- `templates/**`
- `tests/agent-pack/**`
- `examples/agent-onboarding-flow/**`

## 驗證方式

```bash
cmd /c npm run validate:cli
cmd /c npm run validate:examples
cmd /c npm run validate:standard
```

## 回滾策略

移除 Claude Code pack package、模板與 e2e tests；保留 SDK 不受影響。

## Checklist

- [ ] pack package
- [ ] 6 個 templates
- [ ] install happy path
- [ ] uninstall clean path
- [ ] user-modified 保護 fixture

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M2 開卡，尚未接手實作 | 阻塞: TASK-APO-0002