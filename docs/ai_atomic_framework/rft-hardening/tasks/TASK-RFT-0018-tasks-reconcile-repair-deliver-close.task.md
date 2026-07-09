---
doc_id: doc_rft_0018
task_id: TASK-RFT-0018
title: "tasks.ts reconcile / repair / deliver-close orchestrator split"
status: done
owner: atm-core
priority: P0
milestone: RFT-M6
depends_on: [TASK-RFT-0017]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/reconcile-orchestrator.ts"
  - "packages/cli/src/commands/tasks/repairclose-orchestrator.ts"
  - "packages/cli/src/commands/tasks/deliver-close-orchestrator.ts"
  - "packages/cli/src/commands/tasks/__tests__/reconcile-orchestrator.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/repairclose-orchestrator.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/deliver-close-orchestrator.spec.ts"
  - "scripts/validate-tasks-reconcile-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/reconcile-orchestrator.ts"
  - "packages/cli/src/commands/tasks/repairclose-orchestrator.ts"
  - "packages/cli/src/commands/tasks/deliver-close-orchestrator.ts"
  - "packages/cli/src/commands/tasks/__tests__/reconcile-orchestrator.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/repairclose-orchestrator.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/deliver-close-orchestrator.spec.ts"
  - "scripts/validate-tasks-reconcile-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-tasks-reconcile-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/reconcile-orchestrator.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/repairclose-orchestrator.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/deliver-close-orchestrator.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if reconcile, repair-closure, or deliver-and-close output contracts or rollback behavior change."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-atomic-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Touching packages/cli/src/commands/next.ts or RFT-0001 Lane A files"
  - "Changing taskflow close behavior except import paths needed by this extraction"
  - "Extracting card parsing, scope, queue, lock, parallel, or roster clusters"
  - "Changing public JSON field names"
nonGoals:
  - "Do not combine reconcile, repair-closure, and deliver-and-close into one mega-helper."
  - "Do not rewrite historical delivery rules while moving code."
completed_at: "2026-07-09T17:19:47.703Z"
completed_by_agent: "codex-lane-b"
closedAt: "2026-07-09T17:19:47.703Z"
closedByActor: "codex-lane-b"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-09T17-19-47-703Z-close-1d0d9cb37da3"
lastTransitionAt: "2026-07-09T17:19:47.703Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "89d542ad352bee3f07a66025f55aa56db1239737"
---

# TASK-RFT-0018 - tasks.ts reconcile / repair / deliver-close orchestrator split

## Goal

Move the reconcile, repair-closure, and deliver-and-close command bodies out of
`packages/cli/src/commands/tasks.ts` after TASK-RFT-0017 lands.

## Atom/Map Extraction Pattern

- `tasks/reconcile-orchestrator.ts` owns `runTasksReconcile` and historical
  delivery reconciliation orchestration.
- `tasks/repairclose-orchestrator.ts` owns `runTasksRepairClosure`,
  repair-closure option parsing, and transition-writing helpers that only serve
  repair closure.
- `tasks/deliver-close-orchestrator.ts` owns `runTasksDeliverAndClose`.
- `tasks.ts` imports the extracted symbols and keeps only routing glue.

## Required Behavior

- `tasks reconcile`, `tasks repair-closure`, and `tasks deliver-and-close`
  preserve public JSON fields and exit codes.
- Repair-closure remains stage-only unless the existing explicit amend lane is
  requested and supported.
- Historical-delivery and historical-batch behavior remains unchanged.

## Validation

`scripts/validate-tasks-reconcile-atomic-map.ts` must assert:

- `runTasksReconcile`, `runTasksRepairClosure`, and
  `runTasksDeliverAndClose` are no longer defined in `tasks.ts`.
- The new orchestrator files exist and are imported by `tasks.ts`.
- `tasks.ts` line count is under 3,900.

## Team Broker Boundary

This card remains Lane B only and must not touch Lane A `next.ts` surfaces.
