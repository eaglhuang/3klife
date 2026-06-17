---
task_id: TASK-MAO-0051
doc_id: doc_mao_0051
title: "Close window exclusive staged index lock"
status: done
started_at: 2026-06-17T08:50:00Z
started_by_agent: cursor-composer-2.5
owner: atm-core
priority: P1
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0039"
  - "TASK-MAO-0040"
  - "TASK-MAO-0050"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/tasks/close-window-lock.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-close-window-lock.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/git-governance-contract.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/tasks/close-window-lock.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-close-window-lock.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/git-governance-contract.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-close-window-lock.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert close window lock behavior, diagnostics, tests, docs, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.close-window-lock-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Blocking other agents from making ordinary dirty edits outside the close window"
  - "Silent unstage of foreign files"
  - "Changing task claim ownership semantics"
nonGoals:
  - "Do not create a second task lifecycle."
  - "Do not let close open a wider staging race."
completed_at: "2026-06-17T09:07:18.078Z"
completed_by_agent: "cursor-composer-2.5"
delivery_commit: "6595618a6"
close_commit: "82fb0f399"
notes: "Delivery 6595618a6 + close governance 82fb0f399. closeWindowLock releaseOutcome committed."
---

# TASK-MAO-0051 - Close window exclusive staged index lock

## Goal

Reserve an exclusive staged-index slot during a close window so only the active
close can stage and commit the governed bundle until the window is released.

## Implementation Contract

- Record an explicit close-window lock before any stage mutation begins.
- Block competing stage operations while the close window is active.
- Report foreign staged tasks as blockers instead of silently un-staging them.
- Support a governed `--defer-foreign-staged` path that snapshots or restores
  staged foreign work under operator control.
- Release the lock on success, rollback, or aborted close.

## Acceptance Criteria

- Concurrent staging attempts are blocked while a close window is active.
- Operators can see which foreign staged tasks caused the block.
- The lock lifecycle is auditable and leaves no orphan close-window state.
- Tests cover acquire, block, defer, release, and rollback behavior.
