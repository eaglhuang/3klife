---
doc_id: doc_other_aao_0010
task_id: TASK-AAO-0010
title: "正式 tasks scope --add scope amendment CLI"
status: planned
owner: atm-core
priority: P0
milestone: M5
depends_on:
  - "TASK-AAO-0009"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-direction-governance.ts --mode validate"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.task-direction-map"
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
# TASK-AAO-0010 — 正式 tasks scope --add scope amendment CLI

## Goal

提供正式 scope amendment 入口，避免 AI 手改 direction lock 或 runtime JSON。

## Why

TASK-ASA-0005 實戰中 AI 想直接編輯 lock allowedFiles。這不是 AI 壞，是缺正式出口。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/command-specs/tasks.spec.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`

## Acceptance Criteria

- 新增或強化 `tasks scope --add`。
- scope amendment 寫 transition/report，不手改 runtime。
- pre-tool 看到手改 lock 會給 requiredCommand。


<!-- AAO-feedback-0010-prewrite -->
## Feedback Reinforcement Acceptance

- Pre-write detection is required: when a write/edit/pre-tool request targets a path outside `taskDirectionLock.allowedFiles`, ATM must return `ATM_SCOPE_AMENDMENT_SUGGESTED` before the write occurs, including the exact `node atm.mjs tasks scope --add ... --json` command.
- Scope amendment must support multiple paths in one command, for example `tasks scope --add path1,path2,path3`, and record them as one atomic amendment event.
- Agents must never be told to edit `.atm/runtime/locks/**` directly; all scope widening goes through this CLI.
<!-- /AAO-feedback-0010-prewrite -->

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.task-direction-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
