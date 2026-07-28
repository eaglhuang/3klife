---
doc_id: doc_task_aao_0042
task_id: TASK-AAO-0042
title: "batch repair / continue"
status: done
owner: atm-core
priority: P0
milestone: M14
started_at: "2026-06-20T12:00:00+08:00"
started_by_agent: "cursor-gpt-5.2"
depends_on: []
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
completed_at: "2026-06-20T03:06:28.469Z"
completed_by_agent: "cursor-gpt-5.2"
lastTransitionId: "2026-06-20T03-30-51-135Z-repair-closure-bdfa61353c82"
delivery_commit: "926f7211b"
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


<!-- AAO-feedback-0042-abandon-stale-queue -->
## Practical Feedback Reinforcement

- `batch abandon --batch <id>` must invalidate or detach its task queue in the same operation; a later `next --claim` must not reuse an abandoned batch id or its old queue id.
- If a legacy queue still points at an abandoned batch, `next --claim` must return a repair diagnostic or create a fresh batch/queue, never silently revive the stale queue.
- `batch repair --batch <id>` must detect abandoned-batch-with-active-queue and offer one concrete cleanup command that replaces today's manual sequence of `tasks queue abandon`, lock release, and task reset.
- Regression evidence must cover the exact case: abandon old AAO batch ending at `TASK-AAO-0040`, re-import cards through `TASK-AAO-0044`, then claim a new batch whose taskIds include `0041-0044`.
<!-- /AAO-feedback-0042-abandon-stale-queue -->

## Rollback

Revert the task commit and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.batch-governance-map`
- Map updates: `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This task makes batch interruption boring: ask ATM where you are, then do the one next legal thing.
