---
doc_id: doc_other_0647
task_id: TASK-APO-0026
title: Codex editor integration 正式化
milestone: M3
status: done
blocked_by: [TASK-APO-0006]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: implemented-upstream-change
allowed_files:
  - packages/integrations-core/src/index.ts
  - packages/integrations-core/README.md
  - packages/integration-codex/**
  - packages/cli/src/commands/integration.ts
  - packages/cli/src/commands/guide.ts
  - packages/cli/src/commands/command-specs.ts
  - docs/ARCHITECTURE.md
  - docs/AGENT_OPERATING_LAYER_ENHANCEMENT.md
  - docs/multi-agent-compatibility-matrix.md
  - integrations/codex-skills/**
  - scripts/validate-integration-adapter.ts
  - scripts/validate-cli.ts
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不自動寫入使用者全域 `.codex/skills`。
  - 不讓 Codex 長期停留在 guide-only 或半支援狀態。
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex-gpt-5
completed_at: 2026-05-18T00:00:00+08:00
---

# TASK-APO-0026 Codex editor integration 正式化

## 背景

ATM 內部已經存在 Codex skill template 與 `integrations/codex-skills/` 相關線索，但如果 CLI 不能以 `atm integration add codex` 安裝、驗證、移除，就會形成「文件看起來支援，實際不是官方 adapter」的 shadow state。

本任務把 Codex 納入與 Claude Code / Copilot / Cursor / Gemini 同級的 official integration adapter，讓 repo-local Codex skills 可以透過 ATM lifecycle 管理，並保留 global Codex skill install 作為可選 bridge，而不是唯一入口。

## 前置依賴

- TASK-APO-0006

## 輸入

- `ATM引導工程計畫書.md` 第 3.2.1 節與 M3 規則。
- `integrations-core` 的 skill template compiler。
- CLI `integration list/add/verify/remove` lifecycle。

## 輸出

1. `integration list` 會列出 `codex`。
2. `atm integration add codex` / `verify codex` / `remove codex` 具備完整 roundtrip。
3. 新增 `packages/integration-codex/**` 作為正式 adapter package。
4. Architecture、Agent Operating Layer、compatibility matrix 文件一致標示 Codex official target。

## 驗收條件

- [x] `atm integration list --json` 包含 `codex`。
- [x] `atm integration add codex --json` 會寫入 manifest 與 repo-local Codex skill files。
- [x] `atm integration verify codex --json` / `remove codex --json` roundtrip 通過。
- [x] compatibility matrix、architecture、enhancement 文件列出 Codex 的 target path 與 lifecycle。
- [x] README 釐清 `guide install-skill --target codex` 是 global skill bridge，不取代 official integration adapter。

## 觸及檔案

- `packages/integration-codex/**`
- `packages/integrations-core/src/index.ts`
- `packages/integrations-core/README.md`
- `packages/cli/src/commands/integration.ts`
- `packages/cli/src/commands/command-specs.ts`
- `docs/ARCHITECTURE.md`
- `docs/AGENT_OPERATING_LAYER_ENHANCEMENT.md`
- `docs/multi-agent-compatibility-matrix.md`
- `examples/agent-onboarding-flow/**`
- `scripts/validate-integration-adapter.ts`
- `scripts/validate-cli.ts`
- `scripts/validate-skill-templates.ts`
- `scripts/validate-multi-agent-confidence.ts`
- `scripts/skew-matrix.config.json`

## 驗證方式

```bash
npm run validate:integration-adapter
npm run validate:skill-templates
npm run validate:cli
npm run validate:examples
npm run validate:multi-agent-confidence
npm run validate:standard
```

## 實作摘要

- 新增 `@ai-atomic-framework/integration-codex` package。
- `compileSkillTemplatesForAdapter('codex')` 產出 Codex repo-local `SKILL.md`。
- CLI integration registry 新增 `codex` adapter factory。
- `validate-cli` 驗證 `integration add/verify/remove codex`。
- 多 Agent compatibility matrix 新增 official integration adapter registry matrix。

## Checklist

- [x] official adapter package
- [x] CLI registry
- [x] manifest roundtrip
- [x] docs matrix alignment
- [x] guide bridge clarification

## Notes

2026-05-18 | 狀態: done | 驗證: `npm run validate:integration-adapter`, `npm run validate:skill-templates`, `npm run validate:cli`, `npm run validate:examples`, `npm run validate:multi-agent-confidence`, `npm run validate:standard` 全數通過 | 變更: Codex 已從 guide-only/參考型 helper 提升為 official integration adapter | 關聯: TASK-APO-0006
