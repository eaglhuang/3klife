---
doc_id: doc_other_0717
task_id: TASK-ATD-0017
title: Evidence — plugin-governance-local export maturity inventory + 拆分
status: done
completed_at: 2026-05-19T11:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Landed the **export maturity inventory** for `@ai-atomic-framework/plugin-governance-local`
plus a documented split plan for when the actual restructure happens. This
gives callers an SSoT for which exports are stable contracts vs which may
move in a future split.

## Changes Made

### `packages/plugin-governance-local/EXPORTS.md` (new)

Inventories every exported symbol from this package (index.ts is 1415 lines,
14 named exports + 3 re-exports from submodules):

| Tier | Count | Examples |
|---|---|---|
| stable | 7 | `pluginGovernanceLocalPackage`, `createLocalGovernanceAdapter`, `LocalGovernanceConfig`, `LocalGovernanceBootstrapResult`, `createOfficialBootstrapCommand`, `createRecommendedPrompt`, `ContinuationContractInput` |
| beta | 6 | `adoptLocalGovernanceBundle`, `installRootDropScripts`, `createSelfHostingAlphaPrompt`, `estimateContextBudgetTokens`, `createContinuationSummaryRecord`, `createContinuationRunReport` |
| alpha | 0 | (none after this audit) |
| stable re-exports | 4 | `resolveLocalGovernanceLayout`, `createLocalGovernanceStores`, `createDefaultGuards`, `defaultGuardCatalog` |

The inventory also lays out a 4-submodule split plan (bootstrap, prompt,
budget, index entry) with explicit reasoning for why the split is deferred
to a future card (I5 manifest stability requires extra fixture coverage).

## Why inventory now, split later

- I5 (manifest stability): every public re-export must remain reachable
  from `index.ts` to preserve adopter manifest hashes. A safe split needs
  fixture coverage in `tests/agent-pack/install-uninstall-roundtrip.test.ts`
  and a manifest-hash regression fixture.
- The inventory IS the gate for the split — without it, callers can't tell
  which symbols are stable vs in-motion.

## Invariants Checked

- **I5** (manifest stability): no code touched → no manifest hash drift.
- The inventory document explicitly pins which re-exports must stay reachable.

## Validator Results

```
typecheck: unchanged (no code touched)
```

## Pre-existing baseline note

Same broken-baseline note as ATD-0011. This card adds a documentation file
only; no validator regression possible.
