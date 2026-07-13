---
task_id: TASK-AAO-0192
title: "Allow abandoned task reopen without emergency --force"
started_at: "2026-07-13T09:45:00.000Z"
started_by_agent: "cursor-grok-4.5"
status: done
notes: "Fixed ATM-BUG-2026-07-13-178 in 0afd18715; abandoned reopen no longer requires emergency --force."
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-13-178
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert reopen/reset-open non-force overwrite if active-claim protection regresses."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-import-map"
  mapUpdates: []
  extractionCandidates:
    - disposition: inline
      path: packages/cli/src/commands/tasks/legacy-impl.ts
      inlineReason: "Bounded writeTaskFiles reopen/reset-open path so abandoned inert ledgers can reopen without emergency --force."
outOfScope:
  - "release/**"
  - "Softening emergency gate for active claims"
  - "Editing .atm/history or .atm/runtime by hand"
completed_at: "2026-07-13T09:50:20.983Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-13T09:50:20.983Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T09-50-20-983Z-close-446c554e239f"
lastTransitionAt: "2026-07-13T09:50:20.983Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0afd18715"
---

# TASK-AAO-0192 Allow abandoned task reopen without emergency --force

## Problem

`ATM-BUG-2026-07-13-178`: after `tasks abandon`, `tasks import --write --reopen`
still fails with `ATM_TASKS_IMPORT_DRIFT` asking for `--force`, and `--force`
always requires an emergency approval lease even when the ledger is abandoned
with no active claim.

## Goal

- `--reopen` / `--reset-open` must overwrite an abandoned/inert ledger when there
  is no protected active claim, without requiring `--force` or emergency approval.
- Active claims remain protected (skip or emergency as today).
- Backlog row `ATM-BUG-2026-07-13-178` marked fixed.
