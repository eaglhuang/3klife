---
doc_id: doc_other_0157
task_id: TASK-APO-0006
title: Multi-Agent Pack 擴張
milestone: M5
status: done
blocked_by: [TASK-APO-0003]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
started_at: 2026-05-17T23:16:29.8932947+08:00
started_by_agent: vs-insiders-gpt-5.4
allowed_files:
  - packages/cli/package.json
  - packages/cli/src/commands/agent-pack.ts
  - packages/plugin-rule-guard/src/index.ts
  - packages/agent-pack-sdk/README.md
  - packages/agent-pack-claude-code/package.json
  - packages/agent-pack-claude-code/README.md
  - packages/agent-pack-cursor/**
  - packages/agent-pack-copilot/**
  - packages/agent-pack-gemini/**
  - packages/agent-pack-windsurf/**
  - templates/**
  - tests/agent-pack/**
  - tests/package-skeleton.fixture.json
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

- [x] `packages/agent-pack-cursor/` 存在，注入 `.cursor/rules/skills/`。
- [x] `packages/agent-pack-copilot/` 存在，注入 `.github/` + `.github/prompts/*.prompt.md`。
- [x] `packages/agent-pack-gemini/` 存在，注入 `.gemini/commands/*.toml`。
- [x] `packages/agent-pack-windsurf/` 存在，注入 `.windsurf/workflows/*.md`。
- [x] 每個 pack 通過 install / uninstall / diff / verify-fresh 一輪 e2e。

## 影響檔案

- `packages/agent-pack-cursor/**`
- `packages/agent-pack-copilot/**`
- `packages/agent-pack-gemini/**`
- `packages/agent-pack-windsurf/**`
- `packages/agent-pack-sdk/README.md`
- `packages/agent-pack-claude-code/package.json`
- `packages/agent-pack-claude-code/README.md`
- `packages/plugin-rule-guard/src/index.ts`
- `templates/**`
- `tests/agent-pack/**`

## 驗證方式

```bash
cmd /c npm run validate:standard
```

## 回滾策略

逐一移除新增 pack package 與 e2e tests；SDK 與 Claude Code Pack 不回滾。

## Checklist

- [x] Cursor pack
- [x] Copilot pack
- [x] Gemini pack
- [x] Windsurf pack
- [x] e2e roundtrip

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M5 開卡，尚未接手實作 | 阻塞: TASK-APO-0003
2026-05-17 | 狀態: done | 驗證: `node --experimental-strip-types c:/Users/User/AI-Atomic-Framework/tests/agent-pack/multi-agent-pack-roundtrip.test.ts` pass；`npm --prefix c:/Users/User/AI-Atomic-Framework run validate:standard` pass；encoding touched check pass；`node c:/Users/User/3KLife/tools_node/compute-gate.js --profile standard --agent-feedback` pass | 變更: upstream commit `8dbb372 feat: add multi-agent pack expansion`，新增 Cursor/Copilot/Gemini/Windsurf agent-pack packages、CLI pack registry entries、package-skeleton fixture entries、multi-agent roundtrip e2e，並補齊 agent-pack SDK / Claude pack README 與 Claude pack package skeleton | 阻塞: none