---
doc_id: doc_team_0014
task_id: TASK-TEAM-0014
title: "Atomic police patrol reports"
status: planned
owner: atm-core
priority: P1
milestone: M6
depends_on:
  - "TASK-TEAM-0013"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case patrol-report"
  - "node atm.mjs team patrol --task TASK-TEAM-0014 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert patrol command/report changes and map updates."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Recurring automation scheduling"
  - "Automatic source mutation by police agents"
  - "Closing tasks from patrol output"
nonGoals:
  - "Do not create a second evidence system"
  - "Do not replace validators with patrol text"
---
# TASK-TEAM-0014 — Atomic police patrol reports

## Goal

Add a read-only Atomic Police patrol command/report path.

## Why

Atomic Police Agents should proactively inspect scope, evidence, ledger, atom map, encoding, and runner sync risks without becoming source-writing agents.

## Implementation Contract

- Add a read-only `team patrol` command or equivalent subcommand.
- Return human-readable and JSON report fields aligned with `patrol-report.md`.
- Do not schedule recurring jobs in this card.
- Do not modify source or task state from patrol execution.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case patrol-report`
- `node atm.mjs team patrol --task TASK-TEAM-0014 --json`
- `git diff --check`

## Acceptance Criteria

- Patrol output includes run id, patrol team, severity, findings, safe-to-proceed, suggested command, and follow-up.
- Patrols are explicitly read-only and report `mutations: []`.
- The command can run for claim-preflight, close-preflight, big-script, and daily-noon patrol modes.
- Findings distinguish warnings from blockers.
- Patrol reports do not alter `.atm/runtime/**` or `.atm/history/**`.

## Rollback

Revert patrol command/report implementation and map updates.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card gives the police team a voice, not a baton.
