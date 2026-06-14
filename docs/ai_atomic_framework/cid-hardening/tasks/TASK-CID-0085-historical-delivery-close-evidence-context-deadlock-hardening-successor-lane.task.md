---
task_id: TASK-CID-0085
doc_id: doc_cid_0085
title: "Historical-delivery close evidence-context deadlock hardening successor lane"
status: planned
owner: atm-core
priority: P1
milestone: M17
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
validators:
  - "npm run typecheck"
  - "npm run build"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if the fix weakens protected-state commit rules or allows evidence-only governance files to land without matching staged task context."
atomizationImpact:
  ownerAtomOrMap: "atm.historical-close-evidence-context"
  mapUpdates:
    - "packages/cli/src/commands/tasks.ts"
    - "packages/cli/src/commands/taskflow.ts"
outOfScope:
  - "Relaxing command-backed evidence requirements"
  - "Broadly bypassing dirty-worktree protection for unrelated files"
nonGoals:
  - "Do not solve this by telling operators to use raw git bypasses or hook bypasses."
  - "Do not introduce a lane where evidence files can commit without matching staged task or transition context."
supersedes:
  - "TASK-CID-0083"
---

# TASK-CID-0085 - Historical-delivery close evidence-context deadlock hardening successor lane

## Goal

Carry the `TASK-CID-0083` fix through a claimable CID lane so the captain can
implement the same product repair without relying on an emergency metadata
overwrite of the first imported runtime copy.

## Why this successor exists

`TASK-CID-0083` correctly captured the product bug, but its first imported
runtime copy carried an impossible dependency on `TASK-CID-0082`. Fixing that
imported dependency now requires the protected backend path
`tasks import --write --force`, which in turn requires a human emergency lease.

This successor card exists only so the same implementation can continue tonight
through a normal claimable CID lane.

## Required Behavior

- Before source edits, run the repo-local `atm-atom-map-refactor` skill in
  review mode.
- Keep the implementation identical in spirit to `TASK-CID-0083`: same-task
  fresh evidence plus historical-delivery close must not deadlock.
- `taskflow close --dry-run` and `taskflow close --write` must tell the same
  truth about governed evidence bundle expectations.
- Protected-state validation must still reject evidence-only commits without the
  matching staged task/event context.

## Acceptance Criteria

- Historical-delivery close no longer deadlocks on a fresh same-task evidence
  file that belongs in the governed close bundle.
- The normal operator lane can complete the close without raw git bypasses.
- Evidence-only commits without task/event context remain rejected.

## Validation

```powershell
npm run typecheck
npm run build
npm run validate:cli
git diff --check
```

## Report Back

Report that this card superseded the blocked runtime import of `TASK-CID-0083`,
which lane now owns the evidence-context pairing, and which regression proves
the deadlock is gone.
