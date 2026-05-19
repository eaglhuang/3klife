---
doc_id: doc_other_0724
task_id: TASK-ATD-0024
title: Evidence — 開源文件補強 env / troubleshooting / adapter examples
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Created `docs/troubleshooting.md` (was missing!) covering the most common
failure modes adopters hit during bootstrap, CLI invocation, validators,
versions/releases, and adapter integration. The env-vars document
(`docs/environment-variables.md`) was already landed by TASK-ATD-0009.

## Changes Made

### `docs/troubleshooting.md` (new)
- 4 main sections: Bootstrap & adoption, CLI invocation, Validators,
  Versions & releases, Adapter / host integration, Environment variables.
- Each entry follows symptom / diagnose / fix / prevent shape.
- Pointers to invariants (I1, I2, I4, I5) and other docs
  (cli-error-policy, environment-variables, HOST_GOVERNANCE_INTEGRATION).
- All wording adopter-neutral.

## Existing docs cross-referenced

- `docs/environment-variables.md` (from ATD-0009) — referenced from
  troubleshooting's env section.
- `docs/cli-error-policy.md` (from ATD-0013) — referenced from
  troubleshooting's CLI section.
- `docs/HOST_GOVERNANCE_INTEGRATION.md` (from ATD-0010) — referenced from
  hooks/CI section.
- `examples/git-hooks-enforcement/README.md` (from ATD-0010) — referenced
  from the hooks section.

## Invariants Checked

- **I4** (neutrality): all examples and references use neutral language.
  No adopter-specific names; only generic "host repository" framing.

## Validator Results

```
typecheck: 0 errors (clean)
```
