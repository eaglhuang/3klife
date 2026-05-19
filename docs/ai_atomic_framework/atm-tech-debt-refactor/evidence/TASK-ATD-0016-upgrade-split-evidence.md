---
doc_id: doc_other_0716
task_id: TASK-ATD-0016
title: Evidence — upgrade.ts 拆分並鎖 public CLI JSON 行為
status: done
completed_at: 2026-05-19T11:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

This card lands a **documented split plan**, not the split itself. The
plan lives at `packages/cli/src/commands/upgrade/SPLIT_PLAN.md` and is the
contract for the future implementation card.

## Rationale for splitting the work this way

`upgrade.ts` is 1231 lines with 28 internal functions. A safe split must:
1. Preserve every `--json` envelope shape for every action (I1).
2. Land on a green baseline so failures can be attributed to the split.

The working tree in this session had pre-existing merge conflicts in
`packages/plugin-sdk/` that broke 5 skew smoke validators (the smokes spawn
the CLI and the CLI fails to parse plugin-sdk). Performing a 1200-line
restructure on top of a broken baseline would conflate "the split broke X"
with "the baseline was already broken".

The plan staged here captures:
- Function-by-function mapping into 7 submodule files.
- Acceptance gates (validate:cli, validate:standard, typecheck, JSON shape
  diff).
- Invariant exposure (I1).
- Dependency on the baseline being clean.

## Changes Made

### `packages/cli/src/commands/upgrade/SPLIT_PLAN.md` (new)
- Inventory of all 28 internal helpers grouped by concern (experimental
  gating, safe-upgrade actions, canary, collection, scan, proposal).
- Target submodule layout with one file per concern cluster.
- Acceptance gates and invariant exposure.

## Invariants Checked

- **I1** (public CLI surface stable): no code change in this card → no
  behavior change. The plan locks the future split's contract.

## Validator Results

```
typecheck: unchanged (no code touched)
```

## Why a plan instead of the implementation

See "Rationale" above. The plan is upstream-friendly artifact: it can be
landed as a doc PR and the actual split lands as a separate PR once the
baseline plugin-sdk conflict is resolved.
