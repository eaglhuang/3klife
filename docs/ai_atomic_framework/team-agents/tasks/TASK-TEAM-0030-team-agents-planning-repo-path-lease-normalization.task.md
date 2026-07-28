---
doc_id: doc_team_0030
task_id: TASK-TEAM-0030
title: "Team Agents planning-repo path lease normalization"
milestone: M5P
status: done
artifact_status: finalized
runtime_status: closed-in-target-repo
upstream_mutation_status: applied
started_at: "2026-06-15T06:26:14.972Z"
started_by_agent: "codex-captain-continuation"
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
type: implementation
public_tracking: false
related:
  - ATM-BUG-2026-06-15-008
  - TASK-AAO-0124
  - TASK-AAO-0118
  - TASK-TEAM-0029
depends:
  - TASK-TEAM-0029
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/team.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/team.spec.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-team-agents.ts
  - C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json
forbidden_files:
  - C:/Users/User/3KLife/**
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - any direct runtime lock edits
completed_at: "2026-06-15T06:34:32.645Z"
closed_by_agent: "codex-captain-continuation"
team_run_id: "team-48495f14cfa8"
lastTransitionId: "2026-06-15T06-34-32-645Z-close-e2d33be6ad09"
delivery_commit: "898d97515"
evidence_commit: "e49365ef5"
closure_commit: "46264c4cc"
notes: "2026-06-15 | done | validation: validate-team-agents planning-path-lease-normalization; typecheck; validate:cli; validate:git-head-evidence | change: delivered in AI-Atomic-Framework commits 898d97515 + e49365ef5 and closed by 46264c4cc | blocker: frozen runner sync remains separate from this card"
---

# TASK-TEAM-0030 Team Agents planning-repo path lease normalization

## Goal
Fix Team Agents so planning-repo task-card paths do not become unsafe target-repo write leases when a task is imported from 3KLife into the ATM framework repo.

## Background
`TASK-AAO-0124` already fixed ATM scope comparison between absolute and relative target paths. During dogfood, Team Agents exposed a different issue: `team plan` / `team validate` / `team start` can build permission leases from planning-repo absolute paths and ask for a write lease against `C:/Users/User/3KLife/**`, even when the implementation should only write target-repo files.

That is a Team Agents planning-path classification bug, not a reason to reopen `TASK-AAO-0124`.

## Scope
- Normalize and classify planning-repo paths before Team Agents derives file-write leases.
- Keep planning docs read-only for target-repo implementation cards.
- Preserve the existing claim/dependency gate parity fixed by `TASK-TEAM-0029`.
- Keep Coordinator as the only task lifecycle and git owner.

## Acceptance
- A Team Agents regression covers a planning-repo task with absolute 3KLife paths and target-repo allowed files.
- `team validate` does not request a write lease for planning-only files when the task targets `AI-Atomic-Framework`.
- `team start` still fails closed for true unsafe target-repo writes.
- The Captain report can distinguish planning-read-only context from target write scope.
- The fix is recorded against `ATM-BUG-2026-06-15-008`.

## Validators
- `node --strip-types scripts/validate-team-agents.ts --case planning-path-lease-normalization`
- `npm run validate:cli`
- `npm run typecheck`

## Rollback Hint
Revert only the Team Agents lease-classification implementation and its matching test/map updates. Do not reopen or rewrite `TASK-AAO-0124` closure records.

## Planning Closeback
Closed in the target repo.

- Team run: `team-48495f14cfa8`
- Delivery: `898d97515`
- Evidence adjunct: `e49365ef5`
- Closure: `46264c4cc`
- Source-first evidence passed: planning path lease normalization regression, typecheck, validate:cli, validate:git-head-evidence
- Runner sync: frozen `atm.mjs` still reports `ATM_RUNNER_SYNC_REQUIRED`; handle runner-output synchronization in a separate governed card because this card forbids `release/**`.
