---
doc_id: doc_task_aao_0042
task_id: TASK-AAO-0042
title: "batch repair / continue"
status: planned
owner: atm-core
priority: P0
milestone: M14
depends_on:
  - "TASK-AAO-0024"
  - "TASK-AAO-0037"
  - "TASK-AAO-0041"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/status.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "scripts/validate-task-direction-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/status.ts"
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
  notes: "Revert batch repair commands and return to existing status/checkpoint behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.batch-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Manual deletion of runtime JSON as a normal workflow"
nonGoals:
  - "Solving Git merge conflicts"
  - "Inventing a second batch store"
---
# TASK-AAO-0042 — batch repair / continue

## Goal

Add a repair/continue path for interrupted batches so agents can recover without guessing which lock, evidence, or checkpoint file to touch.

## Why

Long batch runs can stop after evidence, after checkpoint, before commit, or with a released lock still present. Agents need one command that says where they are and how to continue.

## Implementation Contract

- Add `batch repair --batch <id> --json` or equivalent repair diagnostics.
- Add `batch continue --batch <id> --json` if the repair result can safely advance to the next governed step.
- Detect common states: evidence exists but checkpoint missing, checkpoint succeeded but commit window open, released lock still present, task done but batch index not advanced, staged files from previous queue head.
- Each state must return a concrete requiredCommand and avoid suggesting manual `.atm/runtime/**` edits.

## Deliverables

- `packages/cli/src/commands/batch.ts`
- `packages/cli/src/commands/work-channels.ts`
- `packages/cli/src/commands/task-direction.ts`
- `packages/cli/src/commands/status.ts`
- `packages/cli/src/commands/command-specs/batch.spec.ts`
- `scripts/validate-task-direction-governance.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`

## Acceptance Criteria

- Interrupted batch states produce one of: ready-to-implement, evidence-missing, checkpoint-required, commit-window-open, repair-required, or safe-to-continue.
- Repair output includes `batchId`, current task, checkpoint debt, staged file summary, and requiredCommand.
- Active unrelated batches are not modified by repair.
- No repair path instructs agents to hand-edit runtime locks or task events.

## Rollback

Revert the task commit and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.batch-governance-map`
- Map updates: `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This task makes batch interruption boring: ask ATM where you are, then do the one next legal thing.
