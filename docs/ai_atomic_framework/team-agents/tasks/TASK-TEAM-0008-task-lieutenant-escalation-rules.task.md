---
doc_id: doc_team_0008
task_id: TASK-TEAM-0008
title: "Task lieutenant escalation rules"
status: done
started_at: "2026-06-10T20:16:55.4589269+08:00"
started_by_agent: codex-gpt-5.4-mini
owner: atm-core
priority: P1
milestone: M3
depends_on:
  - "TASK-TEAM-0007"
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
  - "node --strip-types scripts/validate-team-agents.ts --case lieutenant-escalation"
  - "node atm.mjs team plan --task TASK-TEAM-0008 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert lieutenant escalation rules and validation fixtures."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Human approval workflow"
  - "Subagent spawning"
  - "Changing close/checkpoint requirements"
nonGoals:
  - "Do not make lieutenant a second lifecycle owner"
  - "Do not grant git.write to lieutenant"
---
# TASK-TEAM-0008 — Task lieutenant escalation rules

## Goal

Define when `Task Lieutenant` is recommended and how the recommendation appears in `team plan`.

## Why

Complex cards need a deputy for phase coordination and blocker tracking, but the lieutenant must not become a second captain or lifecycle owner.

## Implementation Contract

- Add deterministic lieutenant escalation rules to dry-run planning.
- Use core-file count, cross-repo scope, large-script risk, closure/evidence/git involvement, and validator count as inputs.
- Return the escalation reason in machine-readable JSON.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case lieutenant-escalation`
- `node atm.mjs team plan --task TASK-TEAM-0008 --json`
- `git diff --check`

## Acceptance Criteria

- Tasks touching more than two core files recommend `Task Lieutenant`.
- Tasks involving git, evidence, closure, batch, or large scripts recommend `Task Lieutenant`.
- The output includes `escalationRequired`, `escalationReason`, `needLieutenant`, and `nextTeamShape`.
- Lieutenant never receives `task.lifecycle`, `git.write`, or `evidence.write` by default.

## Rollback

Revert the escalation rules, tests, and atom map updates.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card makes complicated work easier to coordinate while keeping the captain as the single decision owner.

## Worker Report

- worker: 002
- dispatch: R52-TEAM-M3-20260610T2005+08:00
- status: closeout-ready
- captain-corrective-thread-dispatch-used: yes
- summary: Added deterministic lieutenant escalation output to `packages/cli/src/commands/team.ts`, exposed it in `packages/cli/src/commands/command-specs/team.spec.ts`, added `scripts/validate-team-agents.ts`, and updated `atomic_workbench/atomization-coverage/path-to-atom-map.json`.
- validation:
  - `npm run typecheck` ✅
  - `npm run validate:cli` ✅
  - `npm run validate:team-agents` ✅
  - `node atm.dev.mjs team plan --task TASK-TEAM-0008 --json` ✅
  - `git diff --check` ✅
- notes: `TASK-TEAM-0008` was materialized into `.atm/history/tasks/TASK-TEAM-0008.json` so the dry-run plan validator could be exercised source-first; target-ledger claim/close gates remain separate from this source-card closeout.
