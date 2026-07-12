---
task_id: TASK-AAO-0161
title: "Broker close release and runtime snapshot cleanup"
status: planned
owner: atm-core
priority: P0
milestone: Backlog-P0
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-141
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/**"
  - "packages/cli/src/commands/broker.ts"
  - "packages/core/src/broker/**"
  - "scripts/validate-broker-lifecycle.ts"
  - "scripts/validate-governance-commands.ts"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/**"
  - "packages/cli/src/commands/broker.ts"
  - "packages/core/src/broker/**"
  - "scripts/validate-broker-lifecycle.ts"
  - "scripts/validate-governance-commands.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:broker-lifecycle"
  - "npm run validate:governance-commands"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert close-orchestrator Broker release integration and cleanup behavior together; no manual .atm/runtime deletion is part of rollback."
atomizationImpact:
  ownerAtomOrMap: "atm.broker-lifecycle"
  mapUpdates: []
outOfScope:
  - "Changing Team Agents role-provider parsing or Team 0075/0076 implementation files"
  - "Manual deletion of another actor's runtime state"
  - "Changing shared canonical backlog/map paths while another active task owns them"
---

# TASK-AAO-0161 Broker close release and runtime snapshot cleanup

## Problem

`ATM-BUG-2026-07-12-141`: after a governed `taskflow close --write`
successfully closes a task, the task's Broker write intent can remain active
until a captain manually runs `broker release --task <id>`. The same dogfood
path also leaves untracked `.atm/runtime/broker-intents/<task>.json`,
`broker-shared-surface-queues.json`, and `broker-shared-surface-freezes.json`
snapshots even after `broker release` and `broker cleanup` report success.

This was reproduced again while closing `TASK-AAO-0158` and `TASK-AAO-0159`:
both tasks were `done/released`, Broker registry was only cleared after an
explicit release command, and `broker cleanup` did not remove the now-empty
runtime snapshot files from the worktree.

## Goal

Make the successful close path release its own Broker intent and leave no
stale Broker runtime snapshot as untracked worktree residue. Cleanup must be
idempotent and observable, and it must not delete live intents or queues owned
by other active tasks.

## Acceptance Criteria

- `taskflow close --write` releases the closed task's Broker intent after the
  backend close and before the final close transaction reports success.
- Releasing a closed task is idempotent: if no active intent exists, close still
  succeeds and records that no release was needed.
- `broker cleanup` removes empty or stale per-task intent snapshots and empty
  shared-surface queue/freeze snapshot files that no longer correspond to
  active registry state.
- Cleanup never removes live active intents, non-empty shared-surface queues, or
  freeze records for active tasks.
- `broker status` after a successful close reports zero active/effective intents
  for the closed task without requiring a second manual command.
- Focused regressions cover close-time release, idempotent no-op release, empty
  snapshot cleanup, and live snapshot preservation.

## Delivery Sequence

1. Locate the taskflow close writer and Broker cleanup/release surfaces.
2. Add the smallest shared helper needed to release the current task intent and
   prune only stale/empty runtime snapshots.
3. Add focused lifecycle regressions.
4. Run typecheck, broker lifecycle validation, governance command validation,
   and diff whitespace checks.

## Context Map

### Primary
- `packages/cli/src/commands/taskflow.ts`
- `packages/cli/src/commands/taskflow/**`
- `packages/cli/src/commands/broker.ts`

### Secondary
- `packages/core/src/broker/**`
- `scripts/validate-broker-lifecycle.ts`
- `scripts/validate-governance-commands.ts`

### Test Coverage
- Broker lifecycle validator plus existing governance command coverage.
