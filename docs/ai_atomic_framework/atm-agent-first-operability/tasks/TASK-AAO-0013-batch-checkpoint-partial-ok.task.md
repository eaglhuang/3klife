---
doc_id: doc_other_aao_0013
task_id: TASK-AAO-0013
title: "Checkpoint partial-ok 訊息分層"
status: done
owner: atm-core
priority: P1
milestone: M5
depends_on:
  - "TASK-AAO-0011"
  - "TASK-AAO-0012"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/batch.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
evidence:
  required: command-backed
  closedAt: "2026-05-27T11:05:31.574Z"
  closedByActor: "Augment"
  closureCommit: "893e764a0248c8b4d7ef5b8c9e78173ee74a88f7"
  relatedCommits:
    - "185a7e3a9a7a92fb07da5a7c2b6f75836d6ea1c9"
    - "893e764a0248c8b4d7ef5b8c9e78173ee74a88f7"
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.batch-checkpoint-map"
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
# TASK-AAO-0013 — Checkpoint partial-ok 訊息分層

## Goal

讓 batch checkpoint 把可繼續、需補 evidence、需修 scope、需清 lock 分層回報。

## Why

checkpoint 卡住時，AI 需要知道是可補證據、可修 scope，還是必須停止。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `packages/cli/src/commands/batch.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`

## Acceptance Criteria

- checkpoint fail 輸出 category。
- 每個 category 都有 requiredCommand。
- partial-ok 不會把 task close 成 done。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.batch-checkpoint-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
本任務已由 Augment 於 commit 185a7e3 與 893e764 中完全實作並安全關閉。
