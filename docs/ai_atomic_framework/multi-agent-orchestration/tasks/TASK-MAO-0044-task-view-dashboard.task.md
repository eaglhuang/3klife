---
task_id: TASK-MAO-0044
doc_id: doc_mao_0044
title: "Task-view dashboard over preflight summary"
status: planned
owner: atm-core
priority: P2
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0039"
  - "TASK-MAO-0043"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/commands/task-view.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/command-specs.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "packages/cli/README.md"
  - "tests/cli/task-view-dashboard.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/commands/task-view.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "packages/cli/README.md"
  - "tests/cli/task-view-dashboard.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/task-view-dashboard.test.ts"
  - "npm run validate:neutrality"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert task-view command, command specs, docs, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.task-view-dashboard-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Duplicating task status logic"
  - "Closing or repairing tasks from task-view"
  - "Replacing next as the deterministic router"
nonGoals:
  - "Do not make task-view a second task lifecycle."
---

# TASK-MAO-0044 - Task-view dashboard over preflight and completion summary

## Goal

Provide a single read-only command that summarizes task status, evidence,
blockers, last event, residue bucket, completion state, and next safe operator
action.

## Implementation Contract

- Build `atm task-view --task <id> --json` on top of the same summary model used
  by dry-run/preflight behavior.
- Include human-readable output and stable JSON.
- Point to the correct next command without claiming, repairing, or closing.
- Update CLI help and user workflow docs.
- Show a close completion checklist with explicit fields for:
  - ledger done;
  - target governance committed;
  - planning mirror committed;
  - lifecycle events recorded in git;
  - delivery SHA;
  - waiver reason.
- Flag partial close states so operators can see when a task is only half
  finished even if one ledger already says done.

## Acceptance Criteria

- Operators no longer need to combine `next`, `tasks status`, `evidence show`,
  and `doctor` to understand one task.
- `task-view` remains read-only and does not compete with `next`.
- The command is covered by CLI tests and help/spec docs.
- The dashboard makes close incompleteness visible without requiring chat
  history or manual git archaeology.
