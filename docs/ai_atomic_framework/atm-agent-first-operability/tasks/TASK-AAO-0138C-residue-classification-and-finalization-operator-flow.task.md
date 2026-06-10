---
doc_id: ""
task_id: TASK-AAO-0138C
title: "residue classification and finalization operator flow"
milestone: M17
status: done
artifact_status: done
runtime_status: validated
upstream_mutation_status: applied
created: "2026-06-10"
created_by_agent: codex-gpt-5
started_at: "2026-06-10T21:57:54.4486199+08:00"
started_by_agent: "codex-gpt-5.4-mini"
blocked_by:
  - TASK-AAO-0135
  - TASK-AAO-0137
  - TASK-AAO-0138A
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-residue-classification-and-finalization-operator-flow
planning_repo: 3KLife
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0138C-residue-classification-and-finalization-operator-flow.task.md
related:
  - TASK-AAO-0138
  - TASK-AAO-0135
  - TASK-AAO-0137
  - TASK-AAO-0055
  - TASK-AAO-0056
depends_on:
  - TASK-AAO-0135
  - TASK-AAO-0137
  - TASK-AAO-0138A
depends:
  - TASK-AAO-0135
  - TASK-AAO-0137
  - TASK-AAO-0138A
scopePaths:
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/framework-development.ts
  - scripts/validate-task-ledger-governance.ts
  - scripts/validate-governance-commands.ts
  - tests/**
deliverables:
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/framework-development.ts
  - scripts/validate-task-ledger-governance.ts
  - scripts/validate-governance-commands.ts
  - tests/**
validators:
  - npm run typecheck
  - npm run validate:cli
  - node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
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
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0138C-residue-classification-and-finalization-operator-flow.task.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-governance-commands.ts
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not silently delete residue."
  - "Do not make manual .atm/history/** editing the primary operator path."
  - "Do not rebuild close/reconcile from scratch."
  - "Do not duplicate opener orchestration logic."
notes: "2026-06-10 | status: done | validation: passed | change: child card for residue buckets and operator-facing finalization diagnosis flow | residue buckets now route to one governed next command"
worker_report:
  worker: "002"
  dispatch: "R53-AAO-0138-FAMILY"
  status: "done"
  completed_file: "C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts"
---

# TASK-AAO-0138C residue classification and finalization operator flow

## Goal

Give operators one clear diagnosis and finalization path when a task is already done in substance but ATM still leaves closure, mirror, or historical residue behind.

## Why this exists

Recent ATM work showed that the hard part is not always implementation. Sometimes the hard part is understanding whether the remaining files are:

- truth
- residue
- repairable interruption
- stale planning mirror
- or genuinely ambiguous state

The framework already has strong commands like `tasks reconcile`, `tasks repair-closure`, and rescue flows. What is missing is a clean classification layer that tells the operator which one applies.

## Scope

- Define residue buckets.
- Map each bucket to one official governed next step.
- Keep ambiguous cases fail-closed.
- Do not auto-delete.

## Acceptance Criteria

- ATM can classify at least these buckets:
  - `complete-but-unfinalized`
  - `planning-mirror-only`
  - `interrupted-close`
  - `stale-import`
  - `ambiguous-manual-review`
- Each bucket maps to one explicit command or next action.
- Operator-facing output clearly distinguishes:
  - truth
  - residue
  - next command
- No silent deletion path exists for ambiguous or unsafe states.
- The implementation reuses existing governed commands instead of creating parallel closure machinery.

## Candidate Surfaces

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/framework-development.ts`
- `scripts/validate-task-ledger-governance.ts`
- `scripts/validate-governance-commands.ts`
- `tests/**`

## Contract Field Responsibility Table

| Contract field / surface | 0138C responsibility | Notes |
|---|---|---|
| `diagnostics` | Primary owner for residue/finalization diagnostics | Owns operator-facing explanation of truth, residue bucket, and one governed next command. |
| `fallbackBehavior` | Not owned here | This card does not define opener fallback policy. |
| `openerMode` | Not owned here | This card consumes opener context but does not define entry mode. |
| `delegationContract` | Not owned here | No host-opener contract work belongs here. |
| `allocateTaskId` | Not owned here | Out of scope. |
| `resolveCanonicalOutputPath` | Not owned here | Out of scope. |
| `rosterSyncPolicy` | Not owned here | Out of scope. |
| Residue bucket result surface | Primary owner | Must classify `complete-but-unfinalized`, `planning-mirror-only`, `interrupted-close`, `stale-import`, and `ambiguous-manual-review`. |
| Recommended next command surface | Primary owner | Must map each residue bucket to one governed next action. |

## Separation Rule

- `0138C` may reuse existing close/reconcile/repair commands.
- `0138C` must not duplicate opener orchestration, numbering/path policy, or host delegation logic.
- `0138C` should stay product-facing: classify first, mutate second, and fail closed on ambiguity.

## Implementation Guardrails

- Classification first, mutation second.
- Reuse:
  - `tasks reconcile`
  - `tasks repair-closure`
  - existing rescue/closure repair flows
- No automatic cleanup for ambiguous history.
- No second close/reconcile implementation.

## Plain-language Anchor

If ATM leaves the human between two half-valid states, ATM should explain the state in product language and point to one governed next command. The human should not need to inspect `.atm/history/**` just to know what happened.

## Worker Report

- worker: 002
- dispatch: R53-AAO-0138-FAMILY
- status: done
- completed_file: `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts`
- additional_file: `C:/Users/User/AI-Atomic-Framework/scripts/validate-governance-commands.ts`
- scope_result: residue bucket classification and finalization operator UX implemented without touching opener orchestration or numbering/path policy
- residue_buckets:
  - complete-but-unfinalized
  - planning-mirror-only
  - interrupted-close
  - stale-import
  - ambiguous-manual-review
- next_commands:
  - tasks reconcile
  - tasks import --write
  - tasks repair-closure
  - tasks import --write --force
  - tasks status --task <id> --json
- validators:
  - node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
  - node --strip-types scripts/validate-governance-commands.ts
  - npm run typecheck
  - git diff --check
- note: inbox dispatch file moved to done as requested; no .atm/history manual editing was used as the primary operator path.
