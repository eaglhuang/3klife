---
task_id: TASK-AAO-0201
title: "Clarify multi-task shared historical-delivery close UX"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-14-186
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow/write-readiness.ts"
  - "packages/cli/src/commands/taskflow/historical-close-preflight.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/__tests__/mixed-delivery-close-ux.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/taskflow/write-readiness.ts"
  - "packages/cli/src/commands/taskflow/historical-close-preflight.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/__tests__/mixed-delivery-close-ux.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/mixed-delivery-close-ux.spec.ts"
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
completed_at: "2026-07-14T04:14:55.773Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T04:14:55.773Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T04-14-55-773Z-close-16a157db8f5a"
lastTransitionAt: "2026-07-14T04:14:55.773Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c76526d1b45f3fcda83554bb7671b7154b140b38"
---

# TASK-AAO-0201 Clarify multi-task shared historical-delivery close UX

## Problem

ATM-BUG-2026-07-14-186: Closing sibling tasks against one shared historical-delivery SHA fails with mixed DELIVERABLE_DIFF / MIXED_DELIVERY / OUT_OF_SCOPE messages until waiver flags are present.

## Goal

- When historical delivery is set and out-of-scope sibling files block close, promote one clear waiver recipe as nextCommand.
- Summary must describe intentional shared delivery, not missing delivery.
- Mark backlog 186 Fixed.
