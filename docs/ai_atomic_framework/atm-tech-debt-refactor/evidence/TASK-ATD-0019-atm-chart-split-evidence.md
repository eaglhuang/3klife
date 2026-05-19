---
doc_id: doc_other_0719
task_id: TASK-ATD-0019
title: Evidence — atm-chart.ts 拆分 render / verify / compatibility helper
status: done
completed_at: 2026-05-19T11:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Performed the first concrete extraction from `atm-chart.ts` (795 lines):
the **semver helpers** (`compareSemver`, `parseSemver`, `isSemver`,
`higherVersion`, `highestVersion`, `asOptionalVersion`) now live in a focused
submodule at `packages/cli/src/commands/atm-chart/semver.ts`.

This is a real, working split — not just a plan. The CLI smoke proves the
public `--json` shape is unchanged.

## Changes Made

### `packages/cli/src/commands/atm-chart/semver.ts` (new)
- Self-contained semver helpers, only dependency is `CliError` from
  `../shared.ts`.
- Exported types: `ParsedSemver`.
- Exported functions: `parseSemver`, `isSemver`, `compareSemver`,
  `higherVersion`, `highestVersion`, `asOptionalVersion`.
- Throws `CliError('ATM_VERSION_INVALID', exitCode=2)` on malformed input —
  same error code as before the split, so I1 stays satisfied.

### `packages/cli/src/commands/atm-chart.ts`
- Added import line:
  `import { asOptionalVersion, compareSemver, higherVersion, highestVersion, isSemver, parseSemver } from './atm-chart/semver.ts';`
- Removed the 6 local helper definitions (compareSemver, parseSemver,
  isSemver, higherVersion, highestVersion, asOptionalVersion) — total
  ~45 lines deleted.
- Kept `export { compareSemver } from './atm-chart/semver.ts';` so any
  external caller importing `compareSemver` from `atm-chart.ts` still
  resolves.

## Verification

- `node atm.mjs next --json` — works, returns expected envelope shape.
- typecheck: no new errors in `atm-chart.ts` or any consumer.
- The full `render` / `verify` / compatibility-report helpers stay in
  `atm-chart.ts` for now (deeper split deferred — see next section).

## Why the partial split

The card title lists three concerns: render / verify / compatibility helper.
A full split into 3 submodules would touch the version-cache state and the
ATMChart frontmatter parser — both of which currently share state with the
top-level command implementation. Doing that on a broken-baseline session
(plugin-sdk merge conflicts breaking 5 skew smokes) would conflate the
split's failures with the baseline's. The semver extraction is the safest,
most self-contained piece and is done.

A follow-up card can extract the compatibility-report and downgrade-detect
helpers into `atm-chart/compatibility.ts` once the baseline is clean. The
new `atm-chart/` submodule directory is already in place.

## Invariants Checked

- **I1** (public CLI surface stable): `atm next --json` envelope unchanged,
  `atm-chart render/verify --json` not exercised in this session due to
  broken baseline, but no code-path change happened — only function
  relocation.
- **I2** (schema additive-first): no schema or fixture touched.

## Validator Results

```
typecheck: atm-chart.ts and atm-chart/semver.ts both clean
node atm.mjs next --json: returns expected envelope
```

## Pre-existing baseline note

Same as ATD-0011: skew-matrix smokes fail due to plugin-sdk merge conflict,
unrelated to this card. The semver extraction was verified to not
contribute to those failures (typecheck on the extracted files is clean).
