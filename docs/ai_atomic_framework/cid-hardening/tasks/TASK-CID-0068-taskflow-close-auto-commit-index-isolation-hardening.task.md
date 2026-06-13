---
task_id: TASK-CID-0068
doc_id: doc_cid_0068
title: "Taskflow close auto-commit index isolation hardening"
status: done
owner: atm-core
priority: P0
milestone: M14
started_at: "2026-06-13T07:04:10Z"
started_by_agent: captain
completed_at: "2026-06-13T07:14:55Z"
completed_by_agent: captain
delivery_commit: f90944b4c851b7e15cc54f1c3d48cbb8f0cda220
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0063"
  - "TASK-CID-0067"
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-task-ledger-governance.ts"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-task-ledger-governance.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if taskflow close starts rejecting clean bundle commits or misclassifying incomplete closeout residue as no-residue."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-open-close-operator-surface-map"
  mapUpdates:
    - "packages/cli/src/commands/taskflow.ts"
    - "packages/cli/src/commands/tasks.ts"
outOfScope:
  - "Changing emergency lane authorization policy"
  - "Changing backend tasks close/reconcile/import/repair-closure semantics"
  - "Cleaning unrelated historical untracked .atm residue"
  - "Broad TASK-CID-0062 module extraction"
nonGoals:
  - "Do not make auto-commit all-or-nothing across git repositories."
  - "Do not rely on agent discipline to avoid unrelated staged files."
---

# TASK-CID-0068 - Taskflow close auto-commit index isolation hardening

## Goal

Harden the `TASK-CID-0063` governed auto-commit bundle so `taskflow close --write` cannot accidentally commit unrelated files that were already staged before taskflow computed its exact target/planning bundle. Also remove the false-positive residue classification where a fully closed done/done task with complete closeout provenance is reported as `ambiguous-manual-review`.

## Required Work

- Add index-isolation gates to `taskflow close` before and after exact-path staging.
- For both target repo and planning repo, fail closed when the git index contains any staged path outside the computed governed commit bundle.
- Allow already staged files only when every staged path belongs to the computed bundle.
- Include index-isolation diagnostics in `atm.taskflowGovernedCommitBundle.v1` so operators can see expected staged files, pre-staged files, and unexpected staged files.
- Preserve existing exact-stage behavior for dirty-but-unstaged unrelated files: they must not be staged or committed.
- Fix residue classification so a task with live ledger `done`, planning mirror `done`, no divergence, no active claim, and complete closeout provenance returns a non-residue result instead of `ambiguous-manual-review`.
- Add focused regression coverage for target index contamination, planning index contamination, clean pre-staged bundle files, stage-only behavior, auto-commit behavior, and the no-residue done/done classifier.

## Acceptance Criteria

- `taskflow close --write` fails closed with `ATM_TASKFLOW_CLOSE_INDEX_NOT_ISOLATED` when target repo has unrelated pre-staged files.
- `taskflow close --write` fails closed with `ATM_TASKFLOW_CLOSE_INDEX_NOT_ISOLATED` when planning repo has unrelated pre-staged files.
- `taskflow close --write --no-commit` still exact-stages only target/planning bundle files when the index is clean.
- `taskflow close --write` auto-commits both repos only after index isolation passes.
- Dirty-but-unstaged unrelated files remain excluded from the commit bundle.
- Already staged files that are a subset of the governed bundle do not cause a false failure.
- `tasks status --residue` no longer reports `ambiguous-manual-review` for a complete done/done task with valid closeout provenance and empty divergence.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report:

- whether 0063 auto-commit could previously pick wrong files;
- the exact index-isolation rule now enforced;
- the bundle diagnostic fields added;
- the no-residue classifier behavior;
- validator results.
