---
task_id: TASK-LANE-0002
title: Runner-sync queue health admission
status: planned
owner: atm-core
priority: P0
depends_on:
  - TASK-LANE-0001
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/broker/steward-queues.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - tests/cli/runner-sync-orphan-head.test.ts
deliverables:
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/broker/steward-queues.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - tests/cli/runner-sync-orphan-head.test.ts
validators:
  - node --strip-types tests/cli/runner-sync-orphan-head.test.ts
  - node --strip-types tests/cli/runner-sync-steward-release.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert queue-health admission changes and the orphan-head regression.
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync-admission
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates: []
outOfScope:
  - taskflow close chain output
  - lane session schema or command work
  - broad broker registry refactors
nonGoals:
  - Do not replace the steward queue model
---

# TASK-LANE-0002 - Runner-sync Queue Health Admission

## Goal

Prevent orphaned tasks from entering or blocking the runner-sync steward queue,
and report a governed cleanup exit when an existing head is unhealthy.

## Acceptance

- Enqueue rejects missing or terminal task ids with
  `ATM_RUNNER_SYNC_ENQUEUE_TASK_INVALID`.
- Queue position/status evidence includes `queueHeadHealth`.
- Runner-sync admission reports `ATM_RUNNER_SYNC_QUEUE_HEAD_ORPHANED` when a
  non-head request is blocked by an unhealthy head.
- The orphaned-head response includes a copyable cleanup command.
- Focused CLI regression proves: orphan enqueue is rejected, orphan head blocks
  with cleanup guidance, cleanup promotes a healthy waiter.

## Notes

This card builds directly on `TASK-LANE-0001` and must not reimplement a second
task health resolver.

