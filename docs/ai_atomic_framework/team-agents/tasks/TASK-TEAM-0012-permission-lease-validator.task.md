---
doc_id: doc_team_0012
task_id: TASK-TEAM-0012
title: "Permission lease validator"
status: planned
owner: atm-core
priority: P0
milestone: M5
depends_on:
  - "TASK-TEAM-0011"
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
  - "node --strip-types scripts/validate-team-agents.ts --case permission-lease"
  - "node atm.mjs team validate --task TASK-TEAM-0012 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert permission lease validation logic and fixtures."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Pre-tool enforcement"
  - "Pre-commit enforcement"
  - "External database or CI permissions"
nonGoals:
  - "Do not make leases override task allowedFiles"
  - "Do not grant git.write to multiple roles"
---
# TASK-TEAM-0012 — Permission lease validator

## Goal

Validate Team Agents permission leases before runtime state is considered usable.

## Why

Team Agents rely on explicit, bounded permissions. The validator must catch duplicate exclusive owners, missing scope, expired leases, and invalid role-permission combinations.

## Implementation Contract

- Add deterministic validation for `task.lifecycle`, `git.write`, `file.write`, `evidence.write`, and shareable read/validator permissions.
- Return structured findings with actionable messages.
- Keep enforcement advisory in this card; hooks come later.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case permission-lease`
- `node atm.mjs team validate --task TASK-TEAM-0012 --json`
- `git diff --check`

## Acceptance Criteria

- Duplicate exclusive permission owners produce validation findings.
- Missing scope on scoped permissions produces validation findings.
- Coordinator remains the only default owner of `task.lifecycle`, `git.write`, and `evidence.write`.
- Read-only roles do not receive write permissions by default.
- Findings include code, summary, role, permission, and suggested fix.

## Rollback

Revert validator logic, command spec changes, fixtures, and map updates.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card makes team permissions inspectable before they become enforceable.
