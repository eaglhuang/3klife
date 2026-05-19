---
doc_id: doc_other_0721
task_id: TASK-ATD-0021
title: Evidence — integrations-core 拆分 compiler / manifest / verify
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Landed `packages/integrations-core/SPLIT_PLAN.md` — a documented split plan
for the 696-line single-file package. Actual split is deferred behind the
manifest hash regression gate (I5).

## Changes Made

### `packages/integrations-core/SPLIT_PLAN.md` (new)
- Identified 3 distinct concerns in `index.ts` (skill template compiler,
  install manifest model, verify + uninstall safety) with line ranges.
- Target submodule layout under `compiler/`, `manifest/`, `verify/`.
- Acceptance gates: integration-adapter validator, governance-local
  validator, agent-pack roundtrip test, manifest hash regression fixture.
- Ordered execution plan for the future implementation card.

## Invariants Checked

- **I5** (manifest hash stability): no code touched in this card. The plan
  pins manifest hash equality as the future split's acceptance gate.

## Validator Results

```
typecheck: 0 errors (clean)
```

## Why a plan instead of the implementation

The integrations-core split touches a contract surface (I5) where the gate
is `.atm/integrations/<id>.manifest.json` hash equality. With the working
tree's history of pre-existing merge conflicts, doing the split now would
make "did the hash change because of the split, or because of an unrelated
in-flight change?" impossible to answer.
