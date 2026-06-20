# B-12 Controlled Field Collision Archive

Archived on 2026-06-21 from ATM runtime artifacts produced by the controlled
field collision run executed on 2026-06-20.

## What this archive proves

- `TASK-TEAM-0042` and `TASK-TEAM-0043` both reached team admission with
  `parallel-safe` broker-lane decisions.
- The decisive contention did not occur at admission time.
- `TASK-TEAM-0043` acquired the active broker intent in
  `write-broker.registry.json`.
- The competing side (`TASK-TEAM-0042`) was later blocked when advancing
  toward apply-phase against an already-held active intent.

This archive should therefore be cited as **apply-phase collision evidence**,
not as an admission-time freeze case.

## Files

- `team-4a7221ebbb23.json`
  Team-run snapshot for `TASK-TEAM-0042`
  (`bench:B-12:TASK-TEAM-0042:codex-gpt54mini`).
- `team-cd46fbcc7ad3.json`
  Team-run snapshot for `TASK-TEAM-0043`
  (`bench:B-12:TASK-TEAM-0043:claude-opus47`).
- `write-broker.registry.snapshot.json`
  Registry snapshot showing the active intent held by `TASK-TEAM-0043`.
- `broker-capture.json` / `broker-capture.md`
  Post-run capture output indexing the relevant broker and team-run evidence.
- `broker-evidence-bundle.json` / `broker-evidence-bundle.md`
  Bundled evidence report used for paper/report traceability.
- `b12-0042-proposal.json`
  Minimal apply-phase proposal prepared for the controlled collision attempt.
- `b12-0042-merge-plan.json`
  Merge-plan artifact paired with the proposal above.

## Verified facts

- Both team-run files record `baseCommit`:
  `6ee99143931b5a9c8fe0953f14903498ff4c62b0`.
- Both team-run files record admission verdict `parallel-safe`.
- The registry snapshot records `TASK-TEAM-0043` as the active holder of
  `atm.team-agents-runtime`.
- The registry snapshot also records four shared files held by that intent:
  - `packages/cli/src/commands/team.ts`
  - `docs/governance/team-agents/team-vendor-runtime.md`
  - `scripts/validate-team-agents.ts`
  - `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Vendor split is real:
  - `codex-gpt54mini` (OpenAI family)
  - `claude-opus47` (Anthropic family)

## Citation note

When writing the paper, describe B-12 as:

1. a real multi-vendor controlled collision,
2. admitted in parallel at team-start time,
3. then serialized by broker-controlled active-intent enforcement at the
   apply-phase boundary.
