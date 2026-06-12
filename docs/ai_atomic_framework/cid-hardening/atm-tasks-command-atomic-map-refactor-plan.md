---
doc_id: doc_cid_tasks_command_atomic_map_refactor_plan
title: "ATM tasks command atomic map refactor plan"
status: planned
created_at: "2026-06-12T19:05:00+08:00"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
related_forensics:
  - docs/ai_atomic_framework/cid-hardening/atm-abnormal-release-forensics-report.md
task_family:
  - TASK-CID-0050
  - TASK-CID-0051
  - TASK-CID-0052
  - TASK-CID-0053
  - TASK-CID-0054
  - TASK-CID-0055
  - TASK-CID-0056
  - TASK-CID-0057
  - TASK-CID-0058
  - TASK-CID-0059
  - TASK-CID-0061
  - TASK-CID-0062
  - TASK-CID-0063
---

# ATM tasks command atomic map refactor plan

This plan is the follow-up refactor track after the TASK-CID-0046, TASK-CID-0048, and TASK-CID-0049 hardening work.

The purpose is not to rewrite `packages/cli/src/commands/tasks.ts` in one risky pass. The purpose is to turn the current giant command file into an explicit atomic map, then extract the governance invariants into small, tested modules that can be shared by `tasks`, `next`, `claim`, `close`, and `reconcile` flows.

## Diagnosis

The abnormal-release incident was caused by a real governance invariant gap: ATM over-trusted `status=done` and did not require governed closeout provenance at every admission checkpoint.

The large `tasks.ts` file did not create that invariant gap by itself, but it amplified the risk:

- lifecycle, closeout, dependency, historical-delivery, lock, status, residue, and diagnostics behavior are co-located in one command file;
- similar provenance checks appear in more than one surface, including `tasks.ts` and `next/route-predicates.ts`;
- a developer or agent can patch one path while another path still admits unsafe state;
- regression tests are currently CLI-heavy and do not isolate the invariant modules as first-class units.

## Refactor Principle

Do not split by line count. Split by governance invariant.

Each extracted atom must have:

- one owner module;
- explicit input and output types;
- direct unit or focused regression tests;
- at least one CLI-level regression proving the command surface still behaves correctly;
- a rollback path by reverting the task commit.

## Atomic Map

| Atom | Owns | First task |
| --- | --- | --- |
| `TasksCommandAtomicMap` | read-only function/flow inventory, caller map, duplication map | TASK-CID-0050 |
| `TasksInvariantCharacterization` | regression fixtures for current and desired behavior | TASK-CID-0051 |
| `CloseoutProvenanceAtom` | closure packet and close transition trust checks | TASK-CID-0052 |
| `DependencyGateAtom` | dependency satisfaction for `next` and `tasks claim` | TASK-CID-0053 |
| `TaskLifecycleAtom` | valid task state transitions and close preconditions | TASK-CID-0054 |
| `HistoricalDeliveryAtom` | delivery commit, scope proof, and waiver semantics | TASK-CID-0055 |
| `ScopeLockAtom` | allowed files, dirty files, direction lock, and claim lock diagnostics | TASK-CID-0056 |
| `ResidueDiagnosticAtom` | status/residue/ambiguous-manual-review explanation | TASK-CID-0057 |
| `TasksThinCliWrapper` | command orchestration after invariant extraction | TASK-CID-0058 |
| `AtomicMapValidationPack` | final dogfood benchmark and evidence table | TASK-CID-0059 |

## Milestones

### M1 - Map before mutation

- TASK-CID-0050 produces the read-only atomic map and caller map.
- TASK-CID-0051 adds characterization tests and unsafe-case regressions.

No source refactor is allowed before M1 is complete.

### M2 - Extract hard safety invariants

- TASK-CID-0052 extracts closeout provenance.
- TASK-CID-0053 extracts dependency gating.
- TASK-CID-0054 extracts lifecycle state machine checks.
- TASK-CID-0055 extracts historical-delivery provenance checks.

M2 protects the P0 release gates first.

### M3 - Extract diagnostics and operational surfaces

- TASK-CID-0056 extracts scope and lock diagnostics.
- TASK-CID-0057 extracts residue and ambiguous-state diagnostics.

M3 should improve human and agent guidance without changing safety semantics.

### M4 - Reduce the giant command file

- TASK-CID-0058 turns `tasks.ts` into a thinner CLI orchestration layer.
- TASK-CID-0059 validates the final map, records before/after size and responsibility changes, and adds evidence that no known abnormal-release path reopened.

## Dependency Order

