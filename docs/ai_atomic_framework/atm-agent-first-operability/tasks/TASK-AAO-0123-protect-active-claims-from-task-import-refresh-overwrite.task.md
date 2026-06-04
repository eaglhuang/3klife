---
doc_id: ""
task_id: TASK-AAO-0123
title: "protect active claims from task import refresh overwrite"
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
executionMode: phase0-protect-active-claims-from-task-import-refresh-overwrite
planning_repo: 3KLife
closure_authority: target_repo
related: []
depends: []
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0123-protect-active-claims-from-task-import-refresh-overwrite.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/**
  - C:/Users/User/3KLife/.atm/**
  - C:/Users/User/3KLife/.tmp/**
  - C:/Users/User/3KLife/examples/**
non_goals:
  - "Do not mutate AAF source in Phase 0."
  - "Do not continue TEAM import commit while active claims remain vulnerable."
  - "Do not repair TASK-AAO-0113 evidence in this card."
  - "Do not reuse TASK-AAO-0122 repair-closure implementation surfaces here."
  - "Do not stage or commit unrelated dirty files."
notes: "2026-06-04 | status: open | validation: pending | change: Phase 0 open card for active-claim import refresh guard | blocker: import write path can overwrite running/owner/startedAt/taskDirectionLock | risk: task import refresh regression"
---

# TASK-AAO-0123 protect active claims from task import refresh overwrite

## Goal
Open the Phase 0 planning card for the ATM task import refresh bug that must preserve active claims and their lock state.

## Background
`tasks import --write` and `tasks import --force` must not overwrite an active claim, running status, owner, startedAt, or `taskDirectionLock`.
The route check itself must stay read-only; if it suggests an import write path, it must surface an unsafe warning or blocked guidance instead of silently green-lighting the write.
This is a toolchain gap, not a one-off operator mistake.
Phase 0 only opens the planning card and keeps AAF source untouched.

## Phase 0 Scope
- Keep this card in 3KLife only.
- Update only the 3KLife planning ledger and shard.
- Do not touch AAF source in this turn.
- Do not continue TEAM import commit while active claims are still vulnerable.
- Keep this issue separate from TASK-AAO-0113 evidence repair and TASK-AAO-0122 protected-state commit context alignment.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts` only if claim-lock interpretation is needed
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-import.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts`
- focused tests / fixtures only if needed

## Phase 1 Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/.atm/history/**`
- `C:/Users/User/AI-Atomic-Framework/release/**`
- `C:/Users/User/AI-Atomic-Framework/scratch/**`
- `C:/Users/User/AI-Atomic-Framework/.playwright-mcp/**`
- TASK-AAO-0113 evidence repair
- TASK-AAO-0122 repair-closure implementation
- TEAM import runtime commits / manual cleanup

## Validators
- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`
- `node tools_node/check-doc-shard-health.js`
- `node atm.mjs next --prompt "TASK-AAO-0123" --json`
- `npm run validate:cli`
- `npm run typecheck`
- `node --strip-types scripts/validate-task-import.ts --mode validate`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`

## Rollback Hint
If the import refresh guard proves broader than the Phase 1 candidate files, keep the 0123 planning card open and split the unsafe warning / blocked-guidance work into a follow-up card.
Revert only the 0123 card and its ledger/shard updates if the opener or validator metadata becomes inconsistent.
Do not touch AAF source while reverting the planning-card layer.

## Plain-language Anchor
This card adds a safety latch so import refresh cannot repaint a parking space that is already occupied.
It does not continue TEAM import work, and it does not repair TASK-AAO-0113 or TASK-AAO-0122.
