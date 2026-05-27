---
doc_id: doc_other_aao_0024
task_id: TASK-AAO-0024
title: "batch status 增強"
status: done
owner: atm-core
priority: P0
milestone: M8
depends_on:
  - "TASK-AAO-0014"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.batch-run-map"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "新增 script / CLI / validator 時，同卡必須更新 atomization ownership map，不把 ownership 留給後續卡。"
outOfScope:
  - "手改 .atm/runtime/**"
  - "把 .atm/history/** 當作功能交付物"
  - "修改 unrelated 3KLife dirty files"
nonGoals:
  - "不在本卡完成整個 AAO 計畫"
  - "不建立第二套 task lifecycle"
  - "不繞過 ATM evidence gate"
---
# TASK-AAO-0024 — batch status 增強

## Goal

讓 `batch status` 能顯示 batchId、queue head、phase、缺 evidence、可執行下一步。

## Why

中斷續跑時，AI 最需要的是狀態面板，而不是重新猜 claim/checkpoint 順序。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `packages/cli/src/commands/batch.ts`
- `packages/cli/src/commands/command-specs/batch.spec.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`

## Acceptance Criteria

- 多 active batch 時可選 batchId。
- status 顯示 current task 與 phase。
- 輸出 requiredCommand。


<!-- AAO-feedback-0024-compact-current-status -->
## Throughput Reinforcement Acceptance

- Add compact output modes: `node atm.mjs batch current --compact --json` and `node atm.mjs batch status --compact --json`.
- Compact output must include only the active batch id, queue head task id/title/status, allowedFiles, focused validators, checkpoint debt, and the next required command.
- Compact output must not dump the whole batch queue unless explicitly requested with a verbose/detail flag.
- Regression evidence must prove a large AAO batch returns a bounded compact payload that an agent can read quickly.
<!-- /AAO-feedback-0024-compact-current-status -->

<!-- AAO-feedback-0024-no-huge-status-json -->
## Throughput Reinforcement Acceptance: Compact Batch Status

- `batch current --compact --json` and `batch status --compact --json` must be the recommended agent-facing status commands for active batch work.
- Compact mode must return a bounded payload: `batchId`, `currentTaskId`, `currentTaskTitle`, `phase`, `allowedFiles`, `focusedValidators`, `checkpointDebt`, and `requiredCommand`.
- Compact mode must not include the full task queue, full integration bootstrap report, or all task records unless the caller passes an explicit verbose/debug flag.
- Regression evidence must show a large AAO batch produces a small compact response suitable for AI parsing.
<!-- /AAO-feedback-0024-no-huge-status-json -->

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.batch-run-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
