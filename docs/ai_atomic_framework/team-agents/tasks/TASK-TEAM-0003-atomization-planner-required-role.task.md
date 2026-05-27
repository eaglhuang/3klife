---
doc_id: doc_team_0003
task_id: TASK-TEAM-0003
title: "Atomization planner required role"
status: planned
owner: atm-core
priority: P0
milestone: M1
depends_on:
  - "TASK-TEAM-0002"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/team-agents/atomization-planner.md"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/governance/team-agents/atomization-planner.md"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node atm.mjs team plan --task TASK-TEAM-0003 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the Atomization Planner role requirement and map updates."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Makes atomization planning a first-class Team Agents capability."
outOfScope:
  - "Refactoring existing atom maps beyond required ownership entries"
  - "Creating automatic task splitting"
  - "Changing batch checkpoint semantics"
nonGoals:
  - "Do not replace human task-card authoring"
  - "Do not allow planner output to bypass scope locks"
---
# TASK-TEAM-0003 — Atomization planner required role

## Goal

Make `Atomization Planner` a required Team Agents role for every task plan, with a stable checklist for atom/map planning.

## Why

ATM depends on atom and capability boundaries. If a task starts coding before atomization planning, large scripts and cross-capability changes become harder to review and easier to damage.

## Implementation Contract

- Add the `Atomization Planner` role to default team plans.
- Require an atomization checklist in team brief output.
- Flag large-script risk when touched files exceed the configured threshold or match known hot files.
- Keep recommendations advisory; do not auto-open or auto-split tasks in this card.

## Deliverables

- `docs/governance/team-agents/atomization-planner.md`
- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node atm.mjs team plan --task TASK-TEAM-0003 --json`
- `git diff --check`

## Acceptance Criteria

- Every default `team plan` includes an `Atomization Planner` role.
- The JSON output includes primary atom, related atoms, command surface, large-script risk, map update need, and split recommendation fields.
- Large known files such as `tasks.ts`, `next.ts`, `evidence.ts`, and `hook.ts` produce a high-risk planning note.
- The role does not receive write or lifecycle permissions.
- Missing atomization planning is reported as a planning blocker, not as a validator pass.

## Rollback

Revert the role requirement and remove associated docs and map entries.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This role is mandatory because it protects ATM's atomization model before implementation begins.
