---
task_id: TASK-MAO-0038
doc_id: doc_mao_0038
title: "Closeback orchestration route correctness"
status: done
started_at: "2026-06-17T00:52:17+08:00"
started_by_agent: agent-007
owner: atm-core
priority: P0
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0036"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/tasks/residue-diagnostics.ts"
  - "packages/cli/src/commands/tasks/surface-invariants.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "tests/cli/taskflow-close-orchestration.test.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/residue-diagnostics.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/tasks/residue-diagnostics.ts"
  - "packages/cli/src/commands/tasks/surface-invariants.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "tests/cli/taskflow-close-orchestration.test.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/residue-diagnostics.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/taskflow-close-orchestration.test.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/residue-diagnostics.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert closeback route table, waiver passthrough, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.closeback-route-correctness-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing normal live task close semantics"
  - "Closing tasks from repair-closure"
  - "Permitting unreviewed out-of-scope delivery"
nonGoals:
  - "Do not add a manual lifecycle loop outside taskflow."
  - "Do not weaken historical delivery scope validation."
completed_at: "2026-06-17T01:46:29.847Z"
completed_by_agent: "agent-007"
delivery_commit: "13eff3bbeed2d4e52fa798b1c005e9b748f5a415"
---

# TASK-MAO-0038 - Closeback orchestration route correctness

## Goal

Fix closeback routing defects exposed by `TASK-MAO-0009` and `TASK-MAO-0010`
so taskflow keeps waiver intent, selects the right residue bucket, and does not
send operators to the wrong backend repair surface.

## Implementation Contract

- Pass `--waiver-out-of-scope-delivery` and `--reason` through
  `buildTasksReconcileCommand`.
- Add an explicit residue route table for:
  - closure packet exists but ledger is not done;
  - planning record says done but target ledger is not done;
  - mixed delivery commit requiring historical-delivery waiver;
  - manual done or stale import states.
- Introduce a `closeback-finalize` bucket that points to taskflow close with
  historical delivery instead of premature import.
- Guard or rename `repair-closure` behavior so an existing packet with a non-done
  ledger returns `ATM_REPAIR_CLOSURE_NOT_CLOSE` and tells the operator to use
  taskflow close.
- Dry-run mixed delivery commits must list out-of-scope files and the exact
  approval permission needed.

## Acceptance Criteria

- Historical delivery with an approved waiver can reach the backend with the
  waiver preserved.
- Existing packet plus non-done ledger no longer routes to packet repair as if
  repair could close the task.
- Regression tests cover the 0009 out-of-scope file case and the 0010 dirty
  report drift case.
- This task consolidates backlog item `ATM-BUG-2026-06-15-004`.
