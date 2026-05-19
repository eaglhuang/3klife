---
doc_id: doc_other_0714
task_id: TASK-ATD-0014
title: Evidence — 測試分層 unit / validator / release smoke / self-host alpha
status: done
completed_at: 2026-05-19T11:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Documented the 4-layer test taxonomy in `docs/testing-strategy.md`. Each
layer has a defined purpose, representative directory, npm script, speed
budget, and authoring conventions. This is the SSoT new tests reference
to decide which layer they belong to.

## Changes Made

### `docs/testing-strategy.md` (new)

The 4 layers:
| Layer | Lives in | Driven by |
|---|---|---|
| **unit** | `tests/unit/`, `tests/core/<helper>/` | `npm test` (node --test) |
| **validator** | `scripts/validate-*.ts` | `npm run validate:quick / validate:standard` |
| **release-smoke** | `tests/cli/`, `tests/agent-pack/`, `tests/adopter-sentinel/` | `npm run validate:cli` |
| **self-host alpha** | `packages/cli/src/commands/self-host-alpha.ts` + `.atm-temp/` | `npm run validate:self-host-alpha` |

Also documents:
- "When to use which layer" decision guide.
- Per-layer speed budgets (e.g. unit < 50ms/test, validator < 5s/test).
- Authoring conventions (node:test for unit, createValidator harness for
  validator, spawnSync for release-smoke).

## Invariants Checked

- **I4** (neutrality): docs use framework-neutral language only; no
  adopter-specific references.

## Validator Results

```
neutrality scan: no flagged markers introduced
```

## Pre-existing baseline note

Same broken-baseline note as ATD-0011. This card is docs-only and does not
touch any code path.
