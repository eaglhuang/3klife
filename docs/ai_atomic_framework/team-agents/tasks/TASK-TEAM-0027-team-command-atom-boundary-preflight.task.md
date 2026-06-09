---
doc_id: doc_team_0027
task_id: TASK-TEAM-0027
title: "Team command atom boundary preflight"
status: planned
owner: atm-core
priority: P0
milestone: M1P
depends_on:
  - "TASK-TEAM-0001"
  - "TASK-AAO-0106"
related:
  - "TASK-TEAM-0002"
  - "TASK-TEAM-0003"
  - "TASK-AAO-0106"
  - "TASK-CID-0023"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/team.ts"
  - "C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/team.spec.ts"
  - "C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "C:/Users/User/AI-Atomic-Framework/docs/governance/team-agents/team-atom-boundaries.md"
deliverables:
  - "C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/team.ts"
  - "C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/team.spec.ts"
  - "C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "C:/Users/User/AI-Atomic-Framework/docs/governance/team-agents/team-atom-boundaries.md"
validators:
  - "npm.cmd run typecheck"
  - "npm.cmd run validate:cli"
  - "node scripts/validate-atomization-coverage.ts"
  - "node atm.mjs team plan --task TASK-TEAM-0002 --json"
  - "node atm.mjs team plan --task TASK-TEAM-0003 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert Team command/spec atom-boundary changes and path-map rows together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "Split coarse Team command ownership into behavior-level atoms before the first parallel Team Agents proof."
    - "Coordinate path-to-atom-map ownership through TASK-AAO-0106 owner shards before touching shared map rows."
  notes: "This card raises atom granularity; TASK-AAO-0106 owns path-to-atom-map sharding and must not be duplicated."
outOfScope:
  - "Team runtime implementation beyond atom-boundary-safe stubs"
  - "Changing task lifecycle semantics"
  - "Closing TASK-TEAM-0002 or TASK-TEAM-0003"
  - "Creating a duplicate path-to-atom-map sharding task"
  - "Bypassing TASK-AAO-0106 for shared path-map ownership"
  - "N=4 same-file disjoint proof"
  - "Cross-file disjoint multi-lane proof"
  - "Post-apply per-proposal validator execution proof"
dispatch_pattern:
  shape: "target-repo preflight before parallel implementation proof"
  rationale: "The first Team Agents parallel test should prove same-file different-atom work can proceed safely, not merely reveal that team.ts, team.spec.ts, or path-to-atom-map.json are still too coarse."
  phase_0:
    lane: "planning-only captain/sidecar preflight"
    allowed_files:
      - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/README.md"
      - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0027-team-command-atom-boundary-preflight.task.md"
      - "C:/Users/User/3KLife/docs/tasks/tasks-team.json"
      - "C:/Users/User/3KLife/docs/tasks/tasks-team/tasks-team-part-1.json"
    forbidden_files:
      - "C:/Users/User/3KLife/.tmp/**"
      - "C:/Users/User/AI-Atomic-Framework/**"
    allowed_files_strict: true
    commit_budget: 1
    output: "Planning-visible card and roster update that chains Team atom-boundary work to TASK-AAO-0106."
  phase_1:
    lane: "AI-Atomic-Framework target_repo implementation"
    activation_requires:
      - "TASK-TEAM-0001"
      - "TASK-AAO-0106"
    allowed_files:
      - "C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/team.ts"
      - "C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/team.spec.ts"
      - "C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json"
      - "C:/Users/User/AI-Atomic-Framework/docs/governance/team-agents/team-atom-boundaries.md"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - "C:/Users/User/AI-Atomic-Framework/.atm/runtime/**"
      - "C:/Users/User/AI-Atomic-Framework/.atm/history/**"
    commit_budget: 2
condition_review:
  - "TASK-AAO-0106 remains the single sharding task for path-to-atom-map.json"
  - "Phase 0 planning commit must stage only the explicit planning allowed_files whitelist; unrelated local files such as .tmp/lb-working.html must remain unstaged"
  - "Before implementation, current team.ts / team.spec.ts / path-map atom granularity must be inspected and recorded"
  - "The implementation packet must state whether the atom-boundary work is split, merge, or registration/backfill before edits begin"
  - "Completion evidence must include command-backed atomization coverage validation or an equivalent coverage diff"
  - "TASK-TEAM-0002 and TASK-TEAM-0003 must be checked for real atom / atom-map intersection before they are used as the E2E collision fixture"
  - "If TASK-TEAM-0002 and TASK-TEAM-0003 do not actually intersect, create an explicit TEST-TEAM-COLLIDE-A / TEST-TEAM-COLLIDE-B fixture pair instead of forcing a false-negative business-card proof"
  - "The collision proof target is compose verdict blocked-cid-conflict with mergePlan.conflicts including kind: cid"
  - "Read-only boundary inventory, conflict matrix, and E2E route drafting should be done by internal sidecars before external 001/002/003 implementation dispatch"
  - "Follow-up shards must track N=4 same-file disjoint, cross-file disjoint multi-lane, and post-apply per-proposal validator execution; do not mix them into this card"
  - "team.ts is mapped into separate CLI entry, permission/recipe, crew briefing, atomization planner, broker lane, start runtime, and status read atoms"
  - "team.spec.ts mirrors those behavior atoms instead of one coarse command-spec owner"
  - "TASK-TEAM-0002 and TASK-TEAM-0003 can be assigned to different Team atoms before running a live parallel proof"
  - "If TASK-AAO-0106 is not closed, path-map mutation must run through one documented steward lane instead of concurrent writers"
