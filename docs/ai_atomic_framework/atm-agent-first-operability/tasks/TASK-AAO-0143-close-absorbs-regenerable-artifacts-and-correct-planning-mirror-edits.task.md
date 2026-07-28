---
task_id: TASK-AAO-0143
title: "Close absorbs regenerable artifacts and correct planning mirror edits"
status: done
started_at: 2026-06-18T06:35:00Z
started_by_agent: cursor-gpt-5.2
priority: P0
closure_authority: target_repo
depends_on:
  - TASK-AAO-0141
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/historical-close-preflight.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/tasks/planning-mirror-close-diagnostics.ts"
  - "packages/cli/src/commands/tasks/lifecycle-state.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts"
  - "packages/cli/src/commands/tasks/__tests__/planning-mirror-close-diagnostics.test.ts"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/historical-close-preflight.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/tasks/planning-mirror-close-diagnostics.ts"
  - "packages/cli/src/commands/tasks/lifecycle-state.ts"
  - "packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts"
  - "packages/cli/src/commands/tasks/__tests__/planning-mirror-close-diagnostics.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "node --strip-types scripts/validate-governance-commands.ts --mode validate"
  - "git diff --check"
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-close-map"
  mapUpdates:
    - path_pattern: "packages/cli/src/commands/taskflow/**"
      atom_id: "atm.taskflow-close-orchestrator"
      capability: "Closeback staging, planning mirror closeback, and dirty-state classification"
      coverage_status: "active"
outOfScope:
  - "Allowing arbitrary dirty planning files to bypass close checks."
  - "Making taskflow close ignore task ledger or evidence JSON corruption."
nonGoals:
  - "Do not remove dirty-tree checks. Only classify close-owned transient files and correct same-task mirror edits more precisely."
contextMap:
  primary:
    - path: "packages/cli/src/commands/taskflow.ts"
      reason: "close/pre-close orchestration"
    - path: "packages/cli/src/commands/tasks/**"
      reason: "ledger, planning mirror, and close diagnostics"
  tests:
    - path: "scripts/validate-task-ledger-governance.ts"
      reason: "ledger and closeback regression coverage"
    - path: "scripts/validate-governance-commands.ts"
      reason: "governance command coverage"
completed_at: "2026-06-18T10:24:41.371Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "c13a564cd"
closedAt: "2026-06-18T10:24:41.371Z"
closedByActor: "cursor-gpt-5.2"
closedByCommand: "historical planning closeback backfill for TASK-CID-0124"
lastTransitionId: "2026-06-18T10-24-40-425Z-close-96a3a5c69882"
lastTransitionAt: "2026-06-18T10:24:41.371Z"
ledgerContractVersion: "task-ledger/v1"
---

## Goal
Keep close strict, but stop punishing correct same-task transient output. ATM should absorb files it owns and can deterministically regenerate, while still blocking foreign staged work and protected ledger drift.

## Acceptance
- Same-task bundle manifests generated during evidence/close preparation do not block close as ordinary dirty files.
- Correct planning mirror edits are detected as matching the closeback result and can be included in the final governed bundle.
- Incorrect planning mirror edits remain blockers with a clear remediation command.
- Foreign staged task bundles remain first-class blockers unless the operator explicitly uses the defer protocol.

## Exclusion Rules
- Do not disable dirty checking globally.
- Do not silently unstage or rewrite another task's files.

## Verification
```bash
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
node --strip-types scripts/validate-governance-commands.ts --mode validate
git diff --check
```

## Closure & Reports
1. Show before/after diagnostics for regenerable bundle manifests.
2. Show one accepted correct planning mirror pre-edit and one rejected incorrect pre-edit.
3. Confirm foreign staged bundles are still blocked or explicitly deferred.
