---
task_id: TASK-AAO-0205
title: "Keep framework-claim isolated index closed over unstaged release dirt"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-14-182
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if the fix regresses governed close/commit safety."
atomizationImpact:
  ownerAtomOrMap: "atm.cli-governance-map"
  mapUpdates: []
outOfScope:
  - "release/**"
  - "Editing .atm/history or .atm/runtime by hand"
completed_at: "2026-07-14T04:21:37.679Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T04:21:37.679Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T04-21-37-679Z-close-0cc14c686c3b"
lastTransitionAt: "2026-07-14T04:21:37.679Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c76526d1b45f3fcda83554bb7671b7154b140b38"
---

# TASK-AAO-0205 Keep framework-claim isolated index closed over unstaged release dirt

## Problem

ATM-BUG-2026-07-14-182: Framework temp claims with --defer-foreign-staged can still absorb unstaged dirty release mirrors outside the claim scope.

## Goal

- Isolated claim-allowed index must not auto-include unstaged out-of-claim release mirrors.
- Extend staging regression for narrow skill claim + dirty release.
- Mark backlog 182 Fixed.
