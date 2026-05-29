---
doc_id: doc_team_0001
task_id: TASK-TEAM-0001
title: "Team agents planning roster reset"
status: done
owner: atm-core
priority: P0
milestone: M0
depends_on: []
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
started_at: 2026-05-29T11:42:00+08:00
started_by_agent: augment-claude-opus-4.7
completed_at: 2026-05-29T11:42:11+08:00
completed_by_agent: augment-claude-opus-4.7
scopePaths:
  - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
  - "docs/ai_atomic_framework/team-agents/tasks/README.md"
  - "docs/ai_atomic_framework/team-agents/tasks/*.task.md"
deliverables:
  - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
  - "docs/ai_atomic_framework/team-agents/tasks/README.md"
  - "docs/ai_atomic_framework/team-agents/tasks/*.task.md"
validators:
  - "node atm.mjs tasks import --from \"C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0001-team-agents-planning-roster-reset.task.md\" --dry-run --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the planning docs commit that resets the Team Agents roster."
atomizationImpact:
  ownerAtomOrMap: "atm.planning-bridge-map"
  mapUpdates: []
  notes: "Planning-only roster reset; framework atom map updates are deferred to implementation cards."
outOfScope:
  - "Modifying AI-Atomic-Framework source"
  - "Importing target ledger state"
  - "Hand-editing .atm/runtime/** or .atm/history/**"
nonGoals:
  - "Do not implement Team Agents runtime"
  - "Do not spawn subagents"
  - "Do not change ATM CLI behavior"
---
# TASK-TEAM-0001 — Team agents planning roster reset

## Goal

Replace the early Team Agents draft cards with milestone-ordered ATM-standard task cards and make this folder the task index for the lane.

## Why

The previous four `TASK-TEAM-*` drafts used older names and did not fully match the AAO task-card contract. This card establishes a clean planning baseline before framework implementation begins.

## Implementation Contract

- Planning context lives in `3KLife`; this card is explicitly a planning/doc task.
- Do not modify `AI-Atomic-Framework` source in this card.
- Keep each new task card importable and aligned with the M0-M6 rollout in the plan.
- Do not preserve old draft semantics when the milestone ordering changed.

## Deliverables

- `docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md`
- `docs/ai_atomic_framework/team-agents/tasks/README.md`
- `docs/ai_atomic_framework/team-agents/tasks/*.task.md`

## Validators

- `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0001-team-agents-planning-roster-reset.task.md" --dry-run --json`
- `git diff --check`

## Acceptance Criteria

- The task index lists `TASK-TEAM-0001` through `TASK-TEAM-0016` in milestone order.
- The plan states that task-card order follows milestones instead of old card numbers.
- Old `TASK-TEAM-0001` to `TASK-TEAM-0004` draft meanings are no longer present.
- All replacement task cards include `scopePaths`, `deliverables`, `validators`, `evidence`, `rollback`, and `atomizationImpact`.
- No framework source files are changed by this planning-only task.

## Rollback

Revert the planning docs commit. Because this card is planning-only, rollback should not require build or target runner sync.

## Atomization Impact

- Owner atom/map: `atm.planning-bridge-map`
- Map updates: none
- Framework atomization updates are owned by the later implementation cards.

## Notes

This card exists to make the Team Agents lane clean enough for later agents to import and claim without guessing which draft was current.
