---
doc_id: ""
task_id: TASK-AAO-0122
title: "repair-closure protected-state commit context alignment"
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
executionMode: phase0-repair-closure-protected-state-commit-context-alignment
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-AAO-0113
  - TASK-AAO-0114
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0122-repair-closure-protected-state-commit-context-alignment.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/**
  - C:/Users/User/3KLife/.atm/**
  - C:/Users/User/3KLife/.tmp/**
  - C:/Users/User/3KLife/examples/**
non_goals:
  - "Do not mutate AAF source files in Phase 0."
  - "Do not treat TASK-AAO-0113 evidence repair as this card's implementation target."
  - "Do not handle push, license merge, or remote-behind-1 recovery in this card."
  - "Do not stage or commit unrelated dirty files."
notes: "2026-06-04 | status: open | validation: pending | change: Phase 0 open card for repair-closure protected-state commit context alignment | blocker: none | risk: toolchain context misalignment / protected-state pre-commit false negatives"
---

# TASK-AAO-0122 repair-closure protected-state commit context alignment

## Goal
Open the Phase 0 planning card for the repair-closure protected-state commit context alignment bug.

## Background
`tasks repair-closure` on the current HEAD can misidentify `targetCommit`, and staged evidence can fail the protected-state pre-commit when same-task task JSON or task-event context is missing.
This is a toolchain bug in ATM, not a simple operator mistake.
Phase 0 only opens the planning card and keeps AAF source untouched.

## Phase 0 Scope
- Keep this card in 3KLife only.
- Update only the 3KLife planning ledger and shard.
- Do not touch AAF source in this turn.
- Keep repair-closure context alignment separate from any TASK-AAO-0113 evidence repair or any push unblock work.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/hook.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/rescue.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/tasks.spec.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/rescue.spec.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-cli.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-git-hooks-enforcement.ts`

## Phase 1 Forbidden Files
- `.atm runtime/evidence/history repair outputs, unless produced by the validation flow.`
- `release / dist / build outputs.`
- `docs / atomic_workbench / unrelated tests.`
- `push / license merge / remote behind 1 handling.`
- `direct repair of TASK-AAO-0113 evidence as this card's implementation target.`

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0122-repair-closure-protected-state-commit-context-alignment.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`

## Forbidden Files
- `AI-Atomic-Framework source tree`
- `3KLife .atm runtime/history tree`
- `3KLife .tmp scratch tree`
- `3KLife examples tree`

## Validators
- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
- `node --strip-types scripts/validate-git-hooks-enforcement.ts`
- `git diff --check`
- `Reproduction: tasks repair-closure staged output must either include legal task context or the pre-commit must provide an explicit valid next action.`

## Plain-language Anchor
This card fixes the tool that repairs closure output.
It does not directly repair TASK-AAO-0113 evidence, and it does not handle push or LICENSE merge work.
