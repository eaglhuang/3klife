---
doc_id: doc_team_0014
task_id: TASK-TEAM-0014
title: "Atomic police patrol reports"
status: done
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
completed_at: "2026-06-17T18:37:46.821Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-17T18-37-46-739Z-close-538617ec46e4"
delivery_commit: "e09dad80fd3e378dd3cefbeb9d342b068dc53232"
---
# TASK-TEAM-0014 — Atomic police patrol reports

## Goal

Add a read-only Atomic Police patrol command/report path that can inspect runtime mode, rework-route readiness, missing artifacts, and retry-budget risk without mutating source or task lifecycle.

## Why

Atomic Police Agents should proactively inspect scope, evidence, ledger, atom map, encoding, runner sync risks, and rework-loop contract drift without becoming source-writing agents.

## Implementation Contract

- Add a read-only `team patrol` command or equivalent subcommand.
- Return human-readable and JSON report fields aligned with `patrol-report.md`.
- Patrol output should be able to surface runtime-mode mismatch, artifact gaps, retry-budget exhaustion risk, and stale rework state as findings.
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
- Patrol can report missing required artifacts and retry-budget exhaustion risk without closing or reopening any route itself.
- Patrol reports do not alter `.atm/runtime/**` or `.atm/history/**`.

## Rollback

Revert patrol command/report implementation and map updates.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card gives the police team a voice, not a baton, and prepares the later rework-loop cards to rely on patrol as a diagnostic surface rather than a second scheduler.
