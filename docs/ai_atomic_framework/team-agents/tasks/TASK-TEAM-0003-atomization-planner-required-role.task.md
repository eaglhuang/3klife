---
doc_id: doc_team_0003
task_id: TASK-TEAM-0003
title: "Atomization planner required role"
status: done
completed_at: "2026-06-09T23:07:56+08:00"
completed_by_agent: "007"
owner: atm-core
priority: P0
milestone: M1
depends_on: []
runs_parallel_with:
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
  ownerAtomOrMap: "team.plan-atomization-planner"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "2026-06-09 | done | AAF delivery 2c421179 + ledger 1ba09878; post-close refinement 81262a21 during live-pass pilot (buildAtomizationChecklist + atomization-planner.md only; no owner-shard or path-to-atom-map projection touch; atom-disjoint from TASK-TEAM-0002)."
outOfScope:
  - "Refactoring existing atom maps beyond required ownership entries"
  - "Creating automatic task splitting"
  - "Changing batch checkpoint semantics"
nonGoals:
  - "Do not replace human task-card authoring"
  - "Do not allow planner output to bypass scope locks"
dispatch_pattern:
  shape: "dual-agent (Phase 0 planner + Phase 1 builder)"
  parallel_with: "TASK-TEAM-0002"
  rationale: "0002 defines the crew shell; 0003 declares one mandatory role inside it. Their file footprints do not overlap (different doc paths), so they may be built in parallel and merged in either order."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0003-*.task.md"
    commit_budget: 0
    output: "Phase 1 brief + atomization planner JSON shape spec"
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/runtime/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: docs + cli planner JSON fields + spec"
      - "commit_2: path-to-atom-map.json + close evidence"
  condition_review:
    - "Phase 1 must not touch any 3KLife path"
    - "team plan output includes primary atom / related atoms / command surface / large-script risk / map update need / split recommendation"
    - "known hot files (tasks.ts, next.ts, evidence.ts, hook.ts) trigger high-risk note"
    - "planner has no write / lifecycle permission anywhere"
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

Planning truth (2026-06-09): status remains `done` after the original AAF close (`2c421179`, ledger `1ba09878`). A bounded post-close refinement landed as `81262a21` during the live-pass pilot, tightening `buildAtomizationChecklist` output and `atomization-planner.md` without touching owner shards or the path-to-atom-map projection. Ownership stays on `team.plan-atomization-planner` / `team.spec.atomization-planner`, disjoint from `TASK-TEAM-0002`.
