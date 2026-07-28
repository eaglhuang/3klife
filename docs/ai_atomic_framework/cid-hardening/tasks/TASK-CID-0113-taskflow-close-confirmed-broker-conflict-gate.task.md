---
task_id: TASK-CID-0113
title: Taskflow close confirmed broker conflict gate
status: done
milestone: M20
depends_on:
  - TASK-CID-0112
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/core/src/broker/**"
  - "tests/cli/**"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/core/src/broker/**"
  - "tests/cli/**"
validators:
  - "npm run typecheck"
  - "npm test"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "Do not make pre-close a hard blocker for advisory-only broker findings."
  - "Do not block close on insufficient mutation intent alone."
  - "Do not require all task workflows to provide mutation intent before this gate is actionable."
nonGoals:
  - "Do not redesign the task lifecycle."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-confirmed-conflict-gate"
  mapUpdates: []
completed_at: "2026-06-18T16:37:11.878Z"
completed_by_agent: "codex-gpt-5.4-mini"
lastTransitionId: "2026-06-18T16-37-11-708Z-close-937d84af6e2b"
delivery_commit: "1f07c32b1c5c271dc9e27d42985a654bd22efc40"
---

# TASK-CID-0113

## Goal

Make broker conflict results affect task close at the right tight point.

`taskflow pre-close` should remain advisory. `taskflow close --write` should hard block only when the broker reports a confirmed conflict. `insufficient-mutation-intent` should not block close by itself; it should prompt the operator to add mutation intent when precision is needed.

## Acceptance

- `taskflow pre-close` reports broker conflict findings as advisory diagnostics.
- `taskflow close --write` hard blocks only confirmed broker conflicts.
- `insufficient-mutation-intent` emits a clear prompt to supplement mutation intent but does not block close.
- The close output distinguishes `confirmedConflict`, `insufficientMutationIntent`, and `noConflict`.
- CLI tests cover confirmed conflict blocking, insufficient intent advisory behavior, and clean close behavior.

## Non-Goals

- No general automatic mutation-intent inference.
- No broad close policy redesign.
- No new requirement that every task provide mutation intent.

## Verification

```bash
npm run typecheck
npm test
git diff --check
```