---
# TASK-TEAM-0027 - Team command atom boundary preflight

## Goal

Raise the Team Agents atom boundaries before running the first meaningful parallel implementation proof.

The target proof is not "can two workers edit nearby files without Git conflict." The target proof is stronger: `TASK-TEAM-0002` and `TASK-TEAM-0003` should be able to touch the same command/spec surfaces while owning different Team behavior atoms.

## Why

The current Team Agents candidate test is useful, but only as a diagnostic, because these surfaces are still too coarse:

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

If both workers collide on one coarse `atm.team-agents-map` owner, the result proves the boundary is not ready. It does not prove the CID parallel-development feature can safely coordinate real Team Agents work.

`path-to-atom-map.json` already has a dedicated sharding task: `TASK-AAO-0106`. This card must depend on that lane rather than creating a duplicate sharding task.

## Required Atom Boundaries

`team.ts` should expose separate ownership for at least:

- `team.cli-entry`
- `team.recipe-permission-model`
- `team.plan-crew-briefing-contract`
- `team.plan-atomization-planner`
- `team.plan-broker-lane`
- `team.start-runtime-state`
- `team.status-runtime-read`

`team.spec.ts` should mirror those boundaries for at least:

- `team.spec.command-surface`
- `team.spec.crew-briefing`
- `team.spec.atomization-planner`
- `team.spec.permission-validation`
- `team.spec.broker-lane`
- `team.spec.runtime-status`

## Deliverables

- Team command/spec code organized or documented so the above atom boundaries are enforceable.
- `path-to-atom-map.json` rows updated only after `TASK-AAO-0106` owner shards land, or through a single documented steward lane.
- `docs/governance/team-agents/team-atom-boundaries.md` explaining which atoms `TASK-TEAM-0002` and `TASK-TEAM-0003` should own for the first parallel proof.

## Validators

- `npm.cmd run typecheck`
- `npm.cmd run validate:cli`
- `node scripts/validate-atomization-coverage.ts`
- `node atm.mjs team plan --task TASK-TEAM-0002 --json`
- `node atm.mjs team plan --task TASK-TEAM-0003 --json`
- `git diff --check`

## Acceptance Criteria

- `TASK-AAO-0106` remains the canonical path-to-atom-map sharding card.
- `TASK-TEAM-0002` owns the crew briefing atoms without also owning the atomization planner atoms.
- `TASK-TEAM-0003` owns the atomization planner atoms without also owning the crew briefing atoms.
- The first live parallel test can distinguish same-file different-atom PASS from same-atom `FALLBACK_SERIALIZE`.
- If the path map is not yet sharded, concurrent map writers are forbidden and a single steward lane is documented.

## Rollback

Revert Team command/spec atom-boundary changes and related path-map rows together.

## Captain Notes

This is the preflight card that makes the parallel test meaningful. Without it, Team Agents parallel validation mostly measures that the atom boundary is too coarse.

### Required Tightening Before Dispatch

- Phase 0 planning must be staged by explicit whitelist only: `docs/ai_atomic_framework/team-agents/tasks/README.md`, this task card, `docs/tasks/tasks-team.json`, and `docs/tasks/tasks-team/tasks-team-part-1.json`. Do not stage unrelated local files such as `.tmp/lb-working.html`.
- Atom-boundary uplift must be evidence-shaped before implementation: record the current atom granularity for `team.ts`, `team.spec.ts`, and the path-map row(s); state whether the work is a split, merge, or registration/backfill; prove the result with `validate-atomization-coverage` or an equivalent command-backed coverage diff.
- `TASK-TEAM-0002` and `TASK-TEAM-0003` are only valid as the first E2E collision fixture if their scopes really intersect on the same atom or atom-map row. If they do not intersect, create explicit `TEST-TEAM-COLLIDE-A` / `TEST-TEAM-COLLIDE-B` fixtures instead.
- The collision acceptance target is not a generic Git conflict. The expected failing verdict is `blocked-cid-conflict`, and `mergePlan.conflicts` must include `kind: cid`.
- Boundary inventory, conflict matrix, and E2E route drafting are read-only sidecar work. External `001` / `002` / `003` should be reserved for the next phase that actually edits Team command/spec structure or writes the fixture.
- Follow-up coverage for N=4 same-file disjoint, cross-file disjoint multi-lane, and post-apply per-proposal validator execution should become separate follow-up shards after this card. They are intentionally out of scope for this first E2E proof.
