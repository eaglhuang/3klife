---
doc_id: ""
task_id: TASK-AAO-0140
title: "taskflow close planning mirror closeback orchestration"
milestone: M17
status: done
artifact_status: done
runtime_status: validated
upstream_mutation_status: applied
created: "2026-06-11"
created_by_agent: codex-gpt-5
started_at: ""
started_by_agent: ""
blocked_by: []
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-taskflow-close-planning-mirror-closeback-orchestration
planning_repo: 3KLife
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0140-taskflow-close-planning-mirror-closeback-orchestration.task.md
related:
  - TASK-AAO-0138
  - TASK-AAO-0138A
  - TASK-AAO-0138B
  - TASK-AAO-0138C
  - TASK-AAO-0069
depends_on:
  - TASK-AAO-0138B
  - TASK-AAO-0138C
  - TASK-AAO-0069
depends:
  - TASK-AAO-0138B
  - TASK-AAO-0138C
  - TASK-AAO-0069
scopePaths:
  - packages/cli/src/commands/taskflow.ts
  - packages/cli/src/commands/taskflow/profile-loader.ts
  - packages/cli/src/commands/command-specs/taskflow.spec.ts
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/framework-development.ts
  - docs/specs/taskflow-profile-v1.md
  - scripts/validate-governance-commands.ts
  - scripts/validate-task-ledger-governance.ts
  - tests/**
deliverables:
  - packages/cli/src/commands/taskflow.ts
  - packages/cli/src/commands/taskflow/profile-loader.ts
  - packages/cli/src/commands/command-specs/taskflow.spec.ts
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/framework-development.ts
  - docs/specs/taskflow-profile-v1.md
  - scripts/validate-governance-commands.ts
  - scripts/validate-task-ledger-governance.ts
  - tests/**
  - docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0140-taskflow-close-planning-mirror-closeback-orchestration.task.md
  - docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md
  - docs/tasks/tasks-aao.json
validators:
  - npm run typecheck
  - npm run validate:cli
  - node --strip-types scripts/validate-governance-commands.ts --mode validate
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
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0140-taskflow-close-planning-mirror-closeback-orchestration.task.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/profile-loader.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/taskflow.spec.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/tasks.spec.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts
  - C:/Users/User/AI-Atomic-Framework/docs/specs/taskflow-profile-v1.md
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-governance-commands.ts
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
  - "Do not split this follow-up into separate contract and writer cards."
  - "Do not create a second generator path or a second closeback writer."
  - "Do not hardcode host-specific numbering rules into framework core."
  - "Do not hand-edit .atm/history or .atm/runtime state."
  - "Do not weaken fail-closed residue or closeback validation."
notes: "2026-06-11 | status: done | validation: passed | change: taskflow close closeback orchestration with planning-mirror writer boundary | blocker: none"
---

# TASK-AAO-0140 taskflow close planning mirror closeback orchestration

## Goal

Turn the close side of the AAO-0138 family into one operator-facing governed flow.

This is intentionally a single card. It must not be split into separate contract and writer cards.

The user-visible objective is simple:

- `taskflow open` remains the official opener story.
- `taskflow close` becomes the official closeback orchestration story.
- planning-mirror closeback, historical-delivery close, and residue repair all speak the same language.

## Why this exists

AAO-0138 fixed the opening side and residue finalization UX, but the closing side still leaks too many internal steps:

- `tasks close` and `tasks reconcile` are real and useful, but they are not yet presented as one operator-facing close story.
- planning-mirror closeback still reads like an internal repair path instead of a governed product surface.
- the writer / mirror boundary still needs to be described as one adopter-aware flow, not two separate subproblems.

This card extends AAO-0138 without re-opening the opener work.

## Scope

- Make `taskflow close` the official operator-facing closeback orchestration entry.
- Reuse the existing `tasks close`, `tasks reconcile`, and residue diagnostics backends.
- Carry forward the historical-delivery gate so previously landed deliverables can be verified without pretending the close commit itself created them.
- Define a single closeback plan surface that can report:
  - normal close
  - historical-delivery close
  - planning-mirror sync repair
  - ambiguous/manual-review residue
- Keep the planning-mirror writer behavior inside the same adopter-aware flow.
- Avoid creating a second closeback writer or a second generator path.
- Keep the operator story coherent: one close flow, one evidence story, one failure mode story.

## Acceptance Criteria

### 1. One close entry

- `taskflow close` exists as the official operator-facing close orchestration surface.
- The command surface does not require the operator to discover three different repair paths to understand what to do next.

### 2. One closeback contract

- The close plan reports whether the current state is normal close, historical-delivery close, or planning-mirror repair.
- The plan also reports the evidence and validator path needed for each case.

### 3. One writer story

- Planning-mirror closeback and writer semantics are described as one adopter-aware flow.
- The work must not introduce a second writer or a second generator.

### 4. Existing backends stay authoritative

- `tasks close` and `tasks reconcile` remain the real backend operations.
- `tasks status --residue` and `tasks finalize diagnose` remain the residue truth sources.

### 5. Fail closed on ambiguity

- Ambiguous residue still stops for operator review.
- The new close story must not weaken evidence requirements or history integrity rules.

## Candidate Phase 1 Surfaces

- `packages/cli/src/commands/taskflow.ts`
- `packages/cli/src/commands/taskflow/profile-loader.ts`
- `packages/cli/src/commands/command-specs/taskflow.spec.ts`
- `packages/cli/src/commands/command-specs/tasks.spec.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/framework-development.ts`
- `docs/specs/taskflow-profile-v1.md`
- `scripts/validate-governance-commands.ts`
- `scripts/validate-task-ledger-governance.ts`
- `tests/**`

## Explicit Non-Goals

- Do not split this follow-up into separate contract and writer cards.
- Do not create a second generator path.
- Do not hardcode host-specific numbering rules into framework core.
- Do not introduce manual `.atm/history/**` surgery as the normal close path.
- Do not weaken fail-closed governance on closeback or residue ambiguity.

## Plain-language Anchor

If a task is already delivered, ATM should help the operator close it cleanly. If the task still has mirror residue, ATM should show one governed closeback path instead of a pile of internal repair steps. The human should see one close story, not two half-finished ones.

## Worker Report

- worker: cursor-agent
- status: done
- files_changed:
  - `packages/cli/src/commands/taskflow/close-orchestration.ts`
  - `packages/cli/src/commands/taskflow.ts`
  - `packages/cli/src/commands/command-specs/taskflow.spec.ts`
  - `packages/cli/src/commands/tasks.ts`
  - `docs/specs/taskflow-profile-v1.md`
  - `scripts/validate-task-ledger-governance.ts`
  - `tests/cli/taskflow-close-orchestration.test.ts`
- close_contract: `atm.taskflowCloseResult.v1` with `closeMode`, `closebackPlan`, `residueDiagnosis`, `writerBoundary`
- backends_reused: `tasks close`, `tasks reconcile`, `tasks import`, `tasks repair-closure`, `tasks finalize diagnose`
- tests:
  - `node --strip-types tests/cli/taskflow-close-orchestration.test.ts`
  - `npm run typecheck`
  - `npm run validate:cli`
  - `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
  - `node --strip-types scripts/validate-governance-commands.ts --mode validate`
  - `git diff --check`
