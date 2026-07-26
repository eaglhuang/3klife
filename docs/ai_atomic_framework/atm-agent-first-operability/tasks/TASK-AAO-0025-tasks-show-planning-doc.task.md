---
doc_id: doc_other_aao_0025
task_id: TASK-AAO-0025
title: "tasks show --planning-doc"
status: superseded
owner: atm-core
priority: P1
milestone: M8
depends_on:
  - "TASK-AAO-0010"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
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
  ownerAtomOrMap: "atm.task-ledger-governance-map"
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
# TASK-AAO-0025 — tasks show --planning-doc

## Supersession

Superseded by the current `tasks show --task <id>` task-contract projection and
planning-source seal. The remaining request to print raw planning Markdown is
a convenience feature, not a current governance or Plan 3.1 delivery gap.
Open a new, narrow UX card only if direct raw planning-section output becomes a
confirmed user need.

## Goal

提供快速查任務原始計畫段落與 task card frontmatter 的 CLI。

## Why

AI 常常不知道任務卡到底要求什麼，只好讀一堆檔。這個命令把 planning doc 和 task contract 一次列出。

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

## Acceptance Criteria

- `tasks show --task <id> --planning-doc` 可輸出 source plan/path/section。
- 輸出區分 read-only planning 與 target work。
- 已 import task 與 markdown task 都支援。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.task-ledger-governance-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
