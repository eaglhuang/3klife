---
task_id: TASK-CID-0080
doc_id: doc_cid_0080
title: "Taskflow close dry-run parity and hidden-blocker disclosure"
status: done
owner: atm-core
priority: P0
milestone: M17
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0074"
  - "TASK-CID-0076"
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if dry-run starts implying mutation success it still cannot execute or if closeback truthfulness regresses."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-close-dry-run-parity"
  mapUpdates:
    - "packages/cli/src/commands/taskflow/close-orchestration.ts"
    - "scripts/validate-task-ledger-governance.ts"
outOfScope:
  - "Changing emergency lease policy itself"
  - "Turning dry-run into a mutating close path"
nonGoals:
  - "Do not keep dry-run optimistic when write mode will later fail for predictable reasons."
  - "Do not hide historical-delivery repo or waiver constraints behind backend-only errors."
completed_at: "2026-06-14T04:14:48.221Z"
completed_by_agent: "captain"
delivery_commit: "b6f2d0e9846f544466690fa5cb79f98263f02592"
---

# TASK-CID-0080 - Taskflow close dry-run parity and hidden-blocker disclosure

## Goal

Make `taskflow close --dry-run` report the same major blockers and boundary
constraints that the real close path will enforce later, so operators can trust
dry-run as a truthful preflight.

## Problem

The captain closeback run showed that dry-run can still look viable even when
real close later fails on active-claim requirements, historical-delivery repo
constraints, or out-of-scope waiver needs. That means ATM is hiding operator
cost instead of surfacing it early.

## Required Behavior

- Before source edits, run the repo-local `atm-atom-map-refactor` skill in
  review mode.
- Keep any extraction limited to close-orchestration diagnostics or result
  contract helpers inside this card's scope.
- `taskflow close --dry-run` must disclose predictable blockers that the write
  path would later reject, including:
  - active-claim requirements;
  - historical-delivery repo constraints;
  - out-of-scope waiver requirements;
  - other high-value backend prerequisites already knowable at dry-run time.
- The dry-run contract must stay non-mutating.
- Validation must prove parity between dry-run disclosure and the later write
  rejection for at least one representative scenario.

## Acceptance Criteria

- Dry-run now names blockers that previously only appeared at write time.
- The close write path stays fail-closed and authoritative.
- Validation proves disclosure parity for at least one active-claim case and one
  historical-delivery/waiver-style case.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report the new dry-run blocker surfaces, which checks were promoted earlier, and
the parity regressions added.
