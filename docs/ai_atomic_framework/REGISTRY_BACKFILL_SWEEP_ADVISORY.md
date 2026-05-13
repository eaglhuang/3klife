# Registry Backfill Sweep Advisory Policy

## Goal

Prevent false alarm escalation when sandbox or environment constraints produce non-blocking warnings in `validate-registry-backfill-sweep`.

## Classification

`validate-registry-backfill-sweep` findings must be interpreted with two classes:

1. `blocker`
2. `advisory`

Only `blocker` can fail merge gates.

## Advisory Handling

Typical advisory source:

- nested spawn restricted in sandbox, so upstream validators are skipped with fallback metadata.

When this happens:

1. Keep the run result as valid for local guardrails if no blocker exists.
2. Add a short note in PR description:
   `advisory-only fallback observed (spawn-restricted environment)`.
3. Re-run the same command in a spawn-capable environment before release branch merge.

## Blocker Handling

If `blockerCount > 0`, treat as hard failure:

1. no apply
2. no promote
3. no merge

Fix data or contract drift first, then re-run strict checks.

## Required Command

```bash
npm run validate:registry-backfill-sweep -- --strict
```

