---
doc_id: ""
task_id: TASK-AAO-0112
title: "AAF taskflow dry-run skeleton"
milestone: M16
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: applied
started_at: "2026-06-19T16:05:00+08:00"
started_by_agent: "cursor-gpt-5.2"
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-taskflow-dry-run-skeleton
planning_repo: 3KLife
closure_authority: target_repo
depends_on:
  - TASK-AAO-0111
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs.ts"
  - "packages/cli/src/atm.ts"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs.ts"
  - "packages/cli/src/atm.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
targetAllowedFiles:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs.ts"
  - "packages/cli/src/atm.ts"
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0112-atm-taskflow-dry-run-skeleton.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-12.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/batch.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/lock.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/status.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/review.ts
  - C:/Users/User/AI-Atomic-Framework/.atm/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - C:/Users/User/AI-Atomic-Framework/docs/**
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0111-*.task.md
non_goals:
  - "Do not mutate AAF source files outside the explicit allowed_files whitelist."
  - "Do not claim or close any AAF task lifecycle."
  - "Do not let the macro become a second writer."
  - "Do not write the task card, ledger, or shard from dry-run mode."
  - "Do not touch unrelated shard files."
  - "Do not stage or commit unrelated dirty files."
notes: "2026-06-19 | status: done | validation: pass | change: governance close historical delivery 04d67737f target b0174a95f | blocker: none"
completed_at: "2026-06-19T14:27:30.415Z"
completed_by_agent: "cursor-gpt-5.2"
lastTransitionId: "2026-06-19T14-27-29-219Z-close-6c065f0b53bf"
delivery_commit: "04d67737f"
---

# TASK-AAO-0112 AAF taskflow dry-run skeleton

## Goal
Open the formal Phase 0 planning card for the AAF taskflow dry-run skeleton and pin the Phase 1 target-repo implementation contract.

## Background
The 004 / 005 / 006 / 007 decisions converged on C plan: AAF taskflow macro + 3KLife profile adapter.
This card is the formal AAF target-repo Phase 1 implementation card, but the current turn is still Phase 0 planning work in 3KLife.

The macro must never become a second writer.
All writes remain delegated to the repo-profile specified opener.
Dry-run mode must stay read-only for task card, ledger, and shard files.

## Phase 1 Scope
- targetRepo: `AI-Atomic-Framework`
- closure_authority: `target_repo`
- Implement the dry-run skeleton only.
- `node atm.mjs taskflow open --dry-run --json` must emit a dry-run report.
- `--write` must explicitly refuse.
- Do not touch claim or close lifecycle.
- Do not add any second-writer path in the macro.

## Acceptance Case
- `TASK-AAO-0111` is the planning permit anchor for this route.
- The AAF work card must point at the target repo, not at the planning repo.
- The Phase 1 implementation surface is limited to the explicit whitelist below.

## Acceptance Criteria
- `node atm.mjs taskflow open --dry-run --json` can emit a dry-run report.
- `--write` must explicitly refuse.
- Dry-run mode must not write the task card, ledger, or shard files.
- Dry-run mode must not touch claim or close lifecycle.
- The macro must not become a second writer; writes must remain delegated to the repo-profile specified opener.

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0112-atm-taskflow-dry-run-skeleton.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/taskflow.spec.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/atm.ts`

## Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/batch.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/lock.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/status.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/review.ts`
- `C:/Users/User/AI-Atomic-Framework/.atm/**`
- `C:/Users/User/AI-Atomic-Framework/release/**`
- `C:/Users/User/AI-Atomic-Framework/docs/**`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0111-*.task.md`

## Validators
- `node atm.mjs taskflow open --dry-run --json`
- `node atm.mjs taskflow open --write --json`
- `git diff --check`

## Plain-language Anchor
This card only prepares the AAF construction contract. It does not start digging into AAF code outside the whitelist.
