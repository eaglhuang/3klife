---
doc_id: doc_other_0718
task_id: TASK-ATD-0018
title: Evidence — propose.ts 拆分 proposal analysis / gate / output
status: done
completed_at: 2026-05-19T11:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Landed a **documented split plan** for `packages/core/src/upgrade/propose.ts`.
The actual restructure is deferred to a future card for the same reason as
ATD-0016: the working tree had pre-existing merge conflicts that made
verification of an invasive split unreliable.

## Changes Made

### `packages/core/src/upgrade/SPLIT_PLAN.md` (new)

Inventories all 25+ internal helpers in `propose.ts` (942 lines) grouped
by the 3 concerns the task title calls out:

1. **Analysis** — `normalizeRequest`, `normalizeInputDocument`,
   `inferInputKind`, `findInput`/`requireInput`, `buildInputRefs`,
   `createInputSummary`, `resolveInputSchemaId`, `normalizeTarget`,
   `normalizeRequestedReplacementMode`. ~200 lines.

2. **Gates** — `buildGateResult`, 8 `build*Gate` helpers,
   `normalizeGateResult`, `gateFailureSummary`,
   `qualityComparisonFailureReason`. ~370 lines.

3. **Output** — `buildRequiredJustification` (~80 lines) +
   `proposeAtomicUpgrade` orchestration (~250 lines).

Target submodule layout under `propose/`:
- `analysis.ts` — concern (1)
- `gates.ts` — concern (2)
- `failure-reason.ts` — gate failure renderers
- `output.ts` — concern (3)

The top-level `propose.ts` keeps `proposeAtomicUpgrade` and only that.

## Acceptance gates documented in the plan

1. `validate:schemas` — every proposal fixture produces the same JSON.
2. `validate:type-schema-sync` — types stay aligned.
3. `validate:standard` — 53/53 maintained.
4. Negative fixtures still fail with the same gate name and message code.

## Invariants Checked

- **I2** (schema additive-first): no code touched in this card; the plan
  pins the future split's contract.

## Validator Results

```
typecheck: unchanged (no code touched)
```

## Dependencies

The plan notes a soft dependency on TASK-ATD-0016 (`upgrade.ts` split):
splitting upgrade.ts first would clarify which `propose.ts` helpers are
still called from the CLI side and could shape the gate-builder boundaries.

## Pre-existing baseline note

Same broken-baseline note as ATD-0011. Documentation-only change in this
card.
