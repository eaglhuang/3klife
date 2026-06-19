---
doc_id: ""
task_id: TASK-AAO-0111
title: "ATM taskflow dry-run orchestrator"
milestone: M16
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: applied
started_at: "2026-06-19T16:00:00+08:00"
started_by_agent: "cursor-gpt-5.2"
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-taskflow-dry-run-orchestrator
planning_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0111-atm-taskflow-dry-run-orchestrator.task.md"
  - "docs/tasks/tasks-atm.json"
  - "docs/tasks/tasks-atm/tasks-atm-part-27.json"
deliverables:
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0111-atm-taskflow-dry-run-orchestrator.task.md"
  - "docs/tasks/tasks-atm.json"
  - "docs/tasks/tasks-atm/tasks-atm-part-27.json"
validators:
  - "git diff --check"
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0111-atm-taskflow-dry-run-orchestrator.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/**
non_goals:
  - "Do not mutate AAF source files in this card."
  - "Do not claim or close any AAF task lifecycle."
  - "Do not add AAF taskflow code."
  - "Do not make the macro a second writer."
  - "Do not touch unrelated shard files."
  - "Do not stage or commit unrelated dirty files."
notes: "2026-06-19 | status: done | validation: passed | change: Phase 0 planning anchor closed; C-plan route locked | blocker: none"
completed_at: "2026-06-19T08:00:00+08:00"
completed_by_agent: "cursor-gpt-5.2"
---

# TASK-AAO-0111 ATM taskflow dry-run orchestrator

## Goal
Open the formal Phase 0 planning card for the ATM taskflow dry-run orchestrator and lock in the C-plan routing decision.

## Background
The 001-007 analysis has converged:
- C plan = AAF taskflow macro + 3KLife profile adapter.
- Phase 1 is dry-run orchestrator only.
- The macro must not become a second writer.
- All writes remain delegated to the repo-profile specified opener.

Phase 0 only creates the governance anchor and planning ledger entry. It does not touch AAF source.

## Acceptance Case
- Route decision: C plan.
- Phase 1 scope: dry-run orchestrator only.
- Writer model: delegated opener only, never a second writer.
- Lifecycle scope: planning only; no claim/close action.

## Acceptance Criteria
- `node atm.mjs taskflow open --dry-run --json` can emit a dry-run report.
- `--write` must explicitly refuse.
- Dry-run mode must not write the task card, ledger, or shard files.
- Dry-run mode must not touch claim or close lifecycle.
- The macro must not become a second writer; writes must remain delegated to the repo-profile specified opener.

## Out of Scope
- Do not touch AAF source files.
- Do not claim an AAF task.
- Do not add AAF taskflow code.
- Do not mutate unrelated shard files.
- Do not stage or commit unrelated dirty files.

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0111-atm-taskflow-dry-run-orchestrator.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`

## Forbidden
- `C:/Users/User/AI-Atomic-Framework/**`

## Validators
- `node atm.mjs taskflow open --dry-run --json`
- `node atm.mjs taskflow open --write --json`
- `git diff --check`

## Plain-language Anchor
This card only gets the permit ready. It does not dig up the AAF road.
