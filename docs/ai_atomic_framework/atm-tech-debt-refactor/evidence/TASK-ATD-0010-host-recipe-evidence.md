---
doc_id: doc_other_0710
task_id: TASK-ATD-0010
title: Evidence — Git hook / CI enforcement 改為 opt-in host recipe
status: done
completed_at: 2026-05-18T17:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Sharpened the docs so the boundary between ATM core (always-on, neutral) and
host opt-in recipes (hooks, CI) is explicit and unambiguous. No runtime
behavior change — this is a documentation realignment.

## Changes Made

### `examples/git-hooks-enforcement/README.md`
- Retitled to "Git Hooks Enforcement — Opt-in Host Recipe".
- Added explicit statement: ATM core never installs hooks, never modifies
  `.git/hooks/`, never assumes hooks are present.
- Added note: there is intentionally no `atm install-hooks` command — install
  must be an explicit host action.

### `docs/HOST_GOVERNANCE_INTEGRATION.md`
- Extended the "Enforcement Layers" table with a "Provided by" column showing
  ATM core vs host opt-in recipe vs host policy.
- Added new "What ATM core does NOT do" subsection listing 4 explicit
  non-behaviors:
  - No automatic Git hook installation
  - No CI configuration writes
  - No assumed CI provider / host platform
  - No hook-presence enforcement in `atm doctor`
- Closed with the framing: hooks / CI / branch protection are **opt-in host
  recipes**, framework ships examples and documents the `atm doctor` contract,
  host owns the gates.

## Invariants Checked

- **I4** (neutrality): all wording stays framework-neutral; no adopter-specific
  names introduced. Recipe references use generic "host repository" language.
- No public CLI surface changes (docs only).

## Validator Results

```
[validate:neutrality] ok (6 acceptance checks)
[validate:examples] ok (3 atom examples, conversation loop, agent onboarding flow, quick start verified)
[validate:standard] ok (passed=53, failed=0, total=53)
```
