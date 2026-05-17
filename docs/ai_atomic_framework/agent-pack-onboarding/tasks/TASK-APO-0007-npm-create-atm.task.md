---
doc_id: doc_other_0158
task_id: TASK-APO-0007
title: npm publish + create-atm
milestone: M6
status: open
blocked_by: [TASK-APO-0003, TASK-APO-0004]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/create-atm/**
  - packages/cli/package.json
  - .github/workflows/release-npm.yml
  - release/**
  - README.md
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不預設安裝 agent pack
  - 不取代 root-drop / onefile / source routing
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0007 — npm publish + create-atm

## 目標

建立 ATM 的第四層公開入口：npm package 與 `create-atm`，讓新使用者可以低摩擦初始化，但仍保留 ATM 作為治理框架的嚴肅性。

## 前置依賴

- TASK-APO-0003
- TASK-APO-0004

## 輸入

- 計畫書 §9、§15/M6。
- 既有 root-drop / onefile release workflow。

## 輸出

1. `packages/create-atm/` package。
2. `@ai-atomic-framework/cli` publish 設定。
3. `.github/workflows/release-npm.yml`。
4. README / npm package description 明確標示「治理框架」。

## 驗收條件

- [ ] `packages/create-atm/package.json` 含 `bin: { "create-atm": "..." }`。
- [ ] `packages/cli/package.json` 升級 version、加 `publishConfig.access: public`。
- [ ] `.github/workflows/release-npm.yml` 在 git tag 觸發 publish。
- [ ] `release-npm.yml` 內含 compute-gate standard pass 才 publish 的 guard。
- [ ] `npx create-atm test-app --agent claude-code` 在空目錄 60 秒內完成 init + render + pack install。
- [ ] npm package README 明確標示「治理框架」定位，避免 CLI tool 誤解。

## 影響檔案

- `packages/create-atm/**`
- `packages/cli/package.json`
- `.github/workflows/release-npm.yml`
- `README.md`
- `release/**`

## 驗證方式

```bash
cmd /c npm run validate:standard
cmd /c npm run validate:root-drop-release
cmd /c npm run validate:onefile-release
```

## 回滾策略

移除 `create-atm` package、release workflow 與 package publish config；不回滾既有三層發佈。

## Checklist

- [ ] create-atm package
- [ ] cli publish config
- [ ] release workflow
- [ ] 60 秒 smoke
- [ ] README 定位

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M6 開卡，尚未接手實作 | 阻塞: TASK-APO-0003 / TASK-APO-0004