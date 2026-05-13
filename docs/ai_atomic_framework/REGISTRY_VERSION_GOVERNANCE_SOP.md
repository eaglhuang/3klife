# Registry Version Governance SOP

## Purpose

Define one canonical operating policy for `currentVersion` and `versions[]` so daily maintenance and ATM validators stay aligned.

## Scope

This SOP applies to:

- `atomic-registry.json` version history fields
- `validate-registry-version-governance`
- `validate-registry-sidecar-convergence`
- `validate-registry-backfill-sweep`

This SOP does not change public CLI surfaces. It only standardizes operator behavior.

## Governance Rules

1. `versions[]` is the immutable history log.
2. `currentVersion` points to the active release in `versions[]`.
3. New version records must be appended, not rewritten in place.
4. `--apply` is allowed only after human review of `--strict` output.
5. If `--strict` reports blockers, no promotion to `currentVersion` is allowed.

## Operational Sequence

1. Prepare candidate version metadata in registry.
2. Run strict checks:

```bash
npm run validate:registry-version-governance -- --strict
npm run validate:registry-sidecar-convergence -- --strict
npm run validate:registry-backfill-sweep -- --strict
```

3. Review findings:

- `blocker`: stop and fix before apply.
- `advisory`: allowed to continue, but must be documented in PR notes.

4. Apply alignment only after review:

```bash
npm run sync:registry-version-governance
```

5. Re-run strict checks and keep reports as evidence.

## PR Review Checklist

- `currentVersion` exists in `versions[]`.
- `versions[]` record shape is complete for the promoted version.
- sidecar convergence remains green.
- no new blocker in backfill sweep.
- ATM any-boundary core gate remains pass.

