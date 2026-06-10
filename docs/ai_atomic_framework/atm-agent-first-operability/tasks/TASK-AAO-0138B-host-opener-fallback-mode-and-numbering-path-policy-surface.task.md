---
doc_id: ""
task_id: TASK-AAO-0138B
title: "host opener fallback mode and numbering-path policy surface"
milestone: M17
status: done
artifact_status: done
runtime_status: validated
upstream_mutation_status: applied
created: "2026-06-10"
created_by_agent: codex-gpt-5
started_at: ""
started_by_agent: ""
blocked_by:
  - TASK-AAO-0069
  - TASK-AAO-0138A
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-host-opener-fallback-mode-and-numbering-path-policy-surface
planning_repo: 3KLife
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0138B-host-opener-fallback-mode-and-numbering-path-policy-surface.task.md
related:
  - TASK-AAO-0138
  - TASK-AAO-0069
  - TASK-AAO-0086
depends_on:
  - TASK-AAO-0138A
  - TASK-AAO-0069
depends:
  - TASK-AAO-0138A
  - TASK-AAO-0069
scopePaths:
  - packages/cli/src/commands/taskflow.ts
  - packages/cli/src/commands/tasks.ts
  - packages/atm-markdown-task-source/src/index.ts
  - scripts/validate-task-ledger-governance.ts
  - tests/**
deliverables:
  - packages/cli/src/commands/taskflow.ts
  - packages/cli/src/commands/tasks.ts
  - packages/atm-markdown-task-source/src/index.ts
  - scripts/validate-task-ledger-governance.ts
  - tests/**
validators:
  - npm run typecheck
  - npm run validate:cli
  - node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
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
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0138B-host-opener-fallback-mode-and-numbering-path-policy-surface.task.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/atm-markdown-task-source/src/index.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not re-implement tasks new generation logic."
  - "Do not create a second roster sync writer."
  - "Do not hard-code 3KLife AAO numbering into framework core."
  - "Do not add residue classification in this card."
notes: "2026-06-10 | status: done | validation: passed | change: host-neutral opener policy + tasks roster update wiring | blocker: none"
---

# TASK-AAO-0138B host opener fallback mode and numbering-path policy surface

## Goal

Define the host-neutral policy contract that lets a planning repo opener provide:

1. task id allocation
2. canonical output path resolution
3. roster sync policy

without leaking any host-specific numbering rules into ATM framework core.

## Why this exists

The framework should not guess how 3KLife or any other planning repo numbers task cards. But the framework must still provide one official way to ask a host opener for those decisions.

This slice also finishes the missing connection to `TASK-AAO-0069`, so roster synchronization has one official write path instead of becoming a parallel helper forest.

## Scope

- Define or finish host opener policy fields for:
  - allocate task id
  - resolve output path
  - choose roster sync policy
- Wire `taskflow open` orchestration to that policy.
- Reuse `TASK-AAO-0069` direction as the only roster update path.
- Keep template generation delegated to existing `tasks new` / plugin surfaces.

## Acceptance Criteria

- ATM core exposes a host-neutral opener policy contract.
- A host opener can explicitly return:
  - numbering decision
  - path decision
  - roster sync mode
- If the host opener is missing or returns unsupported, ATM clearly reports fallback mode.
- Roster sync is implemented through one official path only, reusing `TASK-AAO-0069`.
- No 3KLife-specific numbering literal is embedded in framework core logic.

## Candidate Surfaces

- `packages/cli/src/commands/taskflow.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/atm-markdown-task-source/src/index.ts`
- `scripts/validate-task-ledger-governance.ts`
- `tests/**`

## Contract Field Responsibility Table

| Contract field / surface | 0138B responsibility | Notes |
|---|---|---|
| `allocateTaskId` | Primary owner | Defines host-neutral task-id allocation contract; host opener supplies concrete decision. |
| `resolveCanonicalOutputPath` | Primary owner | Defines host-neutral canonical path resolution contract and collision policy. |
| `rosterSyncPolicy` | Primary owner | Defines whether roster sync is `inline`, `follow-up-command`, or `none`. |
| `fallbackBehavior` | Primary owner for policy content | Defines how ATM fails closed when host opener is absent or unsupported. |
| `delegationContract` | Secondary owner | Extends the contract with host-policy-carrying fields but does not own orchestration UX. |
| `openerMode` | Secondary consumer | Must remain compatible with the mode surface owned by `0138A`. |
| `writeSupport` | Secondary consumer | Must align host-policy feasibility with the write gate surfaced by `0138A`. |
| `diagnostics` | Secondary owner for policy diagnostics | Supplies reasons such as ambiguous numbering, missing canonical path, or unsupported roster sync mode. |

## Host-Neutral Policy Boundary

- ATM core may define the contract shape and validate host answers.
- ATM core must **not** embed 3KLife-specific `TASK-AAO-####` numbering literals or path conventions.
- Host opener implementations may decide numbering/path details, but only through this contract surface.

## Implementation Guardrails

- Reuse existing generator surfaces from `TASK-AAO-0086`.
- Reuse or finish `TASK-AAO-0069` for roster sync.
- No second roster sync writer.
- No second generator stack.

## Plain-language Anchor

ATM core should know how to ask, not how to guess. The host opener tells ATM what the next number is, where the card should live, and whether roster sync is inline or follow-up. ATM validates and orchestrates that answer.

## Worker Report

- worker: 008
- dispatch: R53-AAO-0138-FAMILY
- status: done
- files_changed:
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/host-opener-policy.ts`
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts`
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
  - `C:/Users/User/AI-Atomic-Framework/schemas/taskflow-profile.v1.json`
  - `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts`
  - `C:/Users/User/AI-Atomic-Framework/tests/cli/taskflow-host-policy.test.ts`
  - `C:/Users/User/AI-Atomic-Framework/tests/cli/tasks-roster-update.test.ts`
- policy_surface: allocateTaskId / resolveCanonicalOutputPath / rosterSyncPolicy with explicit template-only-fallback
- roster_sync: `tasks roster update` is the sole write path (0069 reuse)
- tests:
  - `node --strip-types tests/cli/taskflow-host-policy.test.ts`
  - `node --strip-types tests/cli/tasks-roster-update.test.ts`
  - `npm run typecheck`
  - `npm run validate:cli`
  - `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
  - `git diff --check`
