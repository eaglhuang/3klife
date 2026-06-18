---
task_id: TASK-AAO-0143
title: "Close absorbs regenerable artifacts and correct planning mirror edits"
status: planned
priority: P0
closure_authority: target_repo
depends_on:
  - TASK-AAO-0138C
  - TASK-AAO-0140
  - TASK-AAO-0141
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/**"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/**"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-governance-commands.ts"
  - "tests/**"
deliverables:
  - "Close/pre-close classifies same-task regenerable artifacts, such as evidence bundle manifests and closure bundle manifests, as close-owned transient state instead of ordinary dirty blockers."
  - "Planning mirror edits that already match the closeback result are accepted and absorbed into the final close bundle rather than forcing manual rollback."
  - "Dirty-state diagnostics distinguish protected governance ledgers, same-task regenerable artifacts, correct planning mirror pre-edits, and foreign staged files."
  - "Rollback behavior remains fail-closed for task ledgers, unrelated planning edits, stale evidence, and foreign staged bundles."
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
