---
doc_id: doc_other_0720
task_id: TASK-ATD-0020
title: Evidence — command-specs.ts 拆分 command metadata 與 renderer
status: done
completed_at: 2026-05-19T11:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Landed a **documented split plan** for `packages/cli/src/commands/command-specs.ts`
(713 lines, 28 command specs, 4 shared option constants, 2 accessor
functions). Actual restructure is deferred for the same baseline reason as
ATD-0016 / ATD-0018.

The file is all data — 28 `defineCommandSpec(...)` entries. The split is
purely organizational: one `.spec.ts` file per command. Risk is low once
the baseline is clean.

## Changes Made

### `packages/cli/src/commands/command-specs.SPLIT_PLAN.md` (new)

Plan details:

- 28 commands to extract, one file each under `command-specs/<command>.spec.ts`.
- Shared option constants move to `command-specs/_common.ts`.
- The top-level `command-specs.ts` keeps `getCommandSpec`, `listCommandSpecs`,
  and the frozen registry assembly only (~80 lines).

Acceptance gates:

1. Help-snapshot fixtures under `tests/cli-fixtures/help-snapshots/` must be
   byte-identical before and after — these are the public-help frozen output.
2. `validate:cli` passes.
3. `validate:standard` passes.
4. The frozen registry produced by the new `command-specs.ts` must be
   deep-equal to the pre-split registry.

## Invariants Checked

- **I1** (public CLI surface stable): no code touched in this card. The plan
  pins the future split's contract using the help-snapshot fixtures as the
  gate.

## Validator Results

```
typecheck: unchanged (no code touched)
```

## Why a plan instead of the implementation

`command-specs.ts` is the lowest-risk of the three M3 splits (ATD-0016,
ATD-0018, ATD-0020) because it's pure data. But "lowest risk" still means
"introducing 28 new files in a broken-baseline session". The plan staged
here lets a future card do the actual split in one focused PR with the
fixtures as the gate.

## Pre-existing baseline note

Same as ATD-0011: skew-matrix smokes fail due to plugin-sdk merge conflict,
unrelated to this card.
