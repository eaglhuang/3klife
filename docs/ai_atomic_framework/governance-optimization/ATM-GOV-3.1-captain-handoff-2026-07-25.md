# Plan 3.1 Captain handoff and operations pack

Date: 2026-07-24

Planning authority: `C:/Users/User/3KLife/docs/ai_atomic_framework`

Target authority: `C:/Users/User/AI-Atomic-Framework`

Primary Plan 3.1 doc:
`governance-optimization/end-to-end-auto-batch-performance-plan-v3.md`

Primary SKL doc:
`skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md`

## Owner objective

Plan 3.1 must prove, with command-backed data, that two independent captains
can safely complete high-coupling work on one canonical worktree without
step-by-step human arbitration. A correct freeze is not sufficient: bounded
disjoint work must reach canonical admission, mutation, publication, and close
with zero borrowed authority, zero ownerless WIP, zero manual lock deletion,
zero post-close hygiene conversation, and zero unarchived release receipt.

This file is no longer a short memo. It is the captain-facing operations pack
for the remaining Plan 3.1 and SKL work. Read it together with:

- `governance-optimization/end-to-end-auto-batch-performance-plan-v3.md`
- `skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md`
- `governance-optimization/tasks/`
- `skl-tool-first-upgrade/tasks/`
- `docs/governance/atm-bug-and-optimization-backlog.md`

## What is already proven

### Done Plan 3.1 foundations

- `ATM-GOV-0239` done: closure truth and evidence replay fail-closed
- `ATM-GOV-0241` done: replay evidence schema and telemetry seal
- `ATM-GOV-0250` done: receipt-bound shared-delivery commit repair
- `ATM-GOV-0254` done: post-compose semantic validation
- `ATM-GOV-0256` done: runner-sync source snapshot and receipt path hardening
- `ATM-GOV-0257` done: actor continuity and executable recovery parity
- `ATM-GOV-0258` done: transactional staged commit queue MVP
- `ATM-GOV-0259` done: write-ticket scope amendment and out-of-scope WIP guard
- `ATM-GOV-0260` done: candidate-scoped line budget and nested root-cause surfacing
- `ATM-GOV-0261` done: VCS-neutral commit candidate isolation and Git fallback boundary
- `ATM-GOV-0262` done: overlap matcher call-site parity
- `ATM-GOV-0263` done: autonomous continuation and executable recovery parity
- `ATM-GOV-0264` done: canonical admission facade and same-atom bounded proposal routing

### Done lane and SKL foundations

- `TASK-LANE-0021` done: borrowed authority and ticket/secret reuse fail-closed
- `TASK-SKL-0018` done: provider-neutral skill capability foundation
- `TASK-SKL-0019` done: skill definition vNext and progressive disclosure compiler
- `TASK-SKL-0020` done: intake and to-ticket style task graph foundation
- `TASK-SKL-0021` done: Standards/Spec review foundation
- `TASK-SKL-0027` done: replaceable deep-module review provider route

## Current planned frontier

### Highest-value immediate cards

- `TASK-SKL-0028`
- `TASK-LANE-0022`

### Downstream after those land

- `ATM-GOV-0265`
- `TASK-SKL-0023`
- `TASK-SKL-0024`
- `TASK-SKL-0025`
- `TASK-SKL-0026`
- `TASK-SKL-0029`
- `ATM-GOV-0246`
- `ATM-GOV-0242`
- `ATM-GOV-0243`
- `ATM-GOV-0244`
- `ATM-GOV-0245`
- `TASK-SKL-0030`

## Why the next wave is 0028 plus 0022

`ATM-GOV-0264` fixed canonical admission, but it did not eliminate every future
serialization point. It only ensured that same atom or CID is not treated as an
automatic final freeze before bounded comparison.

The next best dispatch is:

- `TASK-SKL-0028` because it productizes the skill/projection/canary/ignore-state
  lessons and makes every later captain faster and less error-prone.
- `TASK-LANE-0022` because Plan 3.1 still lacks the next hard capability seam:
  mutation authority parity and WIP continuity.

