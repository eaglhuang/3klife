---
doc_id: doc_other_0158
task_id: TASK-APO-0007
title: npm publish + create-atm
milestone: M6
status: done
blocked_by: [TASK-APO-0003, TASK-APO-0004]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
started_at: 2026-05-17T23:28:27.7094530+08:00
started_by_agent: vs-insiders-gpt-5.4
allowed_files:
  - packages/create-atm/**
  - packages/cli/package.json
  - .github/workflows/release-npm.yml
  - release/**
  - README.md
  - tests/package-skeleton.fixture.json
  - scripts/validate-root-drop-release.ts
  - scripts/validate-onefile-release.ts
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

- [x] `packages/create-atm/package.json` 含 `bin: { "create-atm": "..." }`。
- [x] `packages/cli/package.json` 升級 version、加 `publishConfig.access: public`。
- [x] `.github/workflows/release-npm.yml` 在 git tag 觸發 publish。
- [x] `release-npm.yml` 內含 compute-gate standard pass 才 publish 的 guard。
- [x] `npx create-atm test-app --agent claude-code` 在空目錄 60 秒內完成 init + render + pack install。
- [x] npm package README 明確標示「治理框架」定位，避免 CLI tool 誤解。

## 影響檔案

- `packages/create-atm/**`
- `packages/cli/package.json`
- `.github/workflows/release-npm.yml`
- `README.md`
- `release/**`
- `tests/package-skeleton.fixture.json`
- `scripts/validate-root-drop-release.ts`
- `scripts/validate-onefile-release.ts`

## 驗證方式

```bash
cmd /c npm run validate:standard
cmd /c npm run validate:root-drop-release
cmd /c npm run validate:onefile-release
```

## 回滾策略

移除 `create-atm` package、release workflow 與 package publish config；不回滾既有三層發佈。

## Checklist

- [x] create-atm package
- [x] cli publish config
- [x] release workflow
- [x] 60 秒 smoke
- [x] README 定位

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M6 開卡，尚未接手實作 | 阻塞: TASK-APO-0003 / TASK-APO-0004
2026-05-17 | 狀態: done | 驗證: `node --experimental-strip-types packages/create-atm/src/index.ts test-app --agent claude-code --cwd <tmp> --json` pass（約 965ms，產生 `.atm/memory/atm-chart.md`、`.claude/commands/atm-next.md`、`.atm/agent-pack/claude-code.manifest.json`）；`npm --prefix c:/Users/User/AI-Atomic-Framework run validate:standard` pass；`npm --prefix c:/Users/User/AI-Atomic-Framework run validate:root-drop-release` pass；`npm --prefix c:/Users/User/AI-Atomic-Framework run validate:onefile-release` pass；encoding touched check pass | 變更: upstream commit `ec47121 feat: add npm create-atm release path`，新增 `create-atm` package、CLI publishConfig、tag-driven npm release workflow、README npm governance entry、package-skeleton entry，並更新 release validators 以符合現行 ATMChart/welcome/git-head doctor contract；workflow 於 tag 發佈時以 tag 同步 package versions 後 publish | 阻塞: none；註: root `npm run build` 仍受既有 core TypeScript strictness debt 阻擋，release workflow 改用既有 artifact builder scripts 且先跑 `validate:standard`