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
  - AI-Atomic-Framework source tree
  - TASK-AAO-0112 closure packet task card
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
- Close-time dirty-tree / changedFiles assembly surface in the framework-development path.
- Task lifecycle / close entry surface in the tasks command path.
- Ledger governance regression validator surface.
- Command-level regression surface only if route-visible regression coverage is needed.

## Phase 1 Forbidden Files
- Release onefile surfaces.
- TASK-AAO-0120 and TASK-AAO-0121 evidence / history / task-event surfaces.
- Prompt-scoped next route surface.
- Task-direction route surface.
- Git-head evidence validator surface.
- Scratch or runtime noise surfaces.
- Playwright MCP runtime noise surfaces.

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0114-closure-packet-dirty-tree-hygiene-guard.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`

## Forbidden Files
- `AI-Atomic-Framework source tree`
- `TASK-AAO-0112 closure packet task card`

## Validators
- `node atm.mjs next --prompt "TASK-AAO-0114" --json`
- `node scripts/validate-task-ledger-governance.ts`
- `node atm.mjs doctor --json`

## Plain-language Anchor
This card only installs the "check the trunk for trash before closing the car" rule.
It does not ask us to throw the trash away right now, and it does not reopen old closure packets or release cleanup work.