These two cards are the current best parallel pair because:

- they unlock different layers;
- they do not require `ATM-GOV-0265` to start;
- they directly reduce the two biggest remaining forms of captain friction:
  skill/tooling drift and lane-capability drift.

## Authoritative wave order

### Wave A: start now

| Card | Reason | Recommended captain |
|---|---|---|
| `TASK-SKL-0028` | unlocks skill corpus, canary rewrites, ignored-template regression repair, and reusable captain ergonomics | `Cursor` |
| `TASK-LANE-0022` | next hard Plan 3.1 blocker for mutation capability and WIP continuity | `Claude` |

### Wave B: after `TASK-LANE-0022`

| Card | Reason | Recommended captain |
|---|---|---|
| `ATM-GOV-0265` | branch finalization and sealed runner publication deep modules | `Claude` |
| `TASK-SKL-0023` | decentralized test-case shards and Broker contribution model | `Cursor` |
| `TASK-SKL-0024` | structured execution receipt and zero-test hard gate | `Cursor` |

### Wave C: after `0023` and `0024`

| Card | Reason | Recommended captain |
|---|---|---|
| `TASK-SKL-0025` | TDD red/green lifecycle bound to exact case IDs | `Cursor` |
| `TASK-SKL-0026` | causal selector and phase suite scheduler deep module | `Claude` |

### Wave D: convergence

| Card | Reason | Recommended captain |
|---|---|---|
| `TASK-SKL-0029` | autonomous validator/review/evidence/pre-close integration | `Claude` |
| `ATM-GOV-0246` | dashboard consumes lane/finalization/manual-intervention evidence | `Cursor` |

### Wave E: verdict chain

| Card | Reason | Recommended captain |
|---|---|---|
| `ATM-GOV-0242` | real two-card queued dogfood orchestrator | `Claude` |
| `ATM-GOV-0243` | matched A/B benchmark | `Cursor` |
| `ATM-GOV-0244` | backlog/rollback/circuit-breaker closeback | `Cursor` |
| `TASK-SKL-0030` | SKL historical A/B replay and migration verdict | `Cursor` |
| `ATM-GOV-0245` | final Plan 3.1 verdict aggregator | `Claude` |

## Dispatch rule of thumb

- High-coupling runtime governance, finalization, lane authority, and deep
  evidence synthesis: prefer `Claude`.
- Skill corpus, canary rewrites, validator catalog, projection/compiler work,
  and structured migration work: prefer `Cursor`.
- Captain planning updates, deep-module review framing, cross-plan sequencing,
  and dependency correction: keep with `Codex captain` unless the user explicitly
  reallocates.

## Remaining dependency map

### Plan 3.1 hard edges

- `TASK-LANE-0022` -> `ATM-GOV-0265`
- `ATM-GOV-0265` -> `ATM-GOV-0246`
- `ATM-GOV-0246` -> `ATM-GOV-0242`
- `ATM-GOV-0242` -> `ATM-GOV-0243`
- `ATM-GOV-0243` -> `ATM-GOV-0244`
- `ATM-GOV-0244` + `ATM-GOV-0253` + `ATM-GOV-0265` + `TASK-SKL-0029` + `TASK-SKL-0030` -> `ATM-GOV-0245`

### SKL hard edges

- `TASK-SKL-0027` -> `TASK-SKL-0028`
- `TASK-SKL-0022` -> `TASK-SKL-0023`
- `TASK-SKL-0022` -> `TASK-SKL-0024`
- `TASK-SKL-0023` + `TASK-SKL-0024` -> `TASK-SKL-0025`
- `TASK-SKL-0023` + `TASK-SKL-0024` -> `TASK-SKL-0026`
- `TASK-SKL-0025` + `TASK-SKL-0026` + `TASK-SKL-0028` + `TASK-SKL-0021` -> `TASK-SKL-0029`
- `TASK-SKL-0029` -> `TASK-SKL-0030`

### Cross-plan bridges

