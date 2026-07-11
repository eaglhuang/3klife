---
doc_id: doc_team_0069
task_id: TASK-TEAM-0069
title: "Release canonical direction lock during stale lock cleanup"
status: done
owner: atm-core
priority: P0
milestone: M10X
depends_on:
  - "TASK-TEAM-0067"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/__tests__/lock-cleanup.spec.ts"
deliverables:
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/__tests__/lock-cleanup.spec.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/lock-cleanup.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert canonical direction-lock cleanup and its regression together."
atomizationImpact:
  ownerAtomOrMap: "atm.task-lock-cleanup"
  mapUpdates: []
outOfScope:
  - "Changing emergency approval policy"
  - "Changing active lock admission"
---
# TASK-TEAM-0069 Release canonical direction lock during stale lock cleanup

## Trigger

`tasks lock cleanup --all-stale` reported successful cleanup for a terminal,
released task and released the runtime lock's embedded direction lock, but left
the canonical task JSON `taskDirectionLock.status` active. Taskflow close then
continued to report a stale broker takeover requirement.

## Acceptance Criteria

- Stale lock cleanup releases the canonical task document direction lock as
  well as runtime lock and sidecar state.
- The cleanup report names the canonical cleanup action.
- Regression coverage proves a terminal released task no longer retains an
  active canonical direction lock after cleanup.
