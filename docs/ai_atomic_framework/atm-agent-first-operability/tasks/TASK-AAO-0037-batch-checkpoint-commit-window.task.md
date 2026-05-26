---
doc_id: doc_task_aao_0037
task_id: TASK-AAO-0037
title: "Batch checkpoint commit window"
status: planned
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "Keeps batch checkpoint and pre-commit scopes aligned after queue advance."
milestone: M13
depends_on:
  - "TASK-AAO-0013"
  - "TASK-AAO-0014"
  - "TASK-AAO-0024"
  - "TASK-AAO-0032"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-direction-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "scripts/validate-task-direction-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-direction-governance.ts --mode validate"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the checkpoint-window implementation and remove any added runtime compatibility handling."
atomizationImpact:
  ownerAtomOrMap: "atm.batch-checkpoint-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing task card import semantics"
  - "Weakening deliverable or evidence gates"
nonGoals:
  - "Allowing commit without checkpoint"
  - "Letting a later task close before the queue head is delivered"
---
# TASK-AAO-0037 — Batch checkpoint commit window

## Goal

讓 `batch checkpoint -> git commit` 有一個正式的上一張卡提交窗口。Checkpoint 成功後，即使 batch 已經推進到下一張任務，pre-commit 仍然要允許上一張已 checkpoint 任務的 deliverables、task ledger、evidence、task-events 一起提交。

## Why

實戰中 checkpoint 成功後，ATM 會建立下一張 task 的 direction lock。代理人要提交上一張任務時，pre-commit 可能拿下一張 lock 判斷，誤報 scope drift。這不是代理人想繞過治理，而是狀態推進和提交時機沒有銜接好。

## Implementation Contract

- Batch checkpoint 成功時要記錄 `checkpointedCommitWindow`，至少包含 `batchId`、`taskId`、合法 commit files、createdAt、expiresWhenCommitted 或等價資訊。
- Pre-commit 若看到 staged files 屬於 checkpointed task，應使用 checkpoint window 判斷，而不是只看 current queue head lock。
- `batch status` 或 checkpoint 回覆要明確提示下一步 commit command。
- Queue 可以前進，但上一張卡的提交窗口不能被下一張 lock 反咬。
- 不得把 checkpoint window 變成跳過 evidence / closure / validator 的後門。

## Deliverables

- `packages/cli/src/commands/batch.ts`
- `packages/cli/src/commands/hook.ts`
- `packages/cli/src/commands/task-direction.ts`
- `packages/cli/src/commands/work-channels.ts`
- `packages/cli/src/commands/command-specs/batch.spec.ts`
- `scripts/validate-task-direction-governance.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`

## Acceptance Criteria

- Checkpoint 關閉 TASK-A 後，batch 可推進 TASK-B，但 staged TASK-A deliverables + `.atm/history/tasks/TASK-A.json` + evidence + task-events 可通過 pre-commit。
- 若 staged files 不屬於 TASK-A checkpoint window，也不屬於 TASK-B current lock，仍被擋。
- `batch status --batch <id>` 顯示 pending commit window 與 required commit command。
- Checkpoint window 在 commit 後清掉或被視為 satisfied。
- Regression test 覆蓋 checkpoint 後 commit 不被下一張 lock 誤擋。

## Rollback

Revert this task commit. If runtime compatibility files were added, remove their use and let existing batch checkpoint behavior resume.

## Atomization Impact

- Owner atom/map: `atm.batch-checkpoint-map`
- Map updates: `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

這張卡修的是「已經合法 checkpoint 的上一張任務如何被提交」，不是放寬任務完成條件。
