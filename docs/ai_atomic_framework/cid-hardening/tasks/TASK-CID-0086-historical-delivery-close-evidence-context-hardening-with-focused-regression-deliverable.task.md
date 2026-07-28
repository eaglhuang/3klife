---
task_id: TASK-CID-0086
doc_id: doc_cid_0086
title: "Historical-delivery close evidence-context hardening with focused regression deliverable"
status: done
owner: atm-core
priority: P1
milestone: M17
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts"
  - "scripts/validate-task-ledger-governance.ts"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts"
  - "scripts/validate-task-ledger-governance.ts"
validators:
  - "npm run typecheck"
  - "npm run build"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if the close-lane allowance weakens protected-state commit rules or the focused regression starts hiding real dirty-worktree blockers."
atomizationImpact:
  ownerAtomOrMap: "atm.historical-close-evidence-context"
  mapUpdates:
    - "packages/cli/src/commands/tasks.ts"
    - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
outOfScope:
  - "Relaxing command-backed evidence requirements"
  - "Broadly bypassing dirty-worktree protection for unrelated files"
nonGoals:
  - "Do not solve this by telling operators to use raw git bypasses or hook bypasses."
  - "Do not introduce a lane where evidence files can commit without matching staged task or transition context."
supersedes:
  - "TASK-CID-0085"
completed_at: "2026-06-14T05:10:02.914Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-14T05-10-02-777Z-close-9ebb18ba6c08"
delivery_commit: "5cbcb4c188ce83abf75cef9a67e90ced34deb4bd"
---

# TASK-CID-0086 - Historical-delivery close evidence-context hardening with focused regression deliverable

## Goal

Close the already-landed implementation through a truthful CID contract where
the focused regression file is part of the declared deliverable set, so
historical-delivery close validates the real source bundle rather than treating
the regression file as out-of-scope source.

## Why this successor exists

`TASK-CID-0085` landed the intended implementation, but the source bundle also
included a new focused regression in
`packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts`.

ATM's current `tasks scope add` lane can widen `allowedFiles`, but it does not
retrofit the imported task's declared deliverable set for historical-delivery
close validation. The result is a false out-of-scope historical source finding
even though the regression belongs to the same atom owner.

## Required Behavior

- Keep the implementation aligned with the `TASK-CID-0083` / `TASK-CID-0085`
  product fix.
- Historical-delivery close must accept same-task fresh evidence dirtiness when
  the delivery already landed.
- The focused regression file is a first-class deliverable in this successor
  contract, not an accidental scope amendment.
- Protected-state validation must still reject evidence-only commits without the
  matching staged task/event context.

## Acceptance Criteria

- The existing source delivery commit can be verified as historical delivery
  under this successor task without out-of-scope source drift.
- Historical-delivery close no longer deadlocks on a fresh same-task evidence
  file in the governed close bundle.
- Evidence-only commits without task/event context remain rejected.

## Validation

```powershell
npm run typecheck
npm run build
npm run validate:cli
git diff --check
```

## Report Back

Report that this card superseded `TASK-CID-0085`, why `scope add` alone was not
enough for historical-delivery validation, and which close/evidence regression
proved the final lane.
