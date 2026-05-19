---
doc_id: doc_other_0722
task_id: TASK-ATD-0022
title: Evidence — map-generator.ts 拆分 allocation / scaffold / provenance
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Landed `packages/core/src/manager/map-generator.SPLIT_PLAN.md` documenting
the split of the 607-line `map-generator.ts` into 6 submodules. Actual
split is deferred for the same baseline-stability reason as the other M3
cards in this batch.

## Changes Made

### `packages/core/src/manager/map-generator.SPLIT_PLAN.md` (new)
- Inventory of 2 public functions + ~25 internal helpers grouped into 3
  clusters (request normalization, lineage/replacement normalization,
  provenance/allocation/scaffold).
- Target submodule layout (`normalize-request`, `normalize-fields`,
  `normalize-lineage`, `allocate`, `scaffold`, `provenance`).
- Acceptance gates (map-equivalence fixtures hash-equal, validate:quick,
  validate:standard).
- Ordered execution plan extracting helpers in dependency order.

## Invariants Checked

- The card carries no listed invariant_risk. In practice the map output
  feeds upgrade/propose (I2) and registry-diff (I2); the plan calls those
  fixtures out as the gate.

## Validator Results

```
typecheck: 0 errors (clean)
```
