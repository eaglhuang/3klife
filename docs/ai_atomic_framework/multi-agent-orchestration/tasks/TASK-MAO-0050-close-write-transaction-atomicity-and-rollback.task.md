---
task_id: TASK-MAO-0050
doc_id: doc_mao_0050
title: "Close write transaction atomicity and rollback"
status: done
started_at: 2026-06-17T06:30:00Z
started_by_agent: cursor-composer-2.5
owner: atm-core
priority: P0
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0036"
  - "TASK-MAO-0039"
  - "TASK-MAO-0040"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-close-atomicity.test.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/historical-batch-evidence.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-close-atomicity.test.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/historical-batch-evidence.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-close-atomicity.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert close transaction boundary changes, rollback helpers, tests, docs, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.close-write-atomicity-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Leaving a done ledger behind after a failed write commit"
  - "Making rollback depend on chat-only operator intervention"
  - "Changing claim semantics outside close write transaction handling"
nonGoals:
  - "Do not introduce a second close lifecycle."
  - "Do not make write close best-effort."
completed_at: "2026-06-17T06:48:45.928Z"
completed_by_agent: "cursor-composer-2.5"
lastTransitionId: "2026-06-17T06-48-45-410Z-close-a99adad01962"
delivery_commit: "971ae3374ae4bd9393827e1632d4bda4eac0f5fb"
---

# TASK-MAO-0050 - Close write transaction atomicity and rollback

## Goal

Make `taskflow close --write` fail closed as a transaction: verify the bundle,
write the close record, commit target and planning mirrors, and roll back the
close transition if any step fails.

## Implementation Contract

- Verify the active bundle before any write side effect.
- Commit target and planning mirror changes as one transaction boundary from
  the operator's point of view.
- If any write step fails, restore the prior close state and do not leave a
  done ledger behind.
- Surface explicit transaction state in JSON so operators can see whether the
  close is pending, committed, or rolled back.
- Update closeback docs to describe the transaction boundary and recovery path.

## Acceptance Criteria

- A simulated commit failure leaves the task not-done and exposes a recovery
  path.
- The close path never reports success while leaving a done ledger stranded on
  disk.
- Tests cover the rollback branch, the success branch, and the partial-failure
  branch.
