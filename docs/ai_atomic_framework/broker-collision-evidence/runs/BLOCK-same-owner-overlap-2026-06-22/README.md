# BLOCK Same-Owner Overlap Bounded Evidence

Date: 2026-06-22

Purpose: Authoritative archive for the negative same-file / same-owner-map / overlapping-bounded-region admission case.

## Authoritative evidence

- `write-broker.registry.json`
  - Authoritative registry snapshot after BLOCK-A and BLOCK-B both registered.
  - Expected active intents:
    - `intent-1782121051602` / `TASK-PAPER-HOTFILE-BLOCK-A` / `bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-A:codex-gpt5`
    - `intent-1782121319524` / `TASK-PAPER-HOTFILE-BLOCK-B` / `bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-B:claude-opus47`
- `team-0a7e6f1a47d0.json`
  - BLOCK-A / BLOCK-B team-run snapshot.
  - Target function: `classifyExplicitMutationRequest`
  - Shared owner atom: `atm.broker.classify-explicit-mutation-request`
  - Overlapping region: `packages/cli/src/commands/broker.ts:841-878`
- `bench-paper-hotfile-block-a-intent.json`
  - Write intent file used for BLOCK-A.
- `bench-paper-hotfile-block-b-intent.json`
  - Write intent file used for BLOCK-B.
- `blocked-register-b-decision.json`
  - B-side blocked verdict & conflict details.
- `broker-status-snapshot.json`
  - Status output mapping the split suggestion (`decompositionRequest.suggestedAtoms`).

## Interpretation

- This archive captures the negative admission result when two proposals overlap on the same owner atom and the same bounded region.
- First writer (`BLOCK-A`) registered successfully as `direct-brokered` and obtained `provisional-write-lease`.
- Second writer (`BLOCK-B`) is blocked at admission stage with verdict `blocked-active-lease` and state `blocked-before-write`.
- When B-side enters, the broker triggers a re-arbitration on the A-side intent, updating the effective decision to `blocked-cid-conflict` and generating a `decompositionRequest` split suggestion:
  - Suggested child atom: `atm.broker.classify-explicit-mutation-request.focus.841-878`
  - This allows the curator to split the coarse same-owner map into finer-grained disjoint segments for future parallel execution.
