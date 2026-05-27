---
doc_id: doc_team_0016
task_id: TASK-TEAM-0016
title: "Closure packet team summary integration"
status: planned
owner: atm-core
priority: P1
milestone: M6
depends_on:
  - "TASK-TEAM-0013"
  - "TASK-TEAM-0014"
  - "TASK-TEAM-0015"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "node --strip-types scripts/validate-team-agents.ts --case closure-summary"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert closure packet integration and validation fixtures."
atomizationImpact:
  ownerAtomOrMap: "atm.task-closure-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing evidence validators semantics"
  - "Allowing team summaries to replace command-backed evidence"
  - "Auto-closing tasks from team reports"
nonGoals:
  - "Do not create a second closure packet format"
  - "Do not weaken close/checkpoint gates"
---
# TASK-TEAM-0016 — Closure packet team summary integration

## Goal

Include Team Agents summaries in closure packets without replacing command-backed evidence.

## Why

When multiple agents contribute to a task, the close packet should preserve who did what, which reports were produced, and how validators/evidence map to the final decision.

## Implementation Contract

- Extend closure packet generation to include optional team summary data.
- Preserve existing closure packet validation and required evidence checks.
- Treat team summary as supporting context, not as validator evidence.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/batch.ts`
- `packages/cli/src/commands/evidence.ts`
- `scripts/validate-task-ledger-governance.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
- `node --strip-types scripts/validate-team-agents.ts --case closure-summary`
- `git diff --check`

## Acceptance Criteria

- Closure packets can include teamRunId, captain decision, agent reports, patrol findings, and evidence curator summary.
- Missing command-backed validators still block close.
- Team summary cannot mark failed validators as passed.
- Batch checkpoint and single-task close both preserve existing gate behavior.
- Governance validation covers closure packets with and without team summary data.

## Rollback

Revert closure packet integration, validation fixtures, and atom map changes.

## Atomization Impact

- Owner atom/map: `atm.task-closure-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card closes the first Team Agents loop: plan, run, report, patrol, and preserve the story at closure time.
