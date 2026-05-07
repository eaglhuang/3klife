# Legacy Baseline Fixture Pack

This folder freezes the H2U baseline used by ATM-4-0002.

## What lives here

- `baseline-manifest.json` is the machine-readable source of truth.
- The matrix rows point at existing artifacts; do not copy or rewrite the historical evidence.
- Known gaps are task-scoped and expire; they are not permanent white lists.
- If a gap becomes a long-lived rule, move it to `tools_node/lib/html-to-ucuf/rule-registry.json`.

## Contract

- Baseline rows describe reproducible evidence, not a new domain spec.
- `knownGapPluginInput` stays structured so the next consumer can read it directly.
- Any new row should cite an existing artifact path and preserve the old snapshot instead of overwriting it.

## Related Files

- `docs/ai_atomic_framework/h2u-regression-matrix.md`
- `artifacts/atm-4-0002/baseline-summary.md`
