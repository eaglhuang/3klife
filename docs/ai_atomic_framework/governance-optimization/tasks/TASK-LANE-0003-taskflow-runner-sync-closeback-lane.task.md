---
task_id: TASK-LANE-0003
title: Taskflow runner-sync closeback lane
status: done
owner: atm-core
priority: P0
depends_on:
  - TASK-LANE-0002
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/broker/steward-queues.ts
  - tests/cli/taskflow-stale-runner-lane.test.ts
deliverables:
  - packages/cli/src/commands/taskflow/implementation.ts
  - tests/cli/taskflow-stale-runner-lane.test.ts
validators:
  - node --strip-types tests/cli/taskflow-stale-runner-lane.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert taskflow stale-runner chain output and focused regression.
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-closeback
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.taskflow-runner-sync-closeback
      pattern: Policy Object
      source: packages/cli/src/commands/taskflow/implementation.ts
      disposition: follow-up-card
      inlineReason: null
outOfScope:
  - lane session schema or command work
  - rewriting taskflow implementation wholesale
  - direct runner build execution inside taskflow close
nonGoals:
  - Do not make taskflow close silently mutate the runner-sync queue
completed_at: "2026-07-16T16:44:09.795Z"
completed_by_agent: "codex-lane-0003"
closedAt: "2026-07-16T16:44:09.795Z"
closedByActor: "codex-lane-0003"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T16-44-09-658Z-close-67678cc284ea"
lastTransitionAt: "2026-07-16T16:44:09.795Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f5c1865761557a6f977125ee46a822de89379f66"
---

# TASK-LANE-0003 - Taskflow Runner-sync Closeback Lane

## Goal

Turn stale-runner closeback into a structured operator lane that tells the
captain whether to enqueue, wait, cleanup an orphan head, build, or retry close.

## Acceptance

- Stale-runner taskflow blockers inspect the runner-sync steward queue.
- When not enqueued, the blocker includes the enqueue command.
- When queued behind another head, the blocker reports position and
  `queueHeadHealth`.
- When the head is orphaned, the blocker includes cleanup guidance from
  `TASK-LANE-0002`.
- When the current task is queue head and build receipt is present, close may
  proceed.
- Optional `--await-runner-sync` or equivalent next-action chain output exposes
  enqueue -> build@head -> close as copyable steps.

## Notes

`taskflow/implementation.ts` is a risky surface. Use anchor-level edits and keep
diffs small; extraction may be deferred only if the task records why.

