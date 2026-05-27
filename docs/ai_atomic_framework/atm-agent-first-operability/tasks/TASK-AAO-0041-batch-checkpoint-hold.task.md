---
doc_id: doc_task_aao_0041
task_id: TASK-AAO-0041
title: "batch checkpoint --hold"
status: done
owner: atm-core
priority: P0
milestone: M14
depends_on:
  - "TASK-AAO-0037"
  - "TASK-AAO-0024"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "scripts/validate-task-direction-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/task-direction.ts"
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
  notes: "Revert checkpoint hold changes and return batch checkpoint to automatic advance behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.batch-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing task card format"
  - "Adding unrelated commit automation"
nonGoals:
  - "Replacing normal checkpoint"
  - "Changing git merge behavior"
---
# TASK-AAO-0041 — batch checkpoint --hold

## Goal

Add a governed `batch checkpoint --hold` mode that closes the current queue head but does not immediately claim or lock the next task.

## Why

Agents often need a clean commit window after checkpoint. Auto-claiming the next task can make the next direction lock conflict with the previous task's staged closure files.

## Implementation Contract

- `batch checkpoint --hold` closes the current task through the normal checkpoint path.
- It records the batch position as paused/held after the closed task.
- It prints the next command to continue, for example `node atm.mjs next --claim --actor <id> --batch <batchId> --json`.
- Normal checkpoint behavior remains available when `--hold` is not used.

## Deliverables

- `packages/cli/src/commands/batch.ts`
- `packages/cli/src/commands/work-channels.ts`
- `packages/cli/src/commands/task-direction.ts`
- `packages/cli/src/commands/command-specs/batch.spec.ts`
- `scripts/validate-task-direction-governance.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`

## Acceptance Criteria

- `batch checkpoint --hold --batch <id>` closes only the current task and does not create the next task direction lock.
- `batch status --batch <id>` shows the held state and the exact resume command.
- The previous task can be committed after hold without being blocked by the next task's scope.
- The batch can resume from the next queue item without rebuilding the batch.

## Rollback

Revert the task commit and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.batch-governance-map`
- Map updates: `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This is a usability valve, not a weaker checkpoint. It changes timing, not evidence requirements.
