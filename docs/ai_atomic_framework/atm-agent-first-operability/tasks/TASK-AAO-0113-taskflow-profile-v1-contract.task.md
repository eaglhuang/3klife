---
doc_id: ""
task_id: TASK-AAO-0113
title: "taskflow.profile.v1 contract"
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
executionMode: phase0-taskflow-profile-v1-contract
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0113-taskflow-profile-v1-contract.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/**
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0112-*.task.md
non_goals:
  - "Do not mutate AAF source files."
  - "Do not implement a second lifecycle."
  - "Do not write task card, ledger, or shard from dry-run mode."
  - "Do not mirror claim or close status."
  - "Do not touch TASK-AAO-0112."
  - "Do not stage or commit unrelated dirty files."
notes: "2026-06-02 | status: open | validation: pending | change: Phase 0 open card for taskflow.profile.v1 contract route | blocker: none | risk: profile contract drift"
---

# TASK-AAO-0113 taskflow.profile.v1 contract

## Goal
Open the formal Phase 0 planning card for the taskflow.profile.v1 contract and pin the target-repo profile shape for taskflow open dry-run.

## Background
TASK-AAO-0112 gave us a dry-run skeleton, but it still emits a fixed shell.
The next step is to teach ATM how to read a repo profile so each project opener can advertise its capability surface and delegation entry point.

This card only defines the contract and planning ledger.
It does not implement AAF source.

## Phase 1 Scope
- targetRepo: `AI-Atomic-Framework`
- closure_authority: `target_repo`
- Define `taskflow.profile.v1`.
- Let `taskflow open --dry-run` read repo profile metadata.
- Profile only describes capabilities and delegation entry.
- Do not write task card, ledger, or shard from the profile layer.
- Do not create a second lifecycle.
- Do not create a second writer.

## Acceptance Case
- `TASK-AAO-0112` remains the prerequisite skeleton route.
- The AAF implementation card must point at the target repo, not at the planning repo.
- The contract must describe how the opener is selected and how capabilities are surfaced.

## Acceptance Criteria
- `node atm.mjs taskflow open --dry-run --json` can resolve repo profile and emit a dry-run report.
- The report can surface `taskflow.profile.v1` capability and delegation-entry metadata.
- The profile layer does not write task card, ledger, or shard files.
- `--write` must explicitly refuse on this route.
- The profile layer does not create a second lifecycle or second writer.
- Dry-run mode does not touch claim or close lifecycle.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/taskflow.spec.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/atm.ts`
- Focused schema or test files, if needed, must be proposed explicitly before widening scope.

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0113-taskflow-profile-v1-contract.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md`

## Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/**`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0112-*.task.md`

## Validators
- `node atm.mjs taskflow open --dry-run --json`
- `node atm.mjs taskflow open --write --json`
- `git diff --check`

## Plain-language Anchor
This card only draws the profile contract blueprints. It does not start building the house.
