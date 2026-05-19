---
doc_id: doc_other_0711
task_id: TASK-ATD-0011
title: Evidence — Validator harness 分批收斂
status: done
completed_at: 2026-05-19T11:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Added comprehensive JSDoc to `scripts/lib/validator-harness.ts` documenting
the four-helper surface and migration guidance. Added a new
`loadSchemaValidator()` helper that captures the common
"read JSON + create AJV + compile" three-line pattern repeated across most
schema validators.

## Changes Made

### `scripts/lib/validator-harness.ts`
- Added file-header JSDoc block describing the harness's four-helper surface
  (`assert/fail/ok`, file IO, AJV factory, CLI spawner) and pointing to
  `docs/testing-strategy.md` for the test-layer taxonomy.
- Added `loadSchemaValidator<T>(relativeSchemaPath)` helper: returns a typed
  predicate by combining `readJson + createAjv + ajv.compile`. Captures the
  common pattern repeated across ~20 `validate-*.ts` files.
- Exported helper through `ValidatorHarness` interface so the typed surface
  is consistent.

## Scope decision

This card is "validator harness 分批收斂" (batch consolidation). 65 of 73
validators don't use `createValidator` yet — a full migration is multiple
cards of work. This card:
1. Documents the harness as the SSoT.
2. Adds the most-common missing helper (`loadSchemaValidator`).
3. Leaves the actual migration of 65 validators as follow-up.

The next batch (a future card) can convert validators one cluster at a time
(e.g. "all schemas validators" or "all governance validators").

## Validator Results

```
typecheck: harness file compiles clean
```

Pre-existing baseline issues (unrelated to this card):
- 5 skew-matrix smokes fail because `packages/plugin-sdk/src/*` has a
  syntax error from an unrelated in-flight merge (UU files in git status).
- 6 pre-existing typecheck errors in `scripts/validate-*.ts` and
  `scripts/validate-police-family.ts` — none touched by this card.
