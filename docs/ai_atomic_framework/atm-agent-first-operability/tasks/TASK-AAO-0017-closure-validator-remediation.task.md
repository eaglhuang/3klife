---
doc_id: doc_other_aao_0017
task_id: TASK-AAO-0017
title: "Closure packet 缺 validator 的可操作修正"
status: planned
owner: atm-core
priority: P0
milestone: M6
depends_on:
  - "TASK-AAO-0015"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/batch.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.task-closure-map"
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
# TASK-AAO-0017 — Closure packet 缺 validator 的可操作修正

## Goal

當 close/checkpoint 缺 validator pass 時，直接輸出可執行補救指令。

## Why

AI 在 ASA-0016 卡住時看不到真正 blocking gate。缺 validator 要變成可修復工作單。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/batch.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`

## Acceptance Criteria

- close/checkpoint fail 含 missingValidationPasses。
- 每個 missing pass 有 suggested evidence command。
- blockingFindings[] 包含所有 gate，而非只列 audit。


<!-- AAO-feedback-0017-evidence-missing -->
## Feedback Reinforcement Acceptance

- Add a pre-close query path such as `node atm.mjs evidence missing --task <id> --json` so agents can see required validators/evidence before attempting close or checkpoint.
- Closure errors must include the same missing evidence list plus one concrete `requiredCommand` per missing category.
- The command must distinguish absent evidence, failed command runs, stale evidence, and diagnostic-only evidence.
<!-- /AAO-feedback-0017-evidence-missing -->

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.task-closure-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
