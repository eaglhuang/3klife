---
doc_id: doc_team_0080
task_id: TASK-TEAM-0080
title: "Adopt closure-lane residue: defer-foreign-staged propagation, scope shrink, permission-broker test"
status: done
owner: atm-core
priority: P1
milestone: "Team Broker Maintainability"
depends_on:
  - "TASK-TEAM-0078"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/core/src/team-runtime/__tests__/permission-broker.test.ts"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/core/src/team-runtime/__tests__/permission-broker.test.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types --test packages/core/src/team-runtime/__tests__/permission-broker.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the adoption commit as one unit; the residue returns to unowned worktree state."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
completed_at: "2026-07-12T06:21:40.851Z"
completed_by_agent: "codex-captain"
closedAt: "2026-07-12T06:21:40.851Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T06-21-40-797Z-close-594e7b13e228"
lastTransitionAt: "2026-07-12T06:21:40.851Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "81ad10df3ca6dd7865e7f6ff417c183ad3647d32"
---

# TASK-TEAM-0080 Adopt closure-lane residue

## Goal

Adopt three ownerless but proven working-tree changes discovered during the
2026-07-12 TEAM closeouts, so no governed work lives outside a task card:

1. `taskflow close` pre-close delivery commit must propagate
   `--defer-foreign-staged` into the governed `git commit` invocation
   (`taskflow.ts` + `commit-bundle-assembly.ts`), so foreign staged files are
   deferred instead of failing the close-window commit.
2. `tasks scope remove` — a governed scope-shrink sub-action that removes an
   incorrect non-deliverable shared path from an active direction lock
   (`legacy-impl.ts`), recording a `scope-shrink` amendment. Declared
   deliverables are protected and cannot be removed.
3. Adopt the untracked `permission-broker.test.ts` regression for the team
   permission hard gate (fail-closed on missing scope).

## Acceptance Criteria

- `commitTaskflowDeliveryFiles` forwards `deferForeignStaged` and the close
  lane no longer fails when another task's files are staged.
- `tasks scope remove` requires the active claim actor, refuses to remove
  declared deliverables, updates lock + task document, and records the
  amendment transition.
- Permission-broker hard-gate regression is tracked and green.
