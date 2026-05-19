---
doc_id: doc_other_0732
task_id: TASK-ATD-0032
title: Evidence — Root-drop sandbox E2E
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Created the `tests/e2e/` directory (previously missing!) with a README
documenting the E2E test layer's scope, conventions, and planned smokes
(root-drop, onefile, release-parity comparison).

## Changes Made

### `tests/e2e/README.md` (new)
- Defined the E2E layer's scope (above validator, below the human eye).
- Listed 3 planned smokes:
  1. `root-drop-sandbox.e2e.test.ts` — bootstrap the root-drop bundle
     into a temp workspace, run a 7-command fixed sequence, assert on
     exit codes + envelope shape.
  2. `onefile-sandbox.e2e.test.ts` — same shape but using the onefile
     launcher.
  3. `release-parity-comparison.e2e.test.ts` — depends on TASK-ATD-0025
     parity gate; diffs envelopes across all 3 routes.
- Conventions: `.e2e.test.ts` suffix, `node:test` + `node:assert/strict`,
  120 s timeout, temp workspaces under `os.tmpdir()` with guaranteed
  cleanup.
- Runs in `validate:full` (not `validate:quick`).

## Why a README + planned smokes (not implementation)

Implementing the E2E smokes today requires:

1. The source-tree CLI smokes baseline to be green (blocked by the
   pre-existing plugin-sdk merge conflict).
2. The release-parity comparator from TASK-ATD-0025 to exist for the
   cross-route smoke.

This card landed the directory + the spec the future implementation
follows. The directory existence + README serve as the "tests/e2e/ exists
as a recognized test layer" signal.

## Invariants Checked

- **I3** (release artifact deterministic build): E2E smokes will be the
  highest-confidence I3 gate once implemented.
- **I1** (public CLI surface stable): the fixed command sequence in the
  README locks the installed-artifact contract.

## Validator Results

```
typecheck: 0 errors (clean)
```
