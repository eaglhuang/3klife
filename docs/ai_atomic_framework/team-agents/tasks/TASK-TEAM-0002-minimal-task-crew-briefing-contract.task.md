---
doc_id: doc_team_0002
task_id: TASK-TEAM-0002
title: "Minimal task crew briefing contract"
status: planned
owner: atm-core
priority: P0
milestone: M1
depends_on:
  - "TASK-TEAM-0001"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/team-agents/minimal-task-crew.md"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/governance/team-agents/minimal-task-crew.md"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node atm.mjs team plan --task TASK-TEAM-0002 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the crew contract docs and CLI contract changes together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Introduces the minimal team briefing contract into the Team Agents command surface."
outOfScope:
  - "Creating a full subagent runtime"
  - "Changing task close or batch checkpoint behavior"
  - "Writing .atm/runtime/** outside documented team commands"
nonGoals:
  - "Do not implement permission lease enforcement"
  - "Do not add Atomic Police patrol automation"
dispatch_pattern:
  shape: "dual-agent (Phase 0 planner + Phase 1 builder)"
  parallel_with: "TASK-TEAM-0003"
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0002-*.task.md"
    commit_budget: 0
    output: "Phase 1 brief + atom map row draft"
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/runtime/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: docs + cli command + spec"
      - "commit_2: path-to-atom-map.json + close evidence"
  condition_review:
    - "Phase 1 must not touch any 3KLife path"
    - "team plan --json output identifies the 4 minimum crew roles"
    - "atom map row exists under owner atm.team-agents-map"
    - "no lease / runtime semantics introduced"
---
# TASK-TEAM-0002 — Minimal task crew briefing contract

## Goal

Define the smallest useful task crew contract so every governed task can be described as a human-readable team brief.

## Why

Team Agents should become useful before full automation exists. The first implementation step is a stable briefing contract that tells a task captain what roles are present, what they may do, and what they must report.

## Implementation Contract

- Add or update framework docs for the minimum crew contract.
- Ensure `team plan` can surface the minimum crew in JSON.
- Keep runtime writes and subagent spawning out of scope.
- Preserve Coordinator-only lifecycle and git ownership.

## Deliverables

- `docs/governance/team-agents/minimal-task-crew.md`
- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node atm.mjs team plan --task TASK-TEAM-0002 --json`
- `git diff --check`

## Acceptance Criteria

- `team plan` identifies `Task Captain`, `Atomization Planner`, `Code Builder`, and `Check Runner` for a small task.
- The output distinguishes required roles from optional roles.
- The briefing contract includes allowed files, do-not-touch paths, expected reports, and stop conditions.
- No subagents are spawned and no team runtime file is written.
- The atomization map covers any new docs, scripts, or command surface touched by this card.

## Rollback

Revert the implementation commit and remove the corresponding atom map entries.

## Atomization Impact

- Owner atom/map: `atm.team-agents-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card is the first framework-side Team Agents implementation card. It should stay small enough to review in isolation.
