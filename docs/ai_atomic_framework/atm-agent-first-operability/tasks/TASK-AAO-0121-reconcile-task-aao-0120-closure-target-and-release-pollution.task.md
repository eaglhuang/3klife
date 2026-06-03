---
doc_id: ""
task_id: TASK-AAO-0121
title: "reconcile TASK-AAO-0120 closure target and release pollution"
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
executionMode: phase0-reconcile-task-aao-0120-closure-target-and-release-pollution
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0121-reconcile-task-aao-0120-closure-target-and-release-pollution.task.md
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
  - "Do not rewrite TASK-AAO-0120 source."
  - "Do not touch TASK-AAO-0120 importer implementation files."
  - "Do not stage or commit unrelated dirty or untracked files."
notes: "2026-06-03 | status: open | validation: pending | change: Phase 0 open card for 0120 cleanup and reconciliation | blocker: release pollution / closure pollution | risk: closure packet and onefile artifacts drift"
---

# TASK-AAO-0121 reconcile TASK-AAO-0120 closure target and release pollution

## Goal
Open the Phase 0 planning card that reconciles TASK-AAO-0120 closure target and release pollution without reworking 0120 source.

## Background
TASK-AAO-0120 source functionality is already landed, but the closure target is not clean and the release onefile surface is polluted.
This card only reconciles closure, evidence, and release hygiene.
It does not rewrite TASK-AAO-0120 source and does not touch TASK-AAO-0120 importer implementation files.

TASK-AAO-0121 depends on TASK-AAO-0120 for sequencing.
If scratch or `.playwright-mcp` noise needs a broader sweep, open a separate evidence-hygiene card.

## Acceptance Criteria
- Only release onefile pollution and TASK-AAO-0120 closure/evidence pollution are addressed.
- TASK-AAO-0120 source is not rewritten.
- TASK-AAO-0120 importer implementation files are not touched.
- Broader scratch or `.playwright-mcp` cleanup is not folded into this card.
- This card stays in 3KLife Phase 0 and only updates the task card, tasks-atm ledger, and shard.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/release/atm-onefile/README.onefile.md`
- `C:/Users/User/AI-Atomic-Framework/release/atm-onefile/atm.mjs`
- `C:/Users/User/AI-Atomic-Framework/release/atm-onefile/release-manifest.json`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/evidence/TASK-AAO-0120.closure-packet.json`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/evidence/TASK-AAO-0120.json`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-AAO-0120/**`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-AAO-0120.json`

## Phase 1 Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-direction-governance.ts`
- `C:/Users/User/AI-Atomic-Framework/scratch/**`
- `C:/Users/User/AI-Atomic-Framework/.playwright-mcp/**`

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0121-reconcile-task-aao-0120-closure-target-and-release-pollution.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`

## Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/**`
- `C:/Users/User/3KLife/.atm/**`
- `C:/Users/User/3KLife/.tmp/**`
- `C:/Users/User/3KLife/examples/**`

## Validators
- Closure evidence must stay separate from 0120 source rewrites.
- Release pollution must stay isolated from unrelated scratch or runtime noise.
- Broader noisy sweeps must be split into a separate evidence-hygiene card.

## Plain-language Anchor
This card only cleans up the closure and release paperwork for TASK-AAO-0120.
It does not repair the 0120 source or the importer implementation.
