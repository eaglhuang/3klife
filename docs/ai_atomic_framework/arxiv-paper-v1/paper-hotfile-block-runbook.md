# Paper Hotfile BLOCK Runbook

## Goal

Produce one clean negative live case for the paper:

`proposal-submitted -> blocked-before-write -> split-suggestion`

Target file:

- `packages/cli/src/commands/broker.ts`

Shared bounded region:

- `classifyExplicitMutationRequest`
- lines `841-878`
- shared owner atom: `atm.broker.classify-explicit-mutation-request`

## Task Pair

- `TASK-PAPER-HOTFILE-BLOCK-A`
- `TASK-PAPER-HOTFILE-BLOCK-B`

## Expected Broker Behavior

1. First writer enters with proposal-first admission on the shared bounded region.
2. Second writer submits a proposal against the same owner atom and the same bounded region.
3. Broker blocks before live write instead of routing to composer.
4. Blocked decision should carry a same-owner split suggestion (`decompositionRequest.suggestedAtoms`) for curator follow-up evidence.

## Role Split

- Lane A: first mover, prepares a tiny patch inside lines `841-878`
- Lane B: second mover, prepares another tiny patch inside the same lines `841-878`

Both sides must:

- use `node atm.dev.mjs`
- go through `team validate` / `team start` / `broker register`
- submit proposal artifacts before any write
- avoid direct edits outside the assigned region

## Minimal Patch Guidance

Keep both patches tiny and reviewable:

- A-side: wording or missing-input diagnostics in `classifyExplicitMutationRequest`
- B-side: a nearby guard or reason-string refinement in the same function

Do not:

- move to another function
- change owner atom
- touch `parseBrokerArgs`
- touch `release/atm-root-drop/**`

## Evidence to Archive

- `.atm/runtime/team-runs/*.json`
- `.atm/runtime/write-broker.registry.json`
- both intent files
- both proposal files
- raw `broker status` snapshot after second register
- blocked decision / stderr / json output
- any emitted split-suggestion artifact

## Paper Framing

This case is the negative companion to POS2:

- POS2 proves same-file / same-owner-map / disjoint bounded regions can route to composer and merge safely.
- BLOCK proves same-file / same-owner-map / overlapping bounded region is stopped before live write.
- The split suggestion closes the loop by turning a coarse blocked owner map into a curator-reviewable refinement candidate.
