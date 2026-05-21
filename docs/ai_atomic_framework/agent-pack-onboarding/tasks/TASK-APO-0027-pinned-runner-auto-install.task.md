---
doc_id: doc_other_0648
task_id: TASK-APO-0027
title: Pinned Runner Auto-Install During Init/Bootstrap
milestone: M4
status: done
blocked_by: [TASK-APO-0025]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: implemented-upstream-change
allowed_files:
  - packages/plugin-governance-local/src/index.ts
  - packages/cli/src/commands/bootstrap-entry.ts
  - scripts/build-onefile-release.ts
  - scripts/validate-bootstrap.ts
  - scripts/validate-onefile-release.ts
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不要求使用者手動複製 `atm.mjs`。
  - 不把 upstream `.atm/` 目錄複製到 adopter repo。
  - 不靜默覆蓋 host root 既有且 hash 不同的 `atm.mjs`。
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
completed_at: 2026-05-19T00:00:00+08:00
lastTransitionId: 2026-05-21T10-29-44-178Z-migrate-legacy-ledger-0c509b416bc8
lastTransitionAt: 2026-05-21T10:29:44.178Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.178Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:375865f55881e7ce7df61b5fe7b62537a55d39388f11a7906b0048c542ed0a12
---

# TASK-APO-0027 Pinned Runner Auto-Install During Init/Bootstrap

## 背景

APO-0025 解決了 README / AGENTS 入口可見性，但也暴露出下一個產品缺口：如果 host repo 只有 `.atm/` 與 `AGENTS.md`，卻沒有 root `atm.mjs`，Agent 讀到 `node atm.mjs next --json` 後仍會失敗。

正式 onboarding 不應要求使用者知道要從 upstream release 手動複製 `atm.mjs`。ATM adoption 必須原子性地建立 `.atm/`、root entry 文件，以及可執行的 pinned runner。

## 前置依賴

- TASK-APO-0025

## 輸入

- `release/atm-onefile/atm.mjs` 的 onefile launcher。
- `bootstrap` / `init --adopt default` adoption flow。
- 既有 host repo 可能已有不同 `atm.mjs` 的安全情境。

## 輸出

1. onefile launcher 會把自身路徑傳給內部 runtime。
2. `bootstrap` / `init --adopt default` 會在 host root 安裝 `atm.mjs` pinned runner。
3. `.atm/runtime/pinned-runner.json` 記錄 runner path、sha256、source kind、size 與 first command。
4. 若 host root 已有 hash 不同的 `atm.mjs`，預設不覆蓋，需 `--force` 才替換。
5. bootstrap evidence 會回報 pinned runner 狀態。

## 驗收條件

- [x] 外部 onefile 執行 `bootstrap --cwd <host>` 後，host root 產生 `atm.mjs`。
- [x] host root 的 `node atm.mjs next --json` 可執行並回傳 ATM next action JSON。
- [x] `.atm/runtime/pinned-runner.json` 包含 `sha256`、`runnerPath`、`sourceKind`、`command`。
- [x] 第二次 bootstrap 對相同 runner 回報 `atm.mjs` unchanged。
- [x] hash 不同的既有 `atm.mjs` 不會被靜默覆蓋。

## 觸及檔案

- `packages/plugin-governance-local/src/index.ts`
- `packages/cli/src/commands/bootstrap-entry.ts`
- `scripts/build-onefile-release.ts`
- `scripts/validate-bootstrap.ts`
- `scripts/validate-onefile-release.ts`

## 驗證方式

```bash
npm run validate:bootstrap
npm run validate:onefile-release
npm run build
npm run validate:standard
```

## 實作摘要

- onefile runtime 新增 `ATM_ONEFILE_LAUNCHER_PATH`，讓 extracted runtime 知道原始 onefile launcher 在哪裡。
- local governance adoption 新增 pinned runner 安裝流程，優先來源為 `ATM_PINNED_RUNNER_SOURCE`、`ATM_ONEFILE_LAUNCHER_PATH`、`release/atm-onefile/atm.mjs`。
- adoption 會寫 `.atm/runtime/pinned-runner.json` 作為 provenance 與 hash evidence。
- `validate-onefile-release` 新增外部 launcher bootstrap 情境，驗證空 host repo 會自動取得 root `atm.mjs`。

## Checklist

- [x] onefile launcher source propagation
- [x] bootstrap/init runner install
- [x] pinned-runner metadata
- [x] idempotent unchanged behavior
- [x] external onefile bootstrap fixture

## Notes

2026-05-19 | 狀態: done | 驗證: `npm run validate:bootstrap`, `npm run validate:onefile-release`, `npm run build`, `npm run validate:standard` 全數通過 | 變更: ATM adoption 現在會自動安裝 root `atm.mjs` pinned runner，不再要求使用者手動 copy | 關聯: TASK-APO-0025
