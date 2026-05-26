---
doc_id: doc_other_1024
task_id: TASK-ASA-0017
title: 修正 public command coverage 計分來源
milestone: M17
status: planned
owner: atm-release
priority: P0
depends_on: [TASK-ASA-0016]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
public_tracking: false
started_at: null
started_by_agent: null
completed_at: null
---

# TASK-ASA-0017 修正 public command coverage 計分來源

## 背景

ASA-0016 的 graduation decision record 顯示 `public_command_coverage: 0`，但 ASA-0009 已建立 command spec catalog，且 `validate:cli` 能驗證公開命令。這代表 scorer 沒有讀到新的 command-spec 來源，而不是 CLI command atomization 完全缺失。

## 目標

讓 `atomize score` / `validate:atm-self-atomization` 以 `packages/cli/src/commands/command-specs/*` 和 command registry 作為 public command coverage 的主要資料來源。

## 交付物

- 更新 `scripts/src/atomize-score.js` 或 scoring helper，讀取 command-spec catalog。
- 更新 `atomic_workbench/atomization-coverage/dogfood-score.json` 與 `.md`。
- 補回 command coverage 的可重現 validator evidence。

## 驗收標準

- `node atm.mjs atomize score --repo . --json` 的 `public_command_coverage` 不再是假性 0。
- `npm run validate:cli` 通過。
- 若仍未達 pass threshold，報告必須列出真實缺口 command，而不是只給 0。

## 驗證命令

```bash
node atm.mjs atomize score --repo . --json
npm run validate:cli
```

## Rollback

Revert scorer changes and regenerate dogfood score from the previous scorer implementation.

## Notes

- 2026-05-26 | status: planned | evidence: pending | reason: ASA structural graduation exposed command coverage scorer instrumentation gap.
