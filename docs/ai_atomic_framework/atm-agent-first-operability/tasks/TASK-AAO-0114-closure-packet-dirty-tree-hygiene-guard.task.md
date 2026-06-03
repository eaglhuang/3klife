---
doc_id: ""
task_id: TASK-AAO-0114
title: "closure packet dirty/untracked evidence hygiene guard"
milestone: M16
status: in-progress
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: "2026-06-03T13:51:40.7441685+08:00"
started_by_agent: "codex-gpt-5.4-mini"
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-closure-packet-dirty-tree-hygiene-guard
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0114-closure-packet-dirty-tree-hygiene-guard.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/**
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0112-*.task.md
non_goals:
  - "Do not mutate AAF source files."
  - "Do not touch the TASK-AAO-0112 closure packet."
  - "Do not clear or delete scratch / untracked files."
  - "Do not treat unrelated untracked noise as a task deliverable."
  - "Do not stage or commit unrelated dirty files."
notes: "2026-06-03 | status: in-progress | validation: pending | change: scope amended to pre-close dirty-tree / untracked evidence hygiene guard | blocker: none | risk: evidence hygiene / dirty-tree drift"
---

# TASK-AAO-0114 closure packet dirty/untracked evidence hygiene guard

## Goal
Open the formal Phase 0 planning card for a pre-close dirty-tree / untracked evidence hygiene guard and pin the close-time evidence rules before any AAF source audit.

## Background
TASK-AAO-0112 passed functional acceptance, but its closure packet was polluted by existing untracked and scratch noise in the working tree.
That does not imply commit contamination, but it does make the evidence harder to read, harder to review, and less trustworthy.
This card only defines the pre-close guard.
If a closure packet already needs repair, that work belongs on a separate card.

This card only creates the planning anchor for the close boundary.
It does not clean the tree, delete noise, repair an existing closure packet, or touch the AAF source.

## Phase 1 Scope
- targetRepo: `AI-Atomic-Framework`
- closure_authority: `target_repo`
- Before close / closure packet generation, inspect dirty tracked files and untracked noise.
- Ensure `changedFiles` in the closure packet is not polluted by unrelated untracked files.
- Allow the workflow to report noise, but do not promote noise into the task deliverable set.
- Keep this as a pre-close guard / hygiene rule, not a repair task, a release cleanup task, or a history cleanup task.
- Existing closure packet repair stays on a separate card.

## Acceptance Case
- The close pipeline can distinguish true deliverables from unrelated working-tree noise before evidence is emitted.
- The closure packet stays readable and auditable even when the tree has pre-existing scratch files.
- The card remains planning-only in Phase 0; no AAF source mutation happens yet.
- Existing closure packet repair, release cleanup, and history cleanup are explicitly out of scope.

## Acceptance Criteria
- Close / closure packet generation checks dirty tracked and untracked noise before emitting evidence.
- `changedFiles` excludes unrelated untracked files.
- Noise may be reported, but it must not be counted as a deliverable.
- Existing closure packet repair is handled by another card, not this one.
- Phase 0 does not touch AAF source files.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/tasks.spec.ts` only if command-level regression is needed.

## Phase 1 Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/release/atm-onefile/**`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/evidence/TASK-AAO-0120.*`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/evidence/TASK-AAO-0121.*`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-AAO-0120.json`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/tasks/TASK-AAO-0121.json`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-AAO-0120/**`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/task-events/TASK-AAO-0121/**`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-git-head-evidence.ts`
- `C:/Users/User/AI-Atomic-Framework/scratch/**`
- `C:/Users/User/AI-Atomic-Framework/.playwright-mcp/**`

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0114-closure-packet-dirty-tree-hygiene-guard.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`

## Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/**`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0112-*.task.md`

## Validators
- `node atm.mjs next --prompt "TASK-AAO-0114" --json`
- `node scripts/validate-task-ledger-governance.ts`
- `node atm.mjs doctor --json`

## Plain-language Anchor
This card only installs the "check the trunk for trash before closing the car" rule.
It does not ask us to throw the trash away right now, and it does not reopen old closure packets or release cleanup work.
