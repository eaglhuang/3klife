---
task_id: TASK-CID-0083
doc_id: doc_cid_0083
title: "Historical-delivery close evidence-context deadlock hardening"
status: abandoned
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
  notes: "Revert if the fix weakens protected-state commit rules or allows evidence-only governance files to land without matching task context."
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
superseded_by:
  - "TASK-CID-0086"
closed_reason: "Superseded by TASK-CID-0086; this card remains as the original issue statement only."
---

# TASK-CID-0083 - Historical-delivery close evidence-context deadlock hardening

## Goal

Remove the operator deadlock where a same-task evidence refresh is required for
historical-delivery close, but the close lane then rejects that evidence file as
dirty before it can generate the matching close transition context.

## Problem

`TASK-CID-0082` exposed a real ATM governance gap:

- source delivery already landed in a governed commit;
- the operator adds fresh `validate:git-head-evidence` proof to the same task;
- `taskflow close --dry-run` previews `.atm/history/evidence/<task>.json` as an
  expected governed bundle member;
- `taskflow close --write` and backend `tasks close --historical-delivery`
  reject that same file as `ATM_TASK_CLOSE_DIRTY_WORKTREE`;
- an evidence-only commit is then blocked by
  `ATM_PROTECTED_STATE_EVIDENCE_FILE_MISSING_TASK_CONTEXT`.

That creates a fail-closed loop with no official operator escape path.

## Required Behavior

- Before source edits, run the repo-local `atm-atom-map-refactor` skill in
  review mode.
- Keep the fix limited to same-task historical-delivery close orchestration and
  protected-state parity for expected governance bundle files.
- `taskflow close --dry-run` and `taskflow close --write` must tell the same
  truth about whether same-task evidence dirtiness is acceptable in the governed
  close bundle.
- If same-task evidence is acceptable, the normal operator lane must be able to
  stage and commit it together with the generated task/event close context.
- If same-task evidence is still not acceptable in some cases, dry-run must
  disclose that blocker before the operator takes the write path.

## Acceptance Criteria

- Historical-delivery close no longer deadlocks on a fresh same-task evidence
  file that belongs in the governed close bundle.
- Protected-state validation still rejects evidence-only commits that do not
  travel with the matching task/event context.
- Regression coverage proves the operator lane can complete the close without
  raw git bypasses.

## Validation

```powershell
npm run typecheck
npm run build
npm run validate:cli
git diff --check
```

## Report Back

Report which lane now owns the evidence-context pairing, what parity rule was
added between dry-run and write, and which regression proves the deadlock is
gone.
