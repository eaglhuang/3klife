---
doc_id: doc_task_aao_0045
task_id: TASK-AAO-0045
title: "non-overlap subagent execution policy"
status: planned
owner: atm-core
priority: P2
milestone: M15
depends_on:
  - "TASK-AAO-0024"
  - "TASK-AAO-0034"
  - "TASK-AAO-0041"
  - "TASK-AAO-0042"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "scripts/validate-task-direction-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/next.ts"
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
  notes: "Revert subagent policy and return to fully serial batch execution."
atomizationImpact:
  ownerAtomOrMap: "atm.batch-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Spawning uncontrolled agents"
  - "Parallel work on overlapping files"
  - "Weakening checkpoint/evidence gates"
nonGoals:
  - "Replacing batch queue head governance"
  - "Solving Git merge conflicts automatically"
---
# TASK-AAO-0045 — non-overlap subagent execution policy

## Goal

Define the safe policy and diagnostics for optional subagent / parallel execution when task scopes do not overlap.

## Why

Subagents can help throughput, but AAO tasks often share `next.ts`, `hook.ts`, `package.json`, and validator files. Parallelism must be an explicit safe lane, not the default escape hatch.

## Implementation Contract

- Add a planner/checker that can identify independent tasks by dependencies, `scopePaths`, `deliverables`, and active batch ownership.
- Only tasks with no dependency debt and no target file overlap may be proposed for subagent execution.
- Any proposed parallel lane must include task ids, allowed files, validators, expected evidence, and a merge/commit order.
- ATM must refuse parallel execution when tasks share files, share locks, or require the same queue head.

## Deliverables

- `packages/cli/src/commands/batch.ts`
- `packages/cli/src/commands/next.ts`
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

- ATM can output a safe parallelism proposal only for non-overlapping, dependency-satisfied tasks.
- If two tasks touch the same file, ATM reports the overlap and keeps the tasks serial.
- Parallel proposals do not bypass evidence, checkpoint, or commit gates.
- The default batch behavior remains serial unless the user explicitly asks for parallel/subagent planning.

## Rollback

Revert the task commit and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.batch-governance-map`
- Map updates: `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This is deliberately last in the throughput sequence. Compact output, idempotent claim, validator cache, and repair diagnostics must land before parallel execution is useful.
