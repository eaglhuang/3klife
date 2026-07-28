---
doc_id: doc_team_0009
task_id: TASK-TEAM-0009
title: "Team plan dry-run resolver"
status: done
owner: atm-core
priority: P0
milestone: M4
depends_on:
  - "TASK-TEAM-0007"
  - "TASK-TEAM-0008"
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
  - "node --strip-types scripts/validate-team-agents.ts --case plan-resolver"
  - "node atm.mjs team plan --task TASK-TEAM-0009 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert team plan resolver changes and validation fixtures."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Starting team runtime"
  - "Spawning subagents"
  - "Changing next routing"
nonGoals:
  - "Do not write .atm/runtime/**"
  - "Do not implement patrol automation"
completed_at: "2026-06-14T14:21:29.393Z"
completed_by_agent: "captain-teamagents"
lastTransitionId: "2026-06-14T14-21-29-316Z-close-df67d34241c6"
delivery_commit: "b3f4c80064a148152f850f4939732c3c4b7e5190"
---
# TASK-TEAM-0009 — Team plan dry-run resolver

## Goal

Implement the milestone-grade `team plan --task <id> --json` resolver.

## Why

The dry-run resolver is the first CLI surface that turns task metadata into a usable team plan without writing runtime state.

## Implementation Contract

- Read task metadata, scope paths, deliverables, validators, and channel hints.
- Produce a dry-run `atm.teamPlan.v1` response.
- Include planned agents, permission leases, captain decision, atomization plan, and warnings.
- Do not write runtime files or spawn agents.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case plan-resolver`
- `node atm.mjs team plan --task TASK-TEAM-0009 --json`
- `git diff --check`

## Acceptance Criteria

- `team plan --task <id> --json` returns a stable team plan object.
- The response includes `dryRun: true`, `runtimeWritten: false`, and `agentsSpawned: false`.
- The response includes recipe id, channel hint, planned agents, planned permission leases, sizing rationale, and atomization plan.
- Missing or invalid task ids return actionable errors.
- CLI help documents the command and examples.

## Rollback

Revert resolver, spec, validator, and atom map changes.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card is the safe bridge between planning documents and future runtime automation.
