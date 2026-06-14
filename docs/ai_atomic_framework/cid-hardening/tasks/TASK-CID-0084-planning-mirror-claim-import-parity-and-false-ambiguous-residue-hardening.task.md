---
task_id: TASK-CID-0084
doc_id: doc_cid_0084
title: "Planning mirror claim/import parity and false ambiguous residue hardening"
status: done
owner: atm-core
priority: P2
milestone: M17
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0086"
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "scripts/validate-task-ledger-governance.ts"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
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
  notes: "Revert if planning-mirror parity logic starts mutating adopter task cards outside governed taskflow/task import lanes."
atomizationImpact:
  ownerAtomOrMap: "atm.planning-mirror-claim-parity"
  mapUpdates:
    - "packages/cli/src/commands/taskflow/close-orchestration.ts"
    - "packages/cli/src/commands/tasks.ts"
outOfScope:
  - "Changing planning close authority rules"
  - "Broad task-card authoring refactors unrelated to parity diagnostics"
nonGoals:
  - "Do not mask real close blockers by suppressing residue blindly."
  - "Do not require operators to re-import already claimed tasks just to clear false ambiguity."
completed_at: "2026-06-14T05:34:41.791Z"
completed_by_agent: "captain"
delivery_commit: "113006fb"
---

# TASK-CID-0084 - Planning mirror claim/import parity and false ambiguous residue hardening

## Goal

Make imported-and-claimed CID tasks report a truthful planning-mirror status so
`tasks status` and `taskflow close --dry-run` stop surfacing false
`ambiguous-manual-review` residue when the operator is already in a valid active
claim lane.

## Problem

`TASK-CID-0082` showed that a task can have:

- live ledger `running`;
- last transition `claim`;
- active claim held by the current actor;
- planning frontmatter still `planned`.

That drift causes status tooling to recommend redundant import repair and makes
dry-run diagnostics noisier than the real close blocker.

The later `TASK-CID-0085` successor flow exposed the same product smell in a
second shape: after an intentional release in favor of `TASK-CID-0086`, the
status surface still reported `ambiguous-manual-review` and suggested
`tasks import --write` even though the truthful operator story was "this task
was superseded; do not send the operator back through import repair by
default."

## Required Behavior

- Before source edits, run the repo-local `atm-atom-map-refactor` skill in
  review mode.
- Keep the fix limited to imported-task/planning-mirror parity and residue
  truthfulness.
- Status guidance must distinguish "planning mirror is stale but the task is
  already in a valid claimed lane" from true ambiguous closeback states.
- `taskflow close --dry-run` must not advertise a ready close story while its
  residue diagnosis simultaneously claims the operator path is ambiguous solely
  because the planning mirror still says `planned`.
- Release/supersede states must not fall back to import-repair guidance when
  the ledger already contains a newer unique operator story.

## Acceptance Criteria

- A claimed imported CID task does not trigger false planning-mirror ambiguity
  when the live ledger and claim state already provide a unique governed lane.
- Status guidance no longer recommends redundant `tasks import --write` for this
  parity case.
- Regression coverage proves the planning-mirror divergence is either repaired
  or downgraded to truthful non-blocking diagnostics.
- Regression coverage also proves that a superseded or intentionally released
  predecessor task does not surface a false import-repair recommendation just
  because the planning mirror and live ledger differ.

## Validation

```powershell
npm run typecheck
npm run build
npm run validate:cli
git diff --check
```

## Report Back

Report whether the fix repairs the mirror state, reclassifies the residue, or
both, and cite the regression that proves the ambiguous-manual-review false
positive is gone.
