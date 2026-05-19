---
doc_id: doc_other_0730
task_id: TASK-ATD-0030
title: Evidence — Multi-agent confidence report 沿用既有 matrix / result
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Extended `docs/multi-agent-results.md` with a "How to read this report"
section that ties together the existing matrix, per-agent confidence
result envelopes, and the self-host-alpha smoke contract. No new report
shape introduced — the card explicitly reuses the existing surfaces.

## Changes Made

### `docs/multi-agent-results.md`
- Preserved the existing auto-generated results table.
- Appended a new section after the table:
  - Field reference for the 4 columns (Result, Confidence Ready, Adapter
    Install + First Command, Charter Entry).
  - Advisory-not-blocking semantics explanation with the alpha0 → alpha1
    tightening plan.
  - Re-generation commands.
  - Cross-references to the compatibility matrix, SELF_HOSTING_ALPHA, and
    testing-strategy docs.

## Why "reuse" instead of "build new"

The card title explicitly says 沿用既有 matrix / result (reuse the existing
matrix / result). All three pieces already exist:

1. `self-host-alpha --verify` produces per-agent confidence envelopes.
2. The agent-pack + adapter registries feed
   `docs/multi-agent-compatibility-matrix.md`.
3. The neutrality scan keeps the matrix adopter-neutral.

The doc edit ties them into a single mental model so future contributors
know which surface to inspect for which question.

## Invariants Checked

- No public surface change — additive doc only.

## Validator Results

```
typecheck: 0 errors (clean)
```
