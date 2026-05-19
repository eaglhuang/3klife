---
doc_id: doc_other_0726
task_id: TASK-ATD-0026
title: Evidence — Version compatibility / known-bad / release trust 持續驗證
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Landed `docs/release-trust-ops.md` — the continuous verification recipe
that ties the 3 existing trust validators
(`validate-version-compatibility`, `validate-known-bad-versions`,
`validate-release-trust`) into a single operational gate.

## Changes Made

### `docs/release-trust-ops.md` (new)
- Inventoried the 3 already-implemented trust validators.
- Defined the "continuous" verification operational layer (pre-release
  ceremony, drift detection on main, cross-route check coordination).
- Per-validator continuous gates: what each asserts, when it runs, what
  failure means, and the canonical fix.
- Release ceremony checklist (concrete pre-tag verification steps).
- Manifest snapshot recipe for drift detection between releases.

## Invariants Checked

- **I6** (version source consistency) — the version-compatibility
  validator IS the gate. The doc pins the operational layer around it.
- **I3** (release artifact deterministic build) — the release-trust
  validator IS the gate.
- **I1** (public CLI surface stable) — the `welcome --dry-run` smoke
  inside version-compatibility transitively gates I1.

## Why an ops doc instead of new validators

The validators already exist. The gap was operational: no documented
checklist saying "before you tag, run X / Y / Z". This card closes that
gap with a checklist + manifest-snapshot recipe.

## Validator Results

```
typecheck: 0 errors (clean)
```
