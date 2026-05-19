---
doc_id: doc_other_0713
task_id: TASK-ATD-0013
title: Evidence — CLI error policy CliError + typed code + usage exit code
status: done
completed_at: 2026-05-19T11:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Documented the public CLI error contract: error envelope shape, exit code
policy (1 = runtime failure, 2 = usage error), code policy (stable
`ATM_*` SCREAMING_SNAKE_CASE tokens are part of I1), and details policy
(camelCase JSON-serializable fields). Policy lives in two places:

1. JSDoc on the `CliError` class itself — runtime SSoT.
2. `docs/cli-error-policy.md` — public docs SSoT.

## Changes Made

### `packages/cli/src/commands/shared.ts`
- Added comprehensive JSDoc block above the `CliError` class explaining:
  - Output envelope (`{ ok: false, messages: [...] }` with process exit code
    set from `error.exitCode`).
  - Exit code policy: 1 = runtime failure, 2 = usage error.
  - Code policy: stable `ATM_*` tokens, part of I1, renaming = breaking.
  - Details policy: camelCase, JSON-serializable, no class instances.

### `docs/cli-error-policy.md` (new)
- Public-facing version of the same policy with concrete examples.
- Section on "Throwing inside command implementations" showing the right
  pattern (`throw new CliError('ATM_CLI_USAGE', '...', { exitCode: 2 })`).
- Section on adding release-smoke fixtures for new error codes.
- References `docs/testing-strategy.md` for layer taxonomy.

### Unit test coverage
- `tests/unit/shared-helpers.unit.test.ts` includes CliError construction
  tests: default exit code (1), usage exit code (2 via options), details
  preservation.

## Scope decision

This card establishes the **policy**. Auditing every `throw new CliError`
in the codebase to ensure it matches the policy is a follow-up. The
current codebase already uses the policy consistently (verified by spot-checks
across `agent-pack.ts`, `init.ts`, `verify.ts`, `atm-chart.ts`).

## Invariants Checked

- **I1** (public CLI surface stable): no error codes renamed; no exit codes
  changed; existing CliError throws are unaffected.

## Validator Results

```
typecheck: shared.ts compiles clean (only docstring + class JSDoc added)
unit:shared-helpers: CliError tests pass
```

## Pre-existing baseline note

Same broken-baseline note as ATD-0011: skew-matrix smokes fail due to
unrelated plugin-sdk merge conflicts. This card did not modify any code
path; only docstring + new docs file.
