---
task_id: TASK-LANE-0001
title: Runner-sync orphan queue-head cleanup
status: planned
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-LANE-0001-runner-sync-orphan-cleanup.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
  - packages/cli/src/commands/broker/steward-queues.ts
  - tests/cli/runner-sync-steward-release.test.ts
deliverables:
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
  - packages/cli/src/commands/broker/steward-queues.ts
validators:
  - node --strip-types packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
  - node --strip-types tests/cli/runner-sync-steward-release.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert runner-sync cleanup resolver changes and focused tests.
atomizationImpact:
  ownerAtomOrMap: atm.broker-runner-sync-steward-queue
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates: []
outOfScope:
  - taskflow close stale-runner lane changes
  - lane session schema or command work
  - manual edits to .atm/runtime or .atm/history
nonGoals:
  - Do not make packages/core import task-ledger readers from packages/cli
---

# TASK-LANE-0001 - Runner-sync Orphan Queue-head Cleanup

## Goal

Allow runner-sync steward cleanup to release a queue head whose task no longer
exists or is already terminal, without waiting for TTL and without adding a
core-to-cli dependency.

## Acceptance

- `RunnerSyncTaskHealth` and `TaskHealthResolver` are defined in the core queue
  module.
- `cleanupRunnerSyncStewardQueue` releases stale entries when TTL expires or the
  resolver reports `task-missing` or `task-terminal`.
- Stale release records include a reason:
  `ttl-expired`, `orphan-task-missing`, or `orphan-task-terminal`.
- CLI cleanup injects a resolver that checks the task ledger without importing
  CLI code into core.
- Cleanup output lists released entries with reason and safe retry guidance.
- Existing TTL-only behavior remains unchanged when no resolver is supplied.

## Notes

This card is opened from the 3KLife planning repository and targets
AI-Atomic-Framework. It precedes lane-session work because a dead runner-sync
queue head can block close/build governance for unrelated implementation cards.

