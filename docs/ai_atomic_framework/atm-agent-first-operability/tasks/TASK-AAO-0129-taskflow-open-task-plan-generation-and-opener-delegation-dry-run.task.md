---
doc_id: ""
task_id: TASK-AAO-0129
title: "taskflow open task-plan generation and opener delegation dry-run"
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
executionMode: phase0-taskflow-open-task-plan-generation-and-opener-delegation-dry-run
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0129-taskflow-open-task-plan-generation-and-opener-delegation-dry-run.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-41.json
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/taskflow.spec.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/profile-loader.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/**
  - C:/Users/User/AI-Atomic-Framework/schemas/taskflow-profile.v1.json
  - C:/Users/User/AI-Atomic-Framework/fixtures/taskflow-profile/**
  - C:/Users/User/AI-Atomic-Framework/docs/specs/taskflow-profile-v1.md
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - 3KLife opener import / require / spawn
  - write mode / ledger mutation / shard mutation
non_goals:
  - "Do not mutate AAF source in Phase 0."
  - "Do not touch TASK-AAO-0128."
  - "Do not fold opener implementation work into this card."
  - "Do not widen the Phase 1 scope beyond taskflow open planning and opener delegation dry-run."
notes: "2026-06-04 | status: open | validation: pending | change: Phase 0 open card for taskflow open task-plan generation and opener delegation dry-run | blocker: none"
---

# TASK-AAO-0129 taskflow open task-plan generation and opener delegation dry-run

## Goal
Open the Phase 0 planning card for taskflow open task-plan generation and opener delegation dry-run.
This card lives in 3KLife planning only, targets AI-Atomic-Framework for Phase 1, and keeps the ledger/shard sync limited to the card itself.

## Background
Taskflow needs a governed path for opening task plans and delegating opener dry-runs without widening route-visible scope into `next`, `tasks`, or `task-direction`.
This card defines the planning anchor for that workflow.
It does not touch AAF source in Phase 0.
It does not bundle opener implementation work into the planning card.

## Phase 0 Scope
- Update only this planning card, `docs/tasks/tasks-atm.json`, and the resolved shard `docs/tasks/tasks-atm/tasks-atm-part-41.json`.
- Keep the AAF implementation work out of Phase 0.
- Keep ledger/shard sync isolated to the 0129 planning entry.
- Do not touch TASK-AAO-0128.

## Phase 1 Scope Amendment
- Frontmatter `allowed_files` is the target-repo Phase 1 import scope, not the historical Phase 0 planning write scope.
- The taskflow open flow should resolve only the taskflow profile surfaces listed below.
- Nearby route surfaces for `next`, `tasks`, and `task-direction` remain forbidden.
- The implementation stays a dry-run planner until the follow-up card lands.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/taskflow.spec.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/profile-loader.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/**`
- `C:/Users/User/AI-Atomic-Framework/schemas/taskflow-profile.v1.json`
- `C:/Users/User/AI-Atomic-Framework/fixtures/taskflow-profile/**`
- `C:/Users/User/AI-Atomic-Framework/docs/specs/taskflow-profile-v1.md`

## Phase 1 Forbidden Surfaces
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/**`
- `C:/Users/User/AI-Atomic-Framework/release/**`
- `3KLife opener import / require / spawn`
- `write mode / ledger mutation / shard mutation`

## Acceptance Criteria
- The Phase 0 planning card opens cleanly and only updates the planning ledger/shard for 0129.
- The follow-up Phase 1 scope stays limited to taskflow open planning and opener delegation dry-run surfaces.
- `next`, `tasks`, and `task-direction` remain outside this card's Phase 1 write scope.
- AAF source remains untouched in Phase 0.

## Validators
- `node tools_node/check-encoding-touched.js --files docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0129-taskflow-open-task-plan-generation-and-opener-delegation-dry-run.task.md docs/tasks/tasks-atm.json docs/tasks/tasks-atm/tasks-atm-part-41.json`
- `git diff --check`
- `node tools_node/check-doc-shard-health.js`

## Plain-language Anchor
This card only opens the planning lane for taskflow task-plan generation and opener delegation dry-run.
It does not widen `next`, `tasks`, or `task-direction`, and it does not touch AAF source during Phase 0.
