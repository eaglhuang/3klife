---
doc_id: ""
task_id: TASK-AAO-0119
title: "frozen runner alignment for ATM_RUNNER_SYNC_REQUIRED"
milestone: M16
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: applied
started_at: "2026-06-18T15:45:00+08:00"
started_by_agent: "cursor-gpt-5.2"
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-frozen-runner-alignment-for-atm-runner-sync-required
planning_repo: 3KLife
closure_authority: target_repo
depends_on: []
scopePaths:
  - "release/atm-onefile/atm.mjs"
deliverables:
  - "release/atm-onefile/atm.mjs"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
targetAllowedFiles:
  - "release/atm-onefile/atm.mjs"
forbidden_files:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/**"
  - "packages/core/src/**"
  - "scratch/**"
  - ".playwright-mcp/**"
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0119-frozen-runner-alignment-for-atm-runner-sync-required.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json
non_goals:
  - "Do not mutate AAF source files."
  - "Do not implement commit guard source logic in this card."
  - "Do not stage or commit unrelated dirty or untracked files."
notes: "2026-06-02 | status: open | validation: pending | change: Phase 0 open card for frozen runner alignment for ATM_RUNNER_SYNC_REQUIRED | blocker: ATM_RUNNER_SYNC_REQUIRED | risk: runner/source drift"
completed_at: "2026-06-18T15:51:20.582Z"
completed_by_agent: "cursor-gpt-5.2"
lastTransitionId: "2026-06-18T15-51-19-859Z-close-90d7ae1a6fa7"
delivery_commit: "ae15e9869"
---

# TASK-AAO-0119 frozen runner alignment for ATM_RUNNER_SYNC_REQUIRED

## Goal
Open the Phase 0 planning card for frozen runner alignment so the `ATM_RUNNER_SYNC_REQUIRED` blocker is tracked before TASK-AAO-0118 implementation begins.

## Background
AAF currently reports `ATM_RUNNER_SYNC_REQUIRED`, which means the frozen runner and source are out of sync.
Captain's ruling is that this alignment work must be split out as TASK-AAO-0119, because runner sync is a precondition for 0118 but is not the same thing as commit guard source implementation.

This card stays in 3KLife Phase 0 only.
It does not mutate AAF source files and it does not implement commit guard source logic.

## Acceptance Criteria
- The card clearly records that frozen runner alignment is the precondition for TASK-AAO-0118.
- The card stays within 3KLife Phase 0 and only updates the task card, tasks-atm ledger, and shard.
- The card does not implement commit guard source logic.
- The card does not touch AAF source files in this turn.
- TASK-AAO-0118 remains a downstream follow-up and is not merged into this card.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/dist/**`
- `C:/Users/User/AI-Atomic-Framework/release/atm-onefile/**`
- `C:/Users/User/AI-Atomic-Framework/release/atm-root-drop/**`

## Phase 1 Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/git-governance.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/hook.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/git.spec.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/scratch/**`
- `C:/Users/User/AI-Atomic-Framework/.playwright-mcp/**`

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0119-frozen-runner-alignment-for-atm-runner-sync-required.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`

## Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/**`
- `C:/Users/User/3KLife/.atm/**`
- `C:/Users/User/3KLife/.tmp/**`
- `C:/Users/User/3KLife/examples/**`

## Validators
- `git diff --check`
- `git diff --name-status`
- `npm run typecheck`
- `npm run validate:cli`

## Plain-language Anchor
This card only opens the "align the frozen runner" work order.
It does not perform the alignment yet, and it does not add commit guard source logic.
