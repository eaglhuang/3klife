---
doc_id: doc_team_0007
task_id: TASK-TEAM-0007
title: "Captain decision and team sizing dry-run"
status: done
completed_at: "2026-06-10T12:28:06.128Z"
completed_by_agent: "codex-gpt-5.4-mini"
owner: atm-core
priority: P0
milestone: M3
depends_on:
  - "TASK-TEAM-0003"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
ledger_closure:
  source: "AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-0007.json"
  closed_at: "2026-06-10T12:28:06.128Z"
  closed_by_actor: "codex-gpt-5.4-mini"
  closure_packet: ".atm/history/evidence/TASK-TEAM-0007.closure-packet.json"
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
  - "node --strip-types scripts/validate-team-agents.ts --case captain-sizing"
  - "node atm.mjs team plan --task TASK-TEAM-0007 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert captain sizing logic, validator coverage, and atom map changes."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Writing team runtime state"
  - "Spawning subagents"
  - "Enforcing leases at pre-tool or pre-commit time"
nonGoals:
  - "Do not replace task routing"
  - "Do not decide task closure"
---
# TASK-TEAM-0007 — Captain decision and team sizing dry-run

## Goal

Teach `team plan` to produce a captain decision block that recommends team size, required roles, optional roles, and rationale.

## Why

The captain must be able to make real decisions. Before runtime exists, the dry-run planner should still explain whether a task needs a tiny crew, a mid-sized crew, or a larger team with a lieutenant.

## Implementation Contract

- Keep the command dry-run only.
- Use task metadata, scope paths, validators, and atomization risk to decide team shape.
- Return structured JSON suitable for later `captain-decision.md`.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case captain-sizing`
- `node atm.mjs team plan --task TASK-TEAM-0007 --json`
- `git diff --check`

## Acceptance Criteria

- Small, medium, and large task fixtures receive different team size recommendations.
- The output includes captain, team size, required roles, optional roles, reason, confidence, and stop conditions.
- Large-script or cross-repo risk recommends adding `Task Lieutenant`.
- The command does not write `.atm/runtime/**`.
- The validator covers deterministic sizing cases.

## Rollback

Revert the captain sizing implementation and validator changes.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card gives the captain a decision surface without making the captain an unrestricted actor.
