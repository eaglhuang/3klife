---
task_id: TASK-AAO-0203
title: "Align task-ledger residue fixtures with current contract"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-150
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validators/task-ledger/suite-impl.ts"
  - "tests/cli/task-ledger-residue-contract.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "scripts/validators/task-ledger/suite-impl.ts"
  - "tests/cli/task-ledger-residue-contract.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types tests/cli/task-ledger-residue-contract.test.ts"
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
completed_at: "2026-07-14T04:19:03.420Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T04:19:03.420Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T04-19-03-332Z-close-04de29f591d3"
lastTransitionAt: "2026-07-14T04:19:03.420Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c76526d1b45f3fcda83554bb7671b7154b140b38"
---

# TASK-AAO-0203 Align task-ledger residue fixtures with current contract

## Problem

ATM-BUG-2026-07-12-150: Residue fixtures still assert superseded buckets (planning-mirror-only, --force) instead of source-done-governance-incomplete and --reconcile-mirror.

## Goal

- Update fixtures/assertions to current public residue contract.
- Add a focused contract table/spec independent of the long suite.
- Mark backlog 150 Fixed.
