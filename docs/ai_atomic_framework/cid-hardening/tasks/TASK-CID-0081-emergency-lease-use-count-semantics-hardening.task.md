---
task_id: TASK-CID-0081
doc_id: doc_cid_0081
title: "Emergency lease use-count semantics hardening"
status: planned
owner: atm-core
priority: P0
milestone: M17
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0065"
  - "TASK-CID-0080"
scopePaths:
  - "packages/cli/src/commands/emergency.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-task-ledger-governance.ts"
deliverables:
  - "packages/cli/src/commands/emergency.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-task-ledger-governance.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if lease accounting becomes replayable or if successful protected mutations stop consuming approved uses."
atomizationImpact:
  ownerAtomOrMap: "atm.emergency-lease-use-accounting"
  mapUpdates:
    - "packages/cli/src/commands/emergency.ts"
    - "scripts/validate-task-ledger-governance.ts"
outOfScope:
  - "Changing permission ids or emergency policy scope"
  - "Allowing protected backend commands without a lease"
nonGoals:
  - "Do not burn a one-use lease merely because validation failed before protected mutation."
  - "Do not make successful protected mutations free."
---

# TASK-CID-0081 - Emergency lease use-count semantics hardening

## Goal

Only consume emergency lease uses when the approved protected mutation actually
executes, while still auditing failed attempts.

## Problem

Current one-use leases can be consumed by failed attempts that never complete
the protected path. That makes ATM feel punitive and brittle during legitimate
recovery, because the operator loses the only approved use before any governed
repair succeeded.

## Required Behavior

- Before source edits, run the repo-local `atm-atom-map-refactor` skill in
  review mode.
- Keep any extraction limited to lease accounting or protected-surface outcome
  handling inside this card's scope.
- Failed attempts that stop before protected mutation must record audit evidence
  but must not increment the lease's effective consumed use count.
- Successful approved mutations must still consume uses exactly once.
- Validation must cover:
  - failed pre-mutation attempt;
  - successful protected command;
  - replay attempt after the allowed use is consumed.

## Acceptance Criteria

- Failed pre-mutation lease attempts no longer burn the only use.
- Successful protected mutations still consume the approved use.
- Replay after a real successful use still fails closed.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report the lease accounting rule, how failed attempts are still audited, and
the regressions that prove failed versus successful consumption semantics.
