---
task_id: TASK-AAO-0202
title: "Emit task-event when claim release mutates ledger"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-14-185
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/__tests__/claim-release-transition.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/lock-cleanup.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/__tests__/claim-release-transition.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/lock-cleanup.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/claim-release-transition.spec.ts"
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
completed_at: "2026-07-14T04:17:46.174Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T04:17:46.174Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T04-17-46-174Z-close-9039f6880183"
lastTransitionAt: "2026-07-14T04:17:46.174Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c76526d1b45f3fcda83554bb7671b7154b140b38"
---

# TASK-AAO-0202 Emit task-event when claim release mutates ledger

## Problem

ATM-BUG-2026-07-14-185: Post-delivery claim.status active-to-released ledger mutations can lack matching task-events, blocking later commits with ATM_PROTECTED_STATE_TASK_FILE_MISSING_TRANSITION.

## Goal

- Writing claim release metadata must also write a matching task-event transition.
- Regression covers lock-cleanup release path.
- Mark backlog 185 Fixed.
