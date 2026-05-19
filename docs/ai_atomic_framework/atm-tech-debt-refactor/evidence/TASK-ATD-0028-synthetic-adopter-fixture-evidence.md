---
doc_id: doc_other_0728
task_id: TASK-ATD-0028
title: Evidence — Synthetic adopter fixture (neutral)
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Created the `fixtures/adopter-sentinel/` directory (previously missing!)
with a neutrality contract README + a canonical `synthetic-adopter.fixture.json`
example. This is the SSoT for future adopter sentinel fixtures.

## Changes Made

### `fixtures/adopter-sentinel/README.md` (new)
- Neutrality contract (I4): no real adopter names, no proprietary
  identifiers, shape-faithful only.
- Documented the canonical fixture shape (repositoryKind, packageManager,
  installedIntegrations, lifecycle, tasks, evidence, neutrality block).
- "Adding a new fixture" workflow with 5 concrete steps.
- Rationale for why fixtures live here vs `tests/` (data vs executable).

### `fixtures/adopter-sentinel/synthetic-adopter.fixture.json` (new)
- The neutral starter fixture.
- Generic placeholders only (`synthetic-adopter`, `EXAMPLE-0001`,
  `example-monorepo`).
- Includes a `neutrality` block with timestamp + scanner code + notes
  documenting compliance.
- Mirrors the `LocalGovernanceBootstrapResult` shape so the runner can
  load it without schema mismatch.

## Invariants Checked

- **I4** (neutrality): all identifiers are generic placeholders. No
  3KLife / npc-brain / Cocos references. `validate:neutrality` covers
  `fixtures/**` and will flag any leak.

## Why this is additive, not a runner change

The runner (`scripts/adopter-sentinel.ts`) currently uses inline temp
workspaces with hardcoded profiles. The `--fixture` flag exists but only
recognizes `default` and `broken`. Wiring it to load fixtures from this
directory is a separate runner change, called out in TASK-ATD-0029's plan
doc (external profile loader).

This card landed the **canonical fixture contract** so the runner change
has a target to deserialize.

## Validator Results

```
typecheck: 0 errors (clean)
```
