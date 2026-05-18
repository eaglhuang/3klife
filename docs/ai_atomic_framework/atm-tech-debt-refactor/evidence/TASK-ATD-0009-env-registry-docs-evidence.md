---
doc_id: doc_other_0709
task_id: TASK-ATD-0009
title: Evidence — ATM_* 環境變數 registry 與 docs
status: done
completed_at: 2026-05-18T17:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Added a single-source-of-truth registry for all `ATM_*` environment variables
consumed by the framework, plus a public `docs/environment-variables.md` that
mirrors the registry.

## Changes Made

### `packages/cli/src/config/env-registry.ts` (new)
- Typed `EnvVarDescriptor` with surface (`public` | `internal-test`),
  kind (`path` | `string` | `boolean`), purpose, fallback, and consumer file.
- Inventoried 7 variables found across `packages/cli/src/**`:
  - **Public:** `ATM_TEMP_ROOT`, `ATM_RELEASE_TRUST_ROOT`,
    `ATM_COMPATIBILITY_MATRIX_PATH`, `ATM_KNOWN_BAD_VERSIONS_PATH`,
    `ATM_KNOWN_BAD_ROOT`.
  - **Internal/test:** `ATM_COMPATIBILITY_LEGACY_MATRIX_PATH`,
    `ATM_KNOWN_BAD_VERSION`.
- Added `findEnvDescriptor()` and `readEnvVar()` helpers. `readEnvVar()` throws
  for unregistered names so new env vars must be documented before use.

### `docs/environment-variables.md` (new)
- Public docs partitioned by surface (public vs internal-test).
- Each entry lists kind, purpose, default-when-unset, and consumer module.
- Includes "Adding a new ATM_* variable" workflow tying docs ↔ registry ↔ code.
- Uses framework-neutral wording (no 3KLife / npc-brain / Cocos references).

## Scope Decision (not in this card)

Did **not** refactor existing `process.env.ATM_*` callsites to use
`readEnvVar()`. Rationale: the task is "central declaration + docs". The
registry is the SSoT; runtime callers MAY adopt `readEnvVar()` incrementally.
Mass-refactoring is out of scope and would inflate diff for no behavior change.

## Invariants Checked

- **I4** (neutrality): docs contain no adopter-specific names; only generic
  framework / host language.

## Validator Results

```
[validate:neutrality] ok (6 acceptance checks)
[validate:examples] ok (3 atom examples, conversation loop, agent onboarding flow, quick start verified)
[validate:standard] ok (passed=53, failed=0, total=53)
typecheck: 6 pre-existing scripts/ errors; new env-registry.ts is clean
```
