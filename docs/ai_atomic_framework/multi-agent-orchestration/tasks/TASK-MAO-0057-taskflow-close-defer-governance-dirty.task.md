---
task_id: TASK-MAO-0057
doc_id: doc_mao_0057
title: "taskflow close --defer-governance-dirty and operator lane discoverability"
status: planned
owner: atm-core
priority: P0
milestone: M8
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0040"
  - "TASK-MAO-0050"
  - "TASK-MAO-0052"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli/taskflow-close-defer-governance-dirty.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/git-governance-contract.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/next.ts"
  - "tests/cli/taskflow-close-defer-governance-dirty.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/taskflow-close-defer-governance-dirty.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert defer-governance-dirty + next playbook routing; existing --defer-foreign-staged remains."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-close-defer-governance-dirty-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Modifying tasks close (backend lane) beyond emitting the recommendation warning."
nonGoals:
  - "Do not silently bypass governance — defer always snapshots."
---

# TASK-MAO-0057 - taskflow close --defer-governance-dirty and operator lane discoverability

## Background

Two compounding M7/M8 ergonomic gaps:

1. **`--defer-foreign-staged` (TASK-MAO-0040) handles staged files but not
   dirty-unstaged ones**. Shared governance files like
   `.atm/history/evidence/git-head.jsonl` get dirty during evidence
   backfills; `taskflow close --write` then refuses with
   `ATM_TASK_CLOSE_DIRTY_WORKTREE`. The operator workaround (commit them as
   a chore attributed to the task being closed) requires per-card scope-add
   manual choreography.
2. **Operator discoverability** — many AI agents still reach for the
   `tasks close --status done` + manual `git commit` two-step instead of
   `taskflow close --write`, because the result contracts of both lanes
   look similar and the next playbook (TASK-MAO-0052) does not strongly
   discourage the backend lane.

Field evidence: TASK-MAO-0014..0022 closeback (claude-code-opus-4-7) spent
substantial time stash-juggling `git-head.jsonl` and only after explicit
user prompt switched from the manual two-step to `taskflow close --write`.

## Goal

(a) Add a deferral lane for governance-dirty (unstaged) files; (b) make
`taskflow close --write` the obviously-recommended operator path.

## Captain Adjustment - 2026-06-18

This card is the owner for the closeback ergonomics bundle surfaced during CID
0092..0097 cleanup:

- `--waive-out-of-scope` should remain a documented alias for
  `--waiver-out-of-scope-delivery`.
- Same-task evidence bundle manifests such as
  `.atm/history/evidence/<task>.bundle-manifest.json` are governance artifacts,
  not foreign dirty noise.
- Foreign staged snapshots and deferred governance-dirty snapshots must be
  reported in JSON and must not silently become close blockers for the task
  that requested the deferral.
- Historical closeback should expose one operator lane that combines detected
  delivery, waiver reason, auto evidence, and foreign-state deferral instead of
  requiring manual command assembly.

## Implementation Contract

### Part A — `--defer-governance-dirty` flag

- New flag on `taskflow close --write`:
  `taskflow close --task X --actor Y --defer-governance-dirty --write`
- Semantics:
  1. For every governance-tracked dirty (M, not staged) file, snapshot to
     `.atm/runtime/snapshots/close-window-governance-dirty-<ts>-<file>.json`
     (machine-readable record with file path, original content sha256,
     restored-at timestamp slot).
  2. `git checkout HEAD -- <file>` to clean working tree for the close window.
  3. Execute close orchestration normally (atomic per TASK-MAO-0050).
  4. After close window: restore dirty state from snapshot.
  5. Result `--json` includes `evidence.deferredGovernanceDirty` with the
     snapshot manifest so reviewers can audit what was deferred.
- **Combined flag alias** `--defer-foreign-state` = `--defer-foreign-staged`
  + `--defer-governance-dirty` for the common "defer everything not my work"
  case.

### Part B — Operator lane discoverability

- **`tasks close --status done` (backend lane)**: when ok, always include
  warning in result:
  ```
  ATM_TASKS_CLOSE_BACKEND_USED: tasks close is a protected backend surface.
  The normal operator lane is `taskflow close --write` which performs
  delivery + close + closure-packet atomically. Consider switching unless
  you are doing repair / reconcile.
  ```
- **`next playbook` nextAction**: when ready-to-close, nextCommand is always
  `taskflow close --task X --actor Y --historical-delivery <sha>
   --defer-foreign-state --write --json` (single command, all flags pre-set).
- **Documentation update** in `docs/ATM_NEW_USER_WORKFLOW.md` and
  `docs/governance/git-governance-contract.md` calling out `taskflow close
  --write` as THE close lane, with `tasks close --status done` clearly
  marked "emergency / repair only".

## Acceptance Criteria

- `taskflow close --task X --defer-governance-dirty --write` against a tree
  with dirty `git-head.jsonl` succeeds without manual scope-add /
  intermediate commit choreography.
- `taskflow close` accepts both `--waiver-out-of-scope-delivery` and
  `--waive-out-of-scope` with the same semantics.
- Same-task `.bundle-manifest.json` files are accepted in governed close/commit
  bundles.
- After close, the previously-dirty governance files are restored to their
  pre-close working-tree state.
- A regression test simulates a dirty `git-head.jsonl` + close cycle and
  asserts the snapshot/restore round-trip is lossless.
- `tasks close --status done` on success emits `ATM_TASKS_CLOSE_BACKEND_USED`
  warning.
- `next --json` for a close-ready card includes `--defer-foreign-state` in
  the recommended command.
- TASK-MAO-0014..0022 re-run under this lane drops the `ATM_TASK_CLOSE_DIRTY_WORKTREE`
  failure count to zero for governance-tracked files.

## Out of scope

- Modifying the backend `tasks close` semantics beyond the recommendation
  warning.
- Auto-applying `--defer-foreign-state` everywhere — operators must still
  opt in per call.
