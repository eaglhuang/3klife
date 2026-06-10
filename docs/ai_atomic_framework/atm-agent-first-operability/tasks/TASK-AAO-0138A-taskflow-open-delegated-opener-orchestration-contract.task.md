---
doc_id: ""
task_id: TASK-AAO-0138A
title: "taskflow open delegated opener orchestration contract"
milestone: M17
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
created: "2026-06-10"
created_by_agent: codex-gpt-5
started_at: "2026-06-10T21:00:00+08:00"
started_by_agent: "codex-gpt-5.4-mini"
blocked_by:
  - TASK-AAO-0135
  - TASK-AAO-0137
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-taskflow-open-delegated-opener-orchestration-contract
planning_repo: 3KLife
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0138A-taskflow-open-delegated-opener-orchestration-contract.task.md
related:
  - TASK-AAO-0138
  - TASK-AAO-0086
  - TASK-AAO-0112
depends_on:
  - TASK-AAO-0135
  - TASK-AAO-0137
depends:
  - TASK-AAO-0135
  - TASK-AAO-0137
scopePaths:
  - packages/cli/src/commands/taskflow.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/command-specs/taskflow.spec.ts
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - packages/cli/src/commands/taskflow/profile-loader.ts
  - tests/**
deliverables:
  - packages/cli/src/commands/taskflow.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/command-specs/taskflow.spec.ts
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - packages/cli/src/commands/taskflow/profile-loader.ts
  - tests/**
validators:
  - npm run typecheck
  - npm run validate:cli
  - node --strip-types scripts/validate-governance-commands.ts
  - git diff --check
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-closure-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  newScriptsAllowed: false
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0138A-taskflow-open-delegated-opener-orchestration-contract.task.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/taskflow.spec.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/tasks.spec.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/profile-loader.ts
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-governance-commands.ts
  - C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not implement host-specific numbering rules in this card."
  - "Do not add roster sync writes in this card."
  - "Do not create a second markdown generator path."
  - "Do not handle residue classification in this card."
notes: "2026-06-10 | status: done | validation: passed | change: child card for taskflow open orchestration contract and entry-mode reporting | blocker: taskflow open is still dry-run orchestrator only"
---

# TASK-AAO-0138A taskflow open delegated opener orchestration contract

## Goal

Turn `taskflow open` into the official operator-facing governed opener entry without turning it into a second template generator.

This slice owns the orchestration contract and the CLI/operator story:

- `taskflow open` orchestrates
- `tasks new` generates
- host opener logic decides numbering/path later

## Why this exists

ATM already has two partial pieces:

- `TASK-AAO-0086` delivered plugin hooks plus `tasks new`
- `taskflow open` already knows it should delegate to a repo-profile opener

But the pieces are not yet connected into a real governed entry path. Right now `taskflow open` is still dry-run only, and `tasks new` still looks like the only concrete write-capable surface.

## Scope

- Make `taskflow open` the formal operator-facing opener entry.
- Define mode reporting:
  - `delegated-governed`
  - `template-only-fallback`
- Make orchestration explicitly call the existing `tasks new` generation path.
- Keep host numbering and roster policy out of this slice.

## Acceptance Criteria

- `taskflow open --dry-run --json` returns a full orchestration plan that explains:
  - opener mode
  - whether a host opener is available
  - whether `tasks new` will be used for generation
  - whether follow-up steps are required
- `taskflow open --write --json` becomes the official governed entry only when delegation prerequisites are satisfied.
- If delegation prerequisites are missing, ATM fails closed and explicitly reports `template-only-fallback` instead of pretending governance is complete.
- `taskflow open` does not introduce a second markdown generation path.
- `tasks new` remains a low-level generator and is not relabeled as a full opener.

## Candidate Surfaces

- `packages/cli/src/commands/taskflow.ts`
- `packages/cli/src/commands/taskflow/profile-loader.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/command-specs/taskflow.spec.ts`
- `packages/cli/src/commands/command-specs/tasks.spec.ts`
- `tests/**`

## Contract Field Responsibility Table

| Contract field / surface | 0138A responsibility | Notes |
|---|---|---|
| `openerMode` | Primary owner | Defines and reports `delegated-governed` vs `template-only-fallback`. |
| `writeSupport` | Primary owner | Decides whether `taskflow open --write` may act as the official governed entry. |
| `delegationContract` | Primary owner for orchestration-facing shape | Owns command/result-facing delegation descriptor, but not host numbering rules. |
| `diagnostics` | Primary owner for opener-mode diagnostics | Must explain active mode, missing prerequisites, and fallback cause. |
| `allocateTaskId` | Not owned here | Consumed later through host-neutral policy in `0138B`. |
| `resolveCanonicalOutputPath` | Not owned here | Consumed later through host-neutral policy in `0138B`. |
| `rosterSyncPolicy` | Not owned here | Explicitly out of scope for this card. |
| `fallbackBehavior` | Shared with `0138B` | 0138A owns mode reporting and fail-closed entry behavior; 0138B owns policy details. |

## Code Surface Map

| File | Role in 0138A | Expected change type |
|---|---|---|
| `packages/cli/src/commands/taskflow.ts` | Main orchestration entry for `taskflow open`; computes mode, emits orchestration plan, and gates `--write`. | Core implementation |
| `packages/cli/src/commands/taskflow/profile-loader.ts` | Loads and validates profile contract fields required for opener-mode reporting. | Schema/loader extension |
| `packages/cli/src/commands/tasks.ts` | Provides the reusable low-level generator surface that `taskflow open` must orchestrate instead of duplicating. | Shared helper extraction or invocation wiring |
| `packages/cli/src/commands/command-specs/taskflow.spec.ts` | Documents/validates CLI contract for `taskflow open` mode reporting and write gating. | Command spec update |
| `packages/cli/src/commands/command-specs/tasks.spec.ts` | Keeps `tasks new` explicitly positioned as generator surface, not full opener. | Command spec clarification |
| `tests/**` | Verifies dry-run plan shape, mode banner behavior, fail-closed fallback, and no second generator path. | Test coverage |

## Implementation Guardrails

- Reuse the generator delivered by `TASK-AAO-0086`.
- No host-specific numbering logic here.
- No roster sync writes here.
- No residue/finalization logic here.

## Plain-language Anchor

When a human says "open a formal card", ATM should send them to one official command. That command should say whether the host opener is truly available, whether governance is active, and whether it is only falling back to template generation.

## Worker Report

- worker: 001
- dispatch: R53-AAO0138-20260610-134421TPE
- status: done
- files_changed:
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts`
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/profile-loader.ts`
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts`
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts`
  - `C:/Users/User/AI-Atomic-Framework/tests/cli/taskflow-open-orchestration.test.ts`
- orchestration_contract_added: openerMode / writeSupport / delegationContract / diagnostics
- fallback_behavior: template-only-fallback is reported explicitly when delegation prerequisites are missing or describe-only
- tests:
  - `node --strip-types tests/cli/taskflow-open-orchestration.test.ts`
  - `node --strip-types packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts`
  - `node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts`
  - `npm run typecheck`
  - `npm run validate:cli`
  - `git diff --check`
- risks / follow-ups:
  - `0138B` still owns host-neutral numbering / canonical path / roster sync policy details.