```text
TASK-CID-0050
  -> TASK-CID-0051
    -> TASK-CID-0052
    -> TASK-CID-0053
    -> TASK-CID-0054
    -> TASK-CID-0055
      -> TASK-CID-0056
      -> TASK-CID-0057
        -> TASK-CID-0058
          -> TASK-CID-0059
```

TASK-CID-0052 through TASK-CID-0055 may be prepared in parallel after TASK-CID-0051, but only one task may own `packages/cli/src/commands/tasks.ts` at a time unless the broker conflict arbitration path is active.

## Non-goals

- Do not rewrite task storage or introduce a second registry.
- Do not move planning-repo task cards into the framework repo.
- Do not weaken TASK-CID-0046 / 0048 / 0049 hard gates to make refactoring easier.
- Do not perform a broad formatting-only rewrite of `tasks.ts`.

## Follow-up - post-forensics surface invariant hardening

The abnormal-release forensics and the later `tasks.ts` drift incident exposed a second class of risk beyond the original closeout gaps:

- a giant governance command file can lose required helper exports or admission logic without the failure being framed as a first-class governance breach;
- release/source drift can survive longer than it should because ATM relies more on broad build and CLI validation than on explicit command-surface invariants;
- workers can be inside valid task lanes while the framework still lacks a hard fail-fast gate for "core command surface has silently shrunk."

This follow-up therefore adds a two-layer repair track after the current atomic-map family:

### Layer 1 - fail-fast surface invariant hard gate

- TASK-CID-0061 adds a dedicated validator and admission-time checks for required `tasks.ts` governance surface exports, helper availability, and source/release drift.
- TASK-CID-0061 also defines the public service contract that other command surfaces are allowed to depend on, so the refactor can target a stable interface instead of a giant file.
- The goal is to turn "core command surface silently missing" into an immediate, named ATM failure instead of a downstream build surprise.

### Layer 2 - reduce blast radius by ownership split

- TASK-CID-0062 extracts the most coupling-prone governance invariants into smaller modules after the hard gate exists.
- TASK-CID-0062 must preserve the Layer 1 public contract while moving implementation behind it.
- The goal is not a cosmetic split. The goal is to reduce the chance that one worker can accidentally break `next`, `claim`, `close`, `taskflow`, and historical-delivery behavior in one edit pass.

### Follow-up sequencing

```text
TASK-CID-0059
  -> TASK-CID-0061
    -> TASK-CID-0062
```

`TASK-CID-0061` must land before `TASK-CID-0062`, because the hard gate is what protects the refactor lane from silently reintroducing the same class of breach.

## Follow-up - operator open-close lane hardening

The newer operator-facing task lifecycle now distinguishes:

- `taskflow open` as the official governed opener orchestration entry;
- `taskflow close` as the official closeback orchestration entry;
- `tasks new` as a low-level generator only;
- `tasks close` / `tasks reconcile` as authoritative backends.

But the product still leaks too much lifecycle ambiguity when the opener profile is missing or when reconcile residue appears after source delivery already exists.

### Layer 3 - make the new lane unmistakable

- TASK-CID-0063 hardens the operator-facing taskflow lane so Captain and worker threads are pushed toward `taskflow open` / `taskflow close` first.
- TASK-CID-0063 also reduces the hidden cost where reconcile residue occupies the same queue-head mental lane as ordinary execution work.
- TASK-CID-0063 completes the CID lane profile so `taskflow open` can allocate and resolve the canonical task-card output path without human `--output` glue when the profile has enough information.
- TASK-CID-0063 treats the 3KLife adaptor as the reference adopter contract: a host-side 3KLife open action must implicitly perform the ATM governed open flow, and future adopter projects using the same contract should inherit that behavior.
- TASK-CID-0063 makes `taskflow close` report and, where safe, execute one governed closeback story across `planning_repo` and `target_repo`, rather than leaving target close and planning mirror close as separate operator memories.
- TASK-CID-0063 treats the 3KLife adaptor close action as an implicit dual-repo ATM close: target repo close/reconcile, planning repo closeback, and the final commit package must be computed together.
- TASK-CID-0063 adds a deterministic governed stage/commit bundle so closeback can name the exact files that belong in the target repo commit package and the planning repo commit package.
- The goal is to make the new open/close model feel like the obvious default, make legacy generation/import paths read as explicit fallback-only surfaces, and remove the repeated hidden cost of manually reconstructing what should be staged and committed after close.

### Extended sequencing

```text
TASK-CID-0059
  -> TASK-CID-0061
    -> TASK-CID-0062
      -> TASK-CID-0063
```
