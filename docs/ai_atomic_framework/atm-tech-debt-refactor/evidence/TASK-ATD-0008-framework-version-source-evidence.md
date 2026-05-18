---
doc_id: doc_other_0708
task_id: TASK-ATD-0008
title: Evidence — framework version 來源改為 package / release manifest
status: done
completed_at: 2026-05-18T17:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Centralized framework version reading into a single `readFrameworkVersion()`
helper in `shared.ts`. The hardcoded `frameworkVersion = '0.0.0'` constant is
kept as a documented fallback, and the existing `atm-chart.ts:readFrameworkPackageVersion`
now delegates to the central helper.

## Changes Made

### `packages/cli/src/commands/shared.ts`
- Added `readFrameworkVersion(root?: string): string` — reads `version` from the
  framework `package.json` with a documented fallback to the bundled constant.
- Reused for both runtime CLI reads and config materialization.

### `packages/cli/src/commands/init.ts`
- Replaced the hardcoded `frameworkVersion` constant import with
  `readFrameworkVersion()` call in `createDefaultConfig()`.
- The CLI JSON shape is unchanged because `package.json:version` is currently
  `0.0.0` (same value as the previous constant).

### `packages/cli/src/commands/atm-chart.ts`
- Removed local `bundledFrameworkVersion` import alias.
- Refactored `readFrameworkPackageVersion()` to delegate to `readFrameworkVersion()`
  from shared.ts. Preserves the existing export name for any external callers.

## Invariants Checked

- **I1** (public CLI surface): `--json` shape unchanged; `frameworkVersion` in
  `atm init` config and `welcome --dry-run` output still reports the same value
  (sourced from package.json which equals the previous fallback).
- **I6** (version source): single SSoT now lives in `readFrameworkVersion()`;
  hardcoded const is documented as a fallback only.

## Validator Results

```
[validate:cli] ok (23 commands, standalone fixture verified)
[validate:standard] ok (passed=53, failed=0, total=53)
typecheck: 6 pre-existing scripts/ errors; packages/ clean
```
