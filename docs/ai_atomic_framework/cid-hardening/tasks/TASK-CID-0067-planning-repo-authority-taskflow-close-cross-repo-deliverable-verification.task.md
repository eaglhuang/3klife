---
task_id: TASK-CID-0067
doc_id: doc_cid_0067
title: "Planning repo authority taskflow close cross-repo deliverable verification"
status: done
owner: atm-core
priority: P0
milestone: M14
started_at: "2026-06-13T06:39:58Z"
started_by_agent: captain
completed_at: "2026-06-13T06:54:00Z"
completed_by_agent: captain
delivery_commit: ea1ffcb6c29607cbf8514c4b7ce8474a20992e40
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0063"
  - "TASK-CID-0065"
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "docs/specs/taskflow-profile-v1.md"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "docs/specs/taskflow-profile-v1.md"
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
  notes: "Revert if planning_repo authority closeback starts falsely closing target_repo authority tasks or stages unrelated planning repo files."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-open-close-operator-surface-map"
  mapUpdates:
    - "docs/specs/taskflow-profile-v1.md"
outOfScope:
  - "Changing TASK-CID-0047 report content"
  - "Repairing TASK-CID-0040 through TASK-CID-0046"
  - "Broad 0062 module extraction"
  - "Changing emergency approval policy except where taskflow close internal delegation needs existing context"
nonGoals:
  - "Do not make direct tasks close/reconcile the normal workaround."
  - "Do not mark planning_repo authority tasks done without real planning repo deliverable proof."
---

# TASK-CID-0067 - Planning repo authority taskflow close cross-repo deliverable verification

## Goal

Fix the closeback gap exposed by TASK-CID-0047: when a task has `closure_authority: planning_repo` and its real deliverable lives in the planning repo, `taskflow close` must be able to verify the planning repo deliverable commit and produce a governed dual-repo closeback result instead of failing forever because the target repo backend sees only `.atm` artifacts.

## Required Work

- Teach `taskflow close` to recognize planning-repo authority tasks where:
  - live target ledger is `running` or `review`;
  - planning frontmatter may still be `planned`;
  - declared deliverables are planning-repo relative paths;
  - an operator supplies a planning repo delivery commit through `--historical-delivery` / `--delivery-commit`.
- Verify that the supplied planning repo delivery commit contains at least one declared planning repo deliverable path.
- Keep fail-closed behavior when the planning repo path cannot be resolved, the commit does not exist in the planning repo, or the commit lacks scoped deliverable files.
- Let `taskflow close --dry-run` report a deterministic `atm.taskflowGovernedCommitBundle.v1` for the planning-repo authority case.
- Let `taskflow close --write --no-commit` exact-stage only the target close artifacts and planning closeback card/roster files when the planning delivery commit is valid.
- Preserve emergency backend protection: direct backend commands stay protected, but taskflow close internal delegation remains the normal operator lane.
- Add focused regression coverage using a temp dual-repo fixture with a planning-repo deliverable commit.

## Acceptance Criteria

- `taskflow close --dry-run --task <planning-authority-task> --historical-delivery <planning-repo-commit>` returns close mode suitable for closeback, not `ambiguous-manual-review`, when the planning commit contains the declared deliverable.
- `taskflow close --dry-run` fails closed when the supplied planning commit lacks the declared deliverable.
- The governed commit bundle lists both target repo closeout artifacts and planning repo closeback files without unrelated dirty files.
- TASK-CID-0047 class tasks can be closed through taskflow close without pretending the planning repo report is a target repo source diff.
- Regression coverage prevents future reintroduction of the 0047 failure mode.

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

- the exact planning-repo authority closeback detection rule;
- the validation behavior for planning repo historical delivery commits;
- the bundle shape for dry-run and stage-only modes;
- validator results;
- whether TASK-CID-0047 can now be moved from review to done through `taskflow close`.
