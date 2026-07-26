---
doc_id: doc_other_aao_0031
task_id: TASK-AAO-0031
title: "Background work pause advisory"
status: superseded
owner: atm-core
priority: P2
milestone: M9
depends_on:
  - "TASK-AAO-0024"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/status.ts"
  - "packages/cli/src/commands/handoff.ts"
  - "packages/cli/src/commands/batch.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/status.ts"
  - "packages/cli/src/commands/handoff.ts"
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
  ownerAtomOrMap: "atm.agent-handoff-map"
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
# TASK-AAO-0031 — Background work pause advisory

## Supersession

Superseded by the current `atm status --json` active-worker dashboard, which
reports worker heartbeat, TTL, expiry state, scope, and lock path without
automatically stopping a process. Explicit pause, checkpoint, or handoff
recommendations remain optional UX work and require a new narrow card if they
become a confirmed operator need.

## Goal

讓 ATM 在偵測長時間或背景工作未收尾時，提醒 agent 暫停、checkpoint 或 handoff。

## Why

長流程中 AI 容易忘記背景命令或半完成狀態。ATM 應該給 pause/handoff advisory。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `packages/cli/src/commands/status.ts`
- `packages/cli/src/commands/handoff.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`

## Acceptance Criteria

- status 顯示 stale running command/lock。
- batch status 給 pause/checkpoint/handoff 建議。
- 不自動殺程序，只提供治理訊號。


<!-- AAO-feedback-0031-active-session -->
## Feedback Reinforcement Acceptance

- Advisory text must be paired with machine-readable state: `.atm/runtime/active-session.json` records active batch/task, claimed tasks, actor, lastHeartbeatAt, and expiresAt.
- Add `atm status --background-safe` semantics: exit 0 means background sync/restore may proceed; exit 1 means an active claim or checkpoint debt should pause automation.
- The active-session contract must be documented so external sync/restore tools can check ATM state without parsing human prose.
<!-- /AAO-feedback-0031-active-session -->

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.agent-handoff-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
