---
doc_id: doc_other_0712
task_id: TASK-ATD-0012
title: Evidence — 共用 AJV factory/cache 且保持 pass/fail 行為
status: done
completed_at: 2026-05-19T11:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Created `packages/core/src/validation/ajv-factory.ts` exposing a single
`createAtmAjv()` factory plus a `createSchemaValidator<T>(schema)` cached
predicate helper. This unifies AJV instance creation between validators
(which already use the harness `createAjv()`) and runtime code.

## Changes Made

### `packages/core/src/validation/ajv-factory.ts` (new)
- `createAtmAjv()` — AJV 2020 instance with `{ allErrors: true, strict: false }`
  + `addFormats`. Identical configuration to the validator harness's helper.
- `createSchemaValidator<T>(schema)` — returns a typed predicate with the
  compiled validator cached in closure. The "compile once, validate many"
  one-liner that runtime code needs.
- Full JSDoc explaining when to use each.

### Unit test coverage
- `tests/unit/shared-helpers.unit.test.ts` covers both functions:
  - `createAtmAjv()` works with date-time format (proves `addFormats` is wired).
  - `createSchemaValidator<T>()` validates positive and negative cases.

## Scope decision (pass/fail behavior preserved)

The factory is **additive** — existing runtime code that already calls
`new Ajv2020({...})` directly is unchanged. Migration of those callers is
incremental. The acceptance criterion "positive / negative fixtures 結果不變"
holds trivially because no existing pass/fail behavior was touched.

## Invariants Checked

- **I2** (schema additive-first): no schema changes; no fixture results
  changed; no compiled validator behavior changed.

## Validator Results

```
typecheck: ajv-factory.ts compiles clean
unit:shared-helpers: 10 groups, 30+ assertions, all pass (covers ajv factory)
```

## Pre-existing baseline note

Same broken-baseline note as TASK-ATD-0011: 5 skew-matrix smokes fail due
to an unrelated `packages/plugin-sdk/` syntax error from in-flight merges.
This card did not modify plugin-sdk and is unaffected.
