---
doc_id: doc_team_0011
task_id: TASK-TEAM-0011
title: "Team start/status runtime"
status: planned
owner: atm-core
priority: P0
milestone: M5
depends_on:
  - "TASK-TEAM-0009"
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
  - "node --strip-types scripts/validate-team-agents.ts --case start-status"
  - "node atm.mjs team start --task TASK-TEAM-0011 --actor codex-main --json"
  - "node atm.mjs team status --compact --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert team runtime writes and validation coverage."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Subagent spawning"
  - "Pre-tool or pre-commit enforcement"
  - "Changing task close behavior"
nonGoals:
  - "Do not write outside .atm/runtime/team-runs/**"
  - "Do not grant write permissions to non-coordinator roles"
---
# TASK-TEAM-0011 — Team start/status runtime

## Goal

Add `team start` and `team status` runtime commands for scoped team runs.

## Why

After dry-run planning works, ATM needs a minimal runtime record that captures the chosen team, actor, task, role set, and planned permission leases.

## Implementation Contract

- `team start` may write only `.atm/runtime/team-runs/<teamRunId>.json`.
- `team status` reads team run state and supports compact output.
- No hooks or subagent adapters are introduced in this card.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case start-status`
- `node atm.mjs team start --task TASK-TEAM-0011 --actor codex-main --json`
- `node atm.mjs team status --compact --json`
- `git diff --check`

## Acceptance Criteria

- `team start` writes a single team run file under `.atm/runtime/team-runs/**`.
- `team status --compact --json` returns active team run summaries.
- Runtime state includes teamRunId, taskId, actorId, recipeId, roles, leases, status, and timestamps.
- Runtime writes do not touch `.atm/history/**`.
- CLI help documents start/status usage.

## Rollback

Revert runtime implementation and validation fixtures. Remove any test-created runtime files.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card introduces runtime state but still avoids real subagent spawning.
