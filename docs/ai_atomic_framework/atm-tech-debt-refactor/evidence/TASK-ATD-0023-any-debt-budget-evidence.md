---
doc_id: doc_other_0723
task_id: TASK-ATD-0023
title: Evidence — any debt budget package / public contract 分層
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Established the `any` debt budget with three concrete artifacts:

1. **Baseline measurement** — 734 occurrences across 82 files in `packages/`.
2. **Budget policy document** at `docs/any-debt-budget.md` defining tiers
   (public contract: 0; package runtime: ratchet-only; tests + scripts:
   unbudgeted).
3. **ESLint warning rule** scoped to `packages/*/src/**` (excluding tests)
   — `@typescript-eslint/no-explicit-any: 'warn'`.

## Changes Made

### `docs/any-debt-budget.md` (new)
- Baseline: 734 `any` in `packages/`.
- Per-layer budget (public contract / runtime / tests / scripts).
- Ratchet policy (net non-positive delta per PR on `packages/`).
- 3-step progressive enforcement plan (doc → warn → per-package error).
- Waiver process for unavoidable `any` in public contract files.
- Concrete `rg` commands for checking the count.

### `eslint.config.mjs`
- Added a 4th config block scoped to `packages/*/src/**/*.ts` (excluding
  test files) with `@typescript-eslint/no-explicit-any: 'warn'`.
- Verified by running `npx eslint packages/cli/src/commands/shared.ts`:
  produces 11 warnings, 0 errors — exactly the intended "warn but don't
  break" behavior.

## Why warn now, error later

Enforcing as `error` immediately would block 734 sites at once. The doc
explains the 3-step ratchet (doc / warn / per-package error). This card
lands steps 1 + 2; step 3 is incremental per-package follow-up.

## Invariants Checked

- No public contract change — the doc captures the contract; the rule
  reports drift without blocking.

## Validator Results

```
npx eslint packages/cli/src/commands/shared.ts: 0 errors, 11 warnings (intended)
typecheck: 0 errors (clean)
```
