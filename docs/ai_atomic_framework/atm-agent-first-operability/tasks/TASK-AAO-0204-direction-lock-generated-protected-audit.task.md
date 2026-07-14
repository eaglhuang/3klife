---
task_id: TASK-AAO-0204
title: "Auto-admit task-generated protected-override audit into direction lock"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-117
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/hook/pre-commit.ts"
  - "tests/cli/protected-override-audit-direction-lock.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/hook/pre-commit.ts"
  - "tests/cli/protected-override-audit-direction-lock.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types tests/cli/protected-override-audit-direction-lock.test.ts"
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
completed_at: "2026-07-14T04:20:19.916Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T04:20:19.916Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T04-20-19-916Z-close-8438a8ec0642"
lastTransitionAt: "2026-07-14T04:20:19.916Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c76526d1b45f3fcda83554bb7671b7154b140b38"
---

# TASK-AAO-0204 Auto-admit task-generated protected-override audit into direction lock

## Problem

ATM-BUG-2026-07-12-117: Task-scoped commits auto-stage generated protected-override audit records, but direction lock does not include them, causing ATM_TASK_DIRECTION_SCOPE_DRIFT.

## Goal

- Generated task-attached protected audit artifacts are included in direction lock / bundle scope automatically.
- Arbitrary foreign protected audit files remain fail-closed.
- Mark backlog 117 Fixed.
