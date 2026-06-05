---
doc_id: ""
task_id: TASK-AAO-0131
title: "route hygiene follow-up for planning artifacts and synthetic alias scope guard"
milestone: M16
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: ""
started_by_agent: ""
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-route-hygiene-follow-up-planning-artifact-synthetic-alias-scope-guard
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-AAO-0128
  - TASK-TEAM-0026
  - TASK-CID-0005
depends: []
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0131-route-hygiene-follow-up-planning-artifact-synthetic-alias-scope-guard.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-14.json
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-task-import.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - TASK-TEAM-0026 implementation/mirror files
  - TASK-CID-0005 source/implementation files
  - Any repo-local planning alias that is not marked planning read-only
non_goals:
  - "Do not mutate AAF source in Phase 0."
  - "Do not update TASK-TEAM-0026 or TASK-CID-0005 task cards unless a future Captain request explicitly says so."
  - "Do not let planning artifacts or synthetic aliases enter route-visible target work."
  - "Do not fold CID advisor MVP or unrelated AAF delivery work into this card."
  - "Do not stage or commit unrelated dirty files."
notes: "2026-06-05 | status: open | validation: pending | change: Phase 0 open card for route hygiene follow-up | blocker: none | risk: planning artifact / synthetic alias drift"
---

# TASK-AAO-0131 route hygiene follow-up for planning artifacts and synthetic alias scope guard

## Goal
Open the Phase 0 planning card for the route hygiene follow-up that keeps planning artifacts and synthetic aliases out of route-visible scope.
This follows the importer pollution guard pattern from `TASK-AAO-0128`, but it stays focused on planning-artifact and alias hygiene.

## Background
`TASK-TEAM-0026` and `TASK-CID-0005` are already clean enough for regression use, yet route/import can still leak planning artifacts into target-visible scope or synthesize a `CID` alias that looks like target work.
That is a route hygiene problem, not a card-content problem.

This card only defines the planning anchor for that defense.
It stays in 3KLife Phase 0, treats TEAM-0026 and CID-0005 as regression fixtures, and does not touch AAF source.

## Phase 0 Scope
- Keep this card in 3KLife planning only.
- Update only this planning card, `docs/tasks/tasks-atm.json`, and the resolved `docs/tasks/tasks-atm/tasks-atm-part-14.json` shard.
- Use TEAM-0026 and CID-0005 only as regression references for the route/import hygiene fix.
- Do not touch AAF source in Phase 0.
- Do not turn planning-artifact cleanup into a CID advisor implementation task.

## Phase 1 Scope Amendment
- Frontmatter `allowed_files` is the Phase 1 import scope, not the Phase 0 write scope.
- `next`, `tasks`, and `task-direction` are the AAF route surfaces under review.
- Planning repo-only artifacts must stay read-only unless they are explicitly marked as target work.
- TEAM-0026 and CID-0005 regressions must stay as regressions, not delivery routes.

## Acceptance Criteria
- TEAM-0026 route must not put `docs/tasks/*` into `targetAllowedFiles`.
- TEAM-0026 route must not put `packages/cli/src/commands` into `targetAllowedFiles`.
- CID-0005 route must not produce a `docs/.../CID` synthetic alias, or any alias artifact must be clearly marked planning read-only and excluded from target work.
- A planning_repo-only task must not be mistaken for an AI-Atomic-Framework delivery route.
- Phase 0 does not mutate AAF source.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-import.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts`

## Phase 1 Forbidden Surfaces
- `C:/Users/User/AI-Atomic-Framework/.atm/history/**`
- `C:/Users/User/AI-Atomic-Framework/release/**`
- `TASK-TEAM-0026 implementation/mirror files`
- `TASK-CID-0005 source/implementation files`
- Any repo-local planning alias that is not marked planning read-only

## Validators
### Phase 0 Planning Validators
- `node tools_node/check-encoding-touched.js --files docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0131-route-hygiene-follow-up-planning-artifact-synthetic-alias-scope-guard.task.md docs/tasks/tasks-atm.json docs/tasks/tasks-atm/tasks-atm-part-14.json`
- `git diff --check`
- `node tools_node/check-doc-shard-health.js`

### Phase 1 Regression Validators
- `node atm.mjs next --prompt "TASK-TEAM-0026" --json`
- `node atm.mjs next --prompt "TASK-CID-0005 P0 CID-first parallel conflict advisor CLI contract" --json`
- `node --strip-types scripts/validate-task-import.ts --mode validate`

## Plain-language Anchor
This card fixes the router so planning paperwork and synthetic aliases do not get mistaken for real delivery routes.
It does not repair the CID advisor itself, and it does not touch AAF source in Phase 0.
