---
doc_id: doc_task_aao_0046
task_id: TASK-AAO-0046
title: "Validator baseline noise diagnostics"
status: done
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "Separates current-task validator failures from unrelated baseline failures after TASK-AAO-0004 landed."
milestone: M16
depends_on:
  - "TASK-AAO-0004"
  - "TASK-AAO-0015"
  - "TASK-AAO-0017"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First ?????????.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/run-validators.ts"
  - "scripts/lib/**"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/batch.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/run-validators.ts"
  - "scripts/lib/validator-envelope.ts"
  - "packages/cli/src/commands/hook.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:standard"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the baseline-noise classification changes and restore existing validator envelope behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.validator-envelope-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing validator pass/fail semantics for true current-task failures"
  - "Weakening release-level gates"
  - "Editing .atm/runtime/** manually"
nonGoals:
  - "Making validate:standard optional for release"
  - "Suppressing real failures introduced by the current task"
---
# TASK-AAO-0046 ? Validator baseline noise diagnostics

## Goal

Extend the validator envelope work that landed in TASK-AAO-0004 so agents can distinguish current-task failures from unrelated baseline failures.

## Why

TASK-AAO-0004 standardized validator failure envelopes, but follow-up dogfood showed another friction point: validate:standard can fail for unrelated baseline reasons. Agents then spend time deciding whether the failure belongs to the current task. This task makes that distinction explicit instead of reopening the already-completed 0004 card.

## Implementation Contract

- Keep TASK-AAO-0004 closed; this is a follow-up, not a rewrite of the completed task.
- Add baseline/current failure classification to validator and hook envelopes.
- Focused task evidence may proceed when current-task validators pass and unrelated baseline failures are clearly classified.
- Release-level gates may still fail on baseline issues; this task only improves diagnosis and task-level flow.
- Any new report fields must be documented through command-backed validator evidence.

## Deliverables

- scripts/run-validators.ts
- scripts/lib/validator-envelope.ts
- packages/cli/src/commands/hook.ts
- atomic_workbench/atomization-coverage/path-to-atom-map.json

## Validators

- npm run typecheck
- npm run validate:cli
- npm run validate:standard

## Acceptance Criteria

- Validator envelopes expose baselineFailures[], currentTaskFailures[], and blockingFindings[] or equivalent stable fields.
- Hook / validator envelopes sort `blockingFindings[]` by actionable severity so the first visible blocker is the thing the agent can fix now; advisory CRLF / encoding noise must not hide commit-message, protected-state, checkpoint, or scope errors.
- When multiple gates fail, output includes a compact `primaryBlocker` (or equivalent) plus full categorized findings, so agents do not parse an empty taskAudit section and miss the real hook failure.
- If an unrelated validator already fails before the task changes, ATM reports it as baseline noise and gives a focused validator command for the current card.
- Single-task evidence and batch checkpoint are not forced to debug unrelated baseline failures unless the task touched that surface.
- Release-level validation still reports baseline failures and remains allowed to block release decisions.
- Regression evidence includes one fixture where validate:standard has an unrelated existing failure while the current task focused validator passes.

## Rollback

Revert the task commit. Remove any added envelope fields or compatibility adapters in the same revert if they are not backward compatible.

## Atomization Impact

- Owner atom/map: atm.validator-envelope-map
- Map updates: atomic_workbench/atomization-coverage/path-to-atom-map.json
- Any new script/CLI/validator introduced by this card must be mapped before closure.

## Notes

This is opened because TASK-AAO-0004 was already completed and committed. New dogfood findings should be handled as follow-up work, not retroactively injected into completed acceptance.
