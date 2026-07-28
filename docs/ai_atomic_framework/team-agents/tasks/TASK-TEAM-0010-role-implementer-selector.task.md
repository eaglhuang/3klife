---
doc_id: doc_team_0010
task_id: TASK-TEAM-0010
title: "Role and implementer selector"
status: done
owner: atm-core
priority: P1
milestone: M4
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
  - "node --strip-types scripts/validate-team-agents.ts --case role-selector"
  - "node atm.mjs team plan --task TASK-TEAM-0010 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert role selector logic, tests, and atom map changes."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Model/vendor selection"
  - "Subagent runtime adapter"
  - "Permission enforcement beyond planned leases"
nonGoals:
  - "Do not create editor-specific agent files"
  - "Do not auto-install external plugins"
completed_at: "2026-06-14T14:38:45.471Z"
completed_by_agent: "captain-teamagents"
lastTransitionId: "2026-06-14T14-38-45-389Z-close-d9df8ed42db4"
delivery_commit: "6f893e5a366e5e0a2c928edc5e158d06bf2039a0"
---
# TASK-TEAM-0010 — Role and implementer selector

## Goal

Select implementation roles from task language, path, and deliverable hints.

## Why

The team planner should recommend a TypeScript, Python, Cocos, data pipeline, or generic implementer without requiring the captain to infer it manually.

## Implementation Contract

- Extend `team plan` role selection.
- Use deterministic hints from scope paths, deliverables, repo probe, and known file extensions.
- Provide safe fallback when no language-specific implementer matches.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case role-selector`
- `node atm.mjs team plan --task TASK-TEAM-0010 --json`
- `git diff --check`

## Acceptance Criteria

- TypeScript-heavy tasks choose a TypeScript implementer.
- Python-heavy tasks choose a Python implementer when available.
- Cocos/adopter UI paths can produce a Cocos or UI-oriented role hint without widening write scope.
- Unknown languages fall back to a generic implementer with a clear fallback reason.
- Selector output includes selected implementer, language match, role match, fallback reason, and confidence.

## Rollback

Revert selector logic, validation fixtures, and atom map updates.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card improves team recommendations while keeping actual runtime execution out of scope.
