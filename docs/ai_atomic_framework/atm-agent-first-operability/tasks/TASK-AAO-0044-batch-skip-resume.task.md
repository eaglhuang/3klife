---
doc_id: doc_task_aao_0044
task_id: TASK-AAO-0044
title: "batch skip / resume"
status: done
owner: atm-core
priority: P1
milestone: M14
started_at: "2026-06-20T12:30:00+08:00"
started_by_agent: "cursor-gpt-5.2"
depends_on:
  - "TASK-AAO-0042"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert skip/resume state transitions and re-run ledger governance validation."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Silently dropping tasks from a batch"
  - "Using skip as done"
nonGoals:
  - "Weakening dependency gates"
completed_at: "2026-06-20T05:55:07.631Z"
completed_by_agent: "cursor-gpt-5.2"
lastTransitionId: "2026-06-20T05-55-07-548Z-close-8eb6fa8c8c80"
delivery_commit: "8c2fa16d3fc655c31d1974112edd767685415eaa"
---
# TASK-AAO-0044 — batch skip / resume

## Goal

Add an auditable way to temporarily skip a blocked batch task and resume it later with evidence requirements intact.

## Why

A batch may hit an external blocker. ATM needs a governed escape hatch that preserves the task instead of forcing agents to abandon the whole batch or fake completion.

## Implementation Contract

- Add `batch skip --task <id> --reason <reason> --batch <id> --json`.
- Skipped tasks remain in the batch record with status/reason and are not counted as done.
- Add `batch resume --task <id> --batch <id> --json` to return a skipped task to the queue when its blocker is resolved.
- Skipping requires a reason and writes an auditable skip event.

## Deliverables

- `packages/cli/src/commands/batch.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/work-channels.ts`
- `packages/cli/src/commands/command-specs/batch.spec.ts`
- `scripts/validate-task-ledger-governance.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`

## Acceptance Criteria

- `batch skip` advances the batch only when the current task has a recorded blocker reason and no fake done closure.
- `batch resume` puts the skipped task back into a governed queue and requires normal evidence before closure.
- Audit output distinguishes skipped, done, blocked, and open tasks.
- Skip/resume cannot bypass dependency gates or deliverable gates.

## Rollback

Revert the task commit and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.task-ledger-governance-map`
- Map updates: `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

Skip is not success. It is a traceable pause with a reason.

Closure sync: delivery `8c2fa16d3fc655c31d1974112edd767685415eaa`; close governance `f1a08aee4ae7534d0ee9b72f47c508282fb4fa49`; Team L2 `team-99172e69ab4a` (editor-subagent bridge). Pre-commit hook fix: strip `GIT_INDEX_FILE` from validator subprocess env + direction-lock covers framework critical files (`packages/cli/src/commands/hook.ts`).
