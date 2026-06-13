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
  - TASK-CID-0065
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

## Atom/Map Design Pattern Guidance

Each remaining extraction task should preserve atom/map semantics by choosing the smallest pattern that matches the invariant being touched:

- Use a **Policy Object** when the atom answers whether an operation is allowed, blocked, waived, or recoverable. Examples: lifecycle transition policy, dependency admission policy, emergency backend permission policy.
- Use a **Strategy Map** when a surface dispatches by mode or bucket. Examples: close mode, residue bucket, historical-delivery classification, taskflow closeback route.
- Use a **Result Contract Object** when the atom emits evidence, diagnostics, bundles, or provenance. Examples: `atm.taskResidueDiagnosis.v1`, `atm.taskflowGovernedCommitBundle.v1`, closure packet delivery proof.
- Use a **Facade** only for operator-facing lanes. `taskflow open` and `taskflow close` should select atoms and strategies; they should not reimplement backend rules.
- Use an **Adapter/Port** only at host boundaries such as planning repo profiles, 3KLife closeback/open hooks, or future adopter integrations.

Pipeline-style validation is allowed only when each stage is a named atom with a stable result contract. Do not replace one giant `tasks.ts` flow with a long anonymous inline pipeline.

During each task, extract only the atom already in scope for that card. If a useful adjacent extraction appears, record it in the report or atomic map rather than expanding the task.

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
        -> TASK-CID-0065
```

## Follow-up - emergency maintenance permission lane

TASK-CID-0063 makes `taskflow open` and `taskflow close` the normal operator lane, but it does not by itself prevent an agent from directly invoking powerful backend repair surfaces. Historical CID residue showed that backend commands are sometimes necessary, but they must feel like emergency maintenance, not like ordinary task work.

TASK-CID-0065 adds a short-lived, machine-checkable emergency permission lease system. The goal is to let humans approve exceptional recovery without creating a permanent bypass path for future agents.

### Permission model

ATM must define emergency permissions as named capabilities, not as free-form prose. Each capability is scoped narrowly enough to prevent accidental broad authority, but simple enough to extend through a policy table.

| Permission | Covers | Default lane | Emergency requirement |
| --- | --- | --- | --- |
| `backend.tasks.close` | direct `tasks close`, including historical delivery close | `taskflow close` | lease required when invoked directly |
| `backend.tasks.reconcile` | direct `tasks reconcile` for historical delivery / stale-import repair | `taskflow close` | lease required when invoked directly |
| `backend.tasks.import.write` | direct `tasks import --write`, `--force`, `--force-overwrite-claims`, `--reset-open` | `taskflow open` or governed profile import | lease required for write or force forms |
| `backend.tasks.repairClosure` | direct `tasks repair-closure`, especially `--amend` | `taskflow close` closeback plan | lease required for direct use; `--amend` is high-risk |
| `backend.tasks.reset` | lifecycle reset / reopen / rollback state mutation | explicit recovery flow | lease required |
| `backend.tasks.lockCleanupGlobal` | `tasks lock cleanup --all-stale` and other global lock cleanup | scoped taskflow close cleanup | lease required for global cleanup |
| `backend.tasks.scopeAmend` | `tasks scope add` outside an active taskflow-guided claim | normal claim scope extension | lease required when no active guided claim exists |
| `backend.waiver.historicalDeliveryOutOfScope` | `--waiver-out-of-scope-delivery` | narrow historical delivery verification | lease required when the delivery contains out-of-scope files |
| `backend.runnerRecovery` | `--allow-stale-runner` and runner drift bypass | build/sync runner first | lease required |
| `backend.gitHookBypass` | any ATM wrapper path that would suggest `--no-verify` or equivalent hook bypass | governed commit wrapper | lease required and normally disallowed in CI |

This list is intentionally policy-driven. New capabilities can be added by extending an emergency permission registry with: `permissionId`, matched command/action, risk tier, normal lane, allowed flags, required scope fields, default TTL, maximum uses, and validator/audit requirements.

### Lease contract

Emergency authorization must be represented by an ATM-generated lease, not by an agent-authored sentence. A human approval sentence is still recorded, but the backend command only trusts the lease id.

Lease schema: `atm.emergencyMaintenanceLease.v1`.

Minimum fields:

- `leaseId`
- `taskId`
- `actor`
- `permissionId`
- `surface`
- `approvedBy`
- `approvalText`
- `reason`
- `createdAt`
- `expiresAt`
- `maxUses`
- `usedCount`
- `scope`
- `matchedCommand`
- `status`

The expected approval flow is:

```powershell
node atm.mjs emergency approve --task TASK-CID-0043 --actor 004 --permission backend.tasks.reconcile --reason "Legacy CID stale-import closeback approved by human" --ttl-minutes 30 --json

node atm.mjs tasks reconcile --task TASK-CID-0043 --actor 004 --delivery-commit 00be417f --emergency-approval EMG-... --json
```

The CLI must validate that the lease matches the task, actor, permission, command surface, allowed flags, TTL, and use count before mutation. If validation fails, the command must fail closed with `ATM_EMERGENCY_LANE_APPROVAL_REQUIRED` or a more precise lease error.

### Normal versus emergency boundary

The boundary must not be too strict:

- `taskflow open --write` and `taskflow close --write` are normal operator work and do not require emergency permission.
- scoped cleanup that `taskflow close` computes as part of the same closeback bundle can stay normal.
- read-only diagnosis, `tasks status`, `tasks audit`, `taskflow close --dry-run`, and `tasks import --dry-run` stay normal.

The boundary must not be too loose:

- direct backend lifecycle mutation requires a lease;
- broad force flags require a lease;
- out-of-scope historical-delivery waiver requires a lease;
- global lock cleanup requires a lease;
- hook bypass and stale-runner bypass require a lease.

### Enforcement points

TASK-CID-0065 must enforce the lane at more than one layer:

- CLI parser / command dispatcher rejects protected backend surfaces without a matching lease.
- `next` recommends `taskflow close` as the ordinary path and emits a human-facing approval notice before any emergency backend command.
- Help text marks protected backend commands as emergency backend surfaces, not operator defaults.
- Emergency command execution writes an audit event using `atm.emergencyMaintenanceUse.v1`.
- `tasks audit --staged` and pre-commit validation reject emergency artifacts that lack a matching lease/use event pair.
- The taskflow governed bundle must not claim success if it detects unapproved emergency backend artifacts.

### Acceptance

- A direct `tasks close`, `tasks reconcile`, `tasks import --write`, or `tasks repair-closure` mutation without a lease fails before mutating files.
- The same recovery through `taskflow close --write` remains allowed when taskflow can compute a safe closeback story.
- A valid one-task, one-permission lease allows only the matching backend command and cannot be reused outside its TTL/use count.
- A fake or free-form human approval sentence without a valid lease id is rejected.
- `--waiver-out-of-scope-delivery`, `--allow-stale-runner`, `--force-overwrite-claims`, `--amend`, and `lock cleanup --all-stale` are covered by explicit emergency permissions.
- Audit evidence records the lease, use event, command, actor, affected task, and before/after status.
- Regression tests prove that an agent cannot bypass TASK-CID-0063 by calling backend close/reconcile/import/repair-closure directly.
