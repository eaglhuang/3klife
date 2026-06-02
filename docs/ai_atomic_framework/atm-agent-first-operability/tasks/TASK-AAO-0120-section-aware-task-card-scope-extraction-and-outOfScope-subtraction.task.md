---
doc_id: ""
task_id: TASK-AAO-0120
title: "section-aware task-card scope extraction and outOfScope subtraction"
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
executionMode: phase0-section-aware-task-card-scope-extraction-and-outOfScope-subtraction
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0120-section-aware-task-card-scope-extraction-and-outOfScope-subtraction.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/**
  - C:/Users/User/3KLife/.atm/**
  - C:/Users/User/3KLife/.tmp/**
  - C:/Users/User/3KLife/examples/**
non_goals:
  - "Do not mutate AAF source files."
  - "Do not fold runner sync or commit guard implementation into this card."
  - "Do not stage or commit unrelated dirty or untracked files."
notes: "2026-06-03 | status: open | validation: pending | change: Phase 0 open card for importer scope pollution guard | blocker: route-visible scope pollution | risk: path-like prose leaking into targetAllowedFiles"
---

# TASK-AAO-0120 section-aware task-card scope extraction and outOfScope subtraction

## Goal
Open the Phase 0 planning card for the importer route guard that only trusts canonical scope sections and subtracts outOfScope / forbidden surfaces before routing.

## Background
0118 and 0119 already route to AAF, but the importer is leaking path-like strings from task card prose into targetAllowedFiles.
That is a system-level scope extraction bug, not a wording problem in a single card.

This card isolates the routing defense:
- trust canonical scope sections only
- subtract outOfScope and forbidden surfaces
- keep prose path-like strings from expanding allowed scope

This is Phase 0 planning work in 3KLife only.
It does not implement importer source changes yet, and it does not fold in runner sync or commit guard implementation.

## Acceptance Criteria
- Route-visible extraction uses canonical scope sections only.
- outOfScope and forbidden surfaces are subtracted before importer routing.
- Prose path-like strings do not expand targetAllowedFiles.
- The card stays in Phase 0 and only updates the task card, tasks-atm ledger, and shard.
- 0118 and 0119 remain context only.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts`
- focused route-scope tests only if already available or clearly needed

## Phase 1 Forbidden Surfaces
- Runner sync surfaces
- Commit guard implementation surfaces
- Release artifacts
- Scratch or runtime noise
- Any prose expansion that turns descriptive paths into allowed scope

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0120-section-aware-task-card-scope-extraction-and-outOfScope-subtraction.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`

## Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/**`
- `C:/Users/User/3KLife/.atm/**`
- `C:/Users/User/3KLife/.tmp/**`
- `C:/Users/User/3KLife/examples/**`

## Validators
- Canonical scope sections must be the only route-visible source of truth.
- outOfScope and forbidden surfaces must be subtracted before promotion into targetAllowedFiles.
- Prose path-like strings must not widen the allowed surface.
- Route-visible scope summary must match the canonical section set.

## Plain-language Anchor
This card only fixes navigation for the importer.
It does not repair TASK-AAO-0118 or TASK-AAO-0119, and it does not add importer source logic yet.
