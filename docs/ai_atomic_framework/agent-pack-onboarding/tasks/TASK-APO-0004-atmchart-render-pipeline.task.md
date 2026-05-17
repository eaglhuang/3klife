---
doc_id: doc_other_0155
task_id: TASK-APO-0004
title: Rule Render / ATMChart Pipeline
milestone: M3
status: done
blocked_by: [TASK-APO-0002]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
started_at: 2026-05-17T22:54:00.8460083+08:00
started_by_agent: vs-insiders-gpt-5.4
allowed_files:
  - packages/cli/src/commands/atm-chart.ts
  - packages/cli/src/commands/doctor.ts
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/welcome.ts
  - packages/cli/src/commands/agent-pack.ts
  - templates/enforcement/**
  - scripts/validate-*.ts
  - tests/cli-fixtures/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不實作 Agent Pack SDK 本體
  - 不改 registry / map replacement protocol
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0004 — Rule Render / ATMChart Pipeline

## 目標

把 `default-guards.json`、AtomicCharter invariants 與相關 schema hashes 渲染為可讀且可驗證的 `ATMChart`，並讓 freshness verify 能在 doctor、CI、pre-commit 與 agent-pack flow 中擋住漂移。

## 前置依賴

- TASK-APO-0002

## 輸入

- 計畫書 §2.2、§4、§5、§6.3、§15/M3。
- 已定案命名：`ATMChart` / `atm-chart` / `.atm/memory/atm-chart.md`。

## 輸出

1. `packages/cli/src/commands/atm-chart.ts` 提供 `render` + `verify`。
2. `.atm/memory/atm-chart.md` frontmatter 含 `source_guards_sha256` 與 `source_schema_sha256s`。
3. `atm-chart verify` 在 SSoT drift 時 exit code 2。
4. `agent-pack verify-fresh` 能偵測同一套 source hash 漂移。
5. standard validation profile 納入 ATMChart freshness / verify-fresh。

## 驗收條件

- [x] `packages/cli/src/commands/atm-chart.ts` 提供 `render` + `verify`。
- [x] `.atm/memory/atm-chart.md` 渲染後 frontmatter 含 `source_guards_sha256` 與 `source_schema_sha256s`。
- [x] `default-guards.json` 變更後 `node atm.mjs atm-chart verify` exit code 2。
- [x] `atm agent-pack verify-fresh --id <packId>` 偵測 SSoT 漂移正確 exit code 2。
- [x] `compute-gate.js --profile standard` 或 ATM standard validator 整合 `atm-chart verify` + `verify-fresh`。
- [x] 渲染管線是純函數：相同輸入 sha256 → 相同 output sha256。

## 影響檔案

- `packages/cli/src/commands/atm-chart.ts`
- `packages/cli/src/commands/doctor.ts`
- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/welcome.ts`
- `templates/enforcement/**`
- `scripts/validate-cli.ts`
- `scripts/validate-git-hooks-enforcement.ts`
- `scripts/validate-git-head-evidence.ts`

## 驗證方式

```bash
cmd /c npm run validate:cli
cmd /c npm run validate:git-hooks-enforcement
cmd /c npm run validate:git-head-evidence
cmd /c npm run validate:standard
```

## 回滾策略

移除 `atm-chart` command registration 與 enforcement templates 中的 freshness gate；回復前需確認不破壞 `welcome`。

## Checklist

- [x] render command
- [x] verify command
- [x] stale drift negative fixture
- [x] doctor / next route
- [x] CI / pre-commit recipe

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M3 開卡，採 ATMChart 新命名 | 阻塞: TASK-APO-0002
2026-05-17 | 狀態: done | 驗證: `npm --prefix c:/Users/User/AI-Atomic-Framework run validate:cli` pass；`npm --prefix c:/Users/User/AI-Atomic-Framework run validate:git-hooks-enforcement` pass；`npm --prefix c:/Users/User/AI-Atomic-Framework run validate:git-head-evidence` pass；`npm --prefix c:/Users/User/AI-Atomic-Framework run validate:standard` blocked by pre-existing `package-skeleton` drift on `packages/agent-pack-sdk` / `packages/agent-pack-claude-code` | 變更: upstream commit `b16c1c1 feat: add atm chart freshness gates`，讓 ATMChart render 對同一 SSoT 變成 deterministic，`agent-pack` 補上 `verify-fresh` 與 `--id` alias，並把 freshness gate 串到 enforcement template 與 CLI validator | 阻塞: unrelated M2 package-skeleton drift