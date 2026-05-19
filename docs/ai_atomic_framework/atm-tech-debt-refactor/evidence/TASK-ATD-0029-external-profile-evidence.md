---
doc_id: doc_other_0729
task_id: TASK-ATD-0029
title: Evidence — Adopter sentinel external profile 作為下游 evidence
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Landed `docs/adopter-sentinel-external-profile.md` defining the workflow by
which downstream adopters contribute their sandbox smoke as
upstream-friendly evidence — without leaking proprietary identity.

## Changes Made

### `docs/adopter-sentinel-external-profile.md` (new)
- The pattern: adopter writes neutral fixture → runs sentinel with
  external profile → files fixture + result JSON as GitHub issue →
  upstream replays + promotes or rejects.
- Neutrality contract (mirrors `fixtures/adopter-sentinel/README.md`).
- "Useful external profile" criteria: surfaces a real gap, minimal,
  reproducible cold.
- Implementation note for the runner: ~60 lines added to
  `adopter-sentinel.ts` to parse `--profile <id>` and load fixtures from
  `fixtures/adopter-sentinel/external/`.
- Why this matters: it's the M5 evidence loop in concrete form.

## Invariants Checked

- **I4** (neutrality): external profiles must pass the same neutrality
  scan as everything in `fixtures/**`.

## Why a doc instead of the runner change

The doc pins the contract. The runner change is small but cross-cuts
`scripts/` + `fixtures/` + `tests/` and depends on a clean baseline. The
doc lands as the spec the future implementation card follows.

## Validator Results

```
typecheck: 0 errors (clean)
```