- `TASK-SKL-0027` supplies the deep-module review route consumed by `ATM-GOV-0264`
- `TASK-SKL-0028` improves skill corpus/projection quality used by later captains
- `TASK-SKL-0029` is a hard prerequisite for `ATM-GOV-0245` final autonomous verdict
- `TASK-SKL-0030` supplies the historical A/B validator-governance verdict consumed by `ATM-GOV-0245`

## Bug-to-owner map

Do not open redundant microcards when an open planned card already owns the seam.

| Bug / gap theme | Owning planned card |
|---|---|
| borrowed actor authority, lane takeover ambiguity, reusable ticket/lease disclosure | `TASK-LANE-0022` |
| ownerless WIP after release, missing reclaim path, `ATM-BUG-2026-07-22-229` | `TASK-LANE-0022` |
| dead branch queue lock before HEAD move, manual orphan-lock cleanup | `ATM-GOV-0265` |
| post-close publication still needing framework-temp hygiene or non-governed cleanup | `ATM-GOV-0265` |
| unarchived runner-sync receipt and publication/finalization residue path | `ATM-GOV-0265` |
| ignored skill templates, projection drift, source snapshot vs local Git ignore mismatch | `TASK-SKL-0028` |
| task split becoming harder to read because tooling blockers push essential deliverables into later cards | `TASK-SKL-0028` |
| zero-exit/no-op validator commands | `TASK-SKL-0024` and then `TASK-SKL-0029` |
| every card over-running broad validators instead of causal required cases | `TASK-SKL-0026` and then `TASK-SKL-0029` |
| dashboard/verdict not exposing manual interventions, false blocks, residue, queue-only time | `ATM-GOV-0246` and `ATM-GOV-0245` |

## Cohesion-first authoring rule

This is now a locked captain rule and must be taught through SKL canaries:

- one card should equal one complete capability seam;
- do not split a card only because a local ignore rule, stage quirk, runner-sync
  artifact, adapter mismatch, or projection tooling problem made delivery awkward;
- split only on true causal blockers, independent public seams, or phase-owner
  boundaries;
- if the blocker is tooling, skill compiler, scope admission, or ignore-state,
  repair that path or create a named tooling follow-up without changing the
  semantic meaning of the original card.

This rule exists because the attempted `TASK-SKL-0027` / `0028` split would
have made the graph harder to read and forced downstream cards to depend on a
hidden combination instead of one coherent capability card.

## Required use of `atm-deep-module-refactor`

Every unfinished refactor card touched by the 2026-07-24/25 updates must:

1. load `atm-deep-module-refactor`;
2. review the seam and all real production call sites;
3. emit a sealed provider-neutral receipt with interface, ports, adapter
   inventory, rollback boundary, duplicated-policy deletion test, and review
   fingerprint;
4. implement against that sealed receipt;
5. still satisfy task-card validators and evidence.

Planning depends on the receipt schema and review fingerprint, not on one model
vendor or one skill provider.

## Locked regressions that final verdict must still see

- borrowed actor authority and worker using another lane's capability
- ownerless WIP after release and missing reclaim path
- dead branch queue lock needing manual deletion
- manual post-close release publication or unarchived receipt residue
- shell validator exits zero without real assertions
- required skill template/projection hidden by local ignore state

All of these must stay visible in `ATM-GOV-0246` dashboard evidence and
`ATM-GOV-0245` final verdict evidence.

## Next captain operating style

- Give workers short, paste-ready dispatch blocks.
- If the next step is normal governed execution, explicitly say they can keep
  going autonomously until `close --dry-run` or `prewrite` stop point.
- Ask for stop-and-report only at real authority, scope, planning-seal, or
  cross-lane boundaries.
- Do not let workers bounce on repetitive "I can continue if approved" loops
  when ATM already emitted an executable recovery path.

## First next action

Dispatch `TASK-SKL-0028` to `Cursor` and `TASK-LANE-0022` to `Claude` as the
current best parallel pair. Keep `Codex captain` on dependency correction,
deep-module review sanity checks, and plan updates while those two advance.
