---
doc_id: doc_other_0715
task_id: TASK-ATD-0015
title: Evidence — 第一批快速單元測試（URN / allocator / shared helpers）
status: done
completed_at: 2026-05-19T11:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Created the first batch of unit tests under `tests/unit/` covering allocator
helpers, the new ATM env-var registry, and CLI shared helpers. All tests use
`node:assert/strict` per the testing-strategy convention. Each test file is
self-contained and runs in <50 ms.

## Changes Made

### `tests/unit/id-allocator.unit.test.ts` (new)
- Tests `parseAtomId()` — positive, numeric bucket suffix, 8 negative cases
  including null/undefined, whitespace trimming.
- Tests `normalizeAtomBucket()` — positive, invalid type (non-string), 5
  invalid patterns each throwing the correct AtomIdAllocationError code.
- 5 groups, 23 assertions.

### `tests/unit/env-registry.unit.test.ts` (new)
- Validates the registry shape — all 7 ATM_* descriptors have valid surface,
  kind, purpose, fallback, consumer.
- `findEnvDescriptor()` — lookup positive + unknown returns undefined.
- `readEnvVar()` — unregistered name throws, unset returns undefined,
  whitespace-only treated as unset, value trimmed.
- 6 groups, 30+ assertions.

### `tests/unit/shared-helpers.unit.test.ts` (new)
- `message()` and `makeResult()` shape + defaults.
- `CliError` — default exit code (1) + usage exit code (2).
- `readFrameworkVersion()` — fallback to bundled when package.json missing,
  reads from package.json, fallback on malformed JSON, fallback on missing
  version field. Uses `os.tmpdir()` for isolation.
- `createAtmAjv()` — proves format validators are wired (date-time test).
- `createSchemaValidator<T>()` — cached compile + typed predicate.
- 10 groups, 30+ assertions.

## Run Results

```
[unit:id-allocator] ok (5 groups, 23 assertions)
[unit:env-registry] ok (6 groups, 30+ assertions)
[unit:shared-helpers] ok (10 groups, 30+ assertions)
```

All three tests run in <100 ms total.

## Invariants Checked

No public surface change — only test additions.

## Pre-existing baseline note

Same broken-baseline note as ATD-0011. The unit tests run cleanly because
they import only pure helpers; they do not touch plugin-sdk where the
unrelated merge-conflict syntax error lives.
