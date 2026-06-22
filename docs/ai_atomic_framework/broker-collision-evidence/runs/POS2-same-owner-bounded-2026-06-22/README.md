# POS2 Same-Owner Bounded Evidence

Date: 2026-06-22

Purpose: authoritative archive for the positive same-file / same-owner-map / disjoint-bounded-region admission case.

## Authoritative evidence

- `write-broker.registry.json`
  - authoritative registry snapshot after POS2-A and POS2-B both registered
  - expected active intents:
    - `intent-1782112503025` / `TASK-PAPER-HOTFILE-POS2-A` / `bench:PAPER-HOTFILE-POS:TASK-PAPER-HOTFILE-POS2-A:codex-gpt54mini`
    - `intent-1782112902039` / `TASK-PAPER-HOTFILE-POS2-B` / `bench:PAPER-HOTFILE-POS:TASK-PAPER-HOTFILE-POS2-B:claude-opus47`
- `team-68e022e8dc82.json`
  - POS2-A team-run snapshot
  - bounded region: `packages/cli/src/commands/broker.ts:841-878`
  - proposal admission: `same-file-overlap-risk`
- `team-179057e64770.json`
  - POS2-B team-run snapshot
  - bounded region: `packages/cli/src/commands/broker.ts:989-1142`
  - final authoritative lane for the second writer: `deterministic-composer`
  - final authoritative verdict for the second writer: `needs-physical-split`
- `bench-paper-hotfile-pos2-a-intent.json`
  - clean rerun template used for POS2-A
- `bench-paper-hotfile-pos2-b-intent.json`
  - clean rerun template used for POS2-B

## Interpretation

- This archive captures the positive admission result for same-file writes on the same owner map when the two proposals are bounded to disjoint regions.
- First mover (`POS2-A`) remains `direct-brokered` with `provisional-write-lease`.
- Second mover (`POS2-B`) is routed to `deterministic-composer` with `needs-physical-split`.
- The broker therefore does not fail closed at admission for this pair; instead it upgrades the second writer into the composer lane before working-tree mutation.

## Known noisy files

The generated `broker-capture.*` and `broker-evidence-bundle.*` files are useful indexes, but they also include earlier exploratory POS2 runs:

- `team-57c001e46b4d.json`
- `team-f45c51bc3f92.json`

Those earlier runs are not the authoritative rerun for paper citation. They should be treated as background traces only.

## Excluded contamination

Do not cite the contaminated register attempt where a POS2-B flow reused a POS2-A payload. That anomaly is tracked separately in the ATM backlog:

- `ATM-BUG-2026-06-22-017`

