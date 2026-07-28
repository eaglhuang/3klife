---
task_id: TASK-AAO-0199
title: "Isolate task-ledger governance validator fixtures per case"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-149
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validators/task-ledger/suite-impl.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "tests/cli/task-ledger-fixture-isolation.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "scripts/validators/task-ledger/suite-impl.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "tests/cli/task-ledger-fixture-isolation.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types tests/cli/task-ledger-fixture-isolation.test.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert fixture isolation if validate:task-ledger-governance baseline cases regress."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-validator-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "release/**"
  - "Residue contract fixture updates covered by separate backlog rows"
  - "Editing .atm/history or .atm/runtime by hand"
completed_at: "2026-07-14T01:25:12.284Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T01:25:12.284Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T01-25-12-215Z-close-241830a5cafa"
lastTransitionAt: "2026-07-14T01:25:12.284Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c7e3e81a11188c786dce62e0a95e586af0b61421"
---

# TASK-AAO-0199 Isolate task-ledger governance validator fixtures per case

## Problem

`ATM-BUG-2026-07-12-149`: `validate:task-ledger-governance` fixtures assumed an
unborn Git branch or reused one fixed framework fixture directory. After Broker
claim admission began requiring a resolvable HEAD, duplicate seed commits and
shared queue state caused `ATM_BROKER_TRANSACTION_BASE_MISSING`,
`ATM_BROKER_SHARED_QUEUE_BLOCKED`, and empty-commit failures before the intended
assertions ran.

## Goal

- Every governance fixture creates an isolated repository with one deterministic
  seed commit and no inherited Broker queue/claim state.
- Fixture setup is idempotent and fails only on the behavior under test.
- Mark backlog row 149 Fixed; add focused isolation regression test.
