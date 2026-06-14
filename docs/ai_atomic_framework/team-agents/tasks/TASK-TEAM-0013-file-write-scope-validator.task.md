---
doc_id: doc_team_0013
task_id: TASK-TEAM-0013
title: "file.write scope validator"
status: done
owner: atm-core
priority: P0
milestone: M5
depends_on:
  - "TASK-TEAM-0012"
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
  - "node --strip-types scripts/validate-team-agents.ts --case file-write-scope"
  - "node atm.mjs team validate --task TASK-TEAM-0013 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert file.write scope validator logic and fixtures."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Actual file write interception"
  - "Pre-tool hook enforcement"
  - "Changing scope amendment lifecycle"
nonGoals:
  - "Do not widen allowedFiles"
  - "Do not allow `.atm/runtime/**` hand edits"
completed_at: "2026-06-14T15:17:40.575Z"
completed_by_agent: "codex-captain"
delivery_commit: "3acba6bda4a846a019127d8f62a613771a512622"
---
# TASK-TEAM-0013 — file.write scope validator

## Goal

Validate that any planned `file.write` lease is a subset of the task allowed files and never points at forbidden runtime paths.

## Why

Multi-agent work is safe only if implementers have bounded write paths. This validator catches scope drift before runtime or hooks enforce it.

## Implementation Contract

- Normalize Windows and POSIX paths before comparison.
- Validate `file.write` paths against task allowedFiles and deliverables.
- Explicitly reject `.atm/runtime/**` and direct `.atm/history/**` hand edits unless a future card creates a governed exception.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case file-write-scope`
- `node atm.mjs team validate --task TASK-TEAM-0013 --json`
- `git diff --check`

## Acceptance Criteria

- A lease outside allowedFiles is rejected with the rejected path in details.
- Path traversal attempts are rejected after normalization.
- `.atm/runtime/**` hand edits are rejected.
- Valid leases inside allowedFiles pass.
- Findings include required command or next action when scope needs amendment.

## Rollback

Revert scope validator logic, fixtures, and map updates.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card is the last safety step before broader integration with patrol and next/playbook.
