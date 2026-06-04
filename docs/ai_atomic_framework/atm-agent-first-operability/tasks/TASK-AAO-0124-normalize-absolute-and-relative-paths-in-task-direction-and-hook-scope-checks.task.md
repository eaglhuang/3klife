---
doc_id: ""
task_id: TASK-AAO-0124
title: "normalize absolute and relative paths in task direction and hook scope checks"
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
executionMode: phase0-normalize-absolute-and-relative-paths-in-task-direction-and-hook-scope-checks
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-AAO-0120
  - TASK-AAO-0123
depends: []
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0124-normalize-absolute-and-relative-paths-in-task-direction-and-hook-scope-checks.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-54.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/**
  - C:/Users/User/3KLife/.atm/**
  - C:/Users/User/3KLife/.tmp/**
  - C:/Users/User/3KLife/release/**
  - scratch / .playwright-mcp / claim_out.json
  - any direct runtime lock edits
non_goals:
  - "Do not mutate AAF source in Phase 0."
  - "Do not repair 007 runtime lock hand edits."
  - "Do not repair TEAM import dirty."
  - "Do not repair TASK-AAO-0113 closure packet."
  - "Do not fold the 007 hook.ts drift remediation into this card."
notes: "2026-06-04 | status: open | validation: pending | change: Phase 0 open card for absolute/relative path scope normalization guard | blocker: none"
---

# TASK-AAO-0124 normalize absolute and relative paths in task direction and hook scope checks

## Goal
Open the Phase 0 planning card for the ATM framework bug that must normalize absolute and relative paths onto the same base before `taskDirectionLock`, `pre-commit`, `close`, and `hook` scope checks compare scope surfaces.

## Background
TASK-AAO-0123 fixed the import refresh guard that must not overwrite an active claim or its lock state.
While working that chain, we exposed a different ATM framework bug: `allowedFiles` in 3KLife task cards can be absolute paths, while git changed-files / pre-commit / close comparisons commonly work with relative paths.
When those paths are compared without normalization, legal changes can be misread as scope drift.

This card fixes the path normalization rule itself.
It is not a backdoor approval for `007` hook.ts drift, and it is not a cleanup pass for TEAM import dirty.
It also does not touch TASK-AAO-0113 closure packet repair.

## Phase 0 Scope
- Keep this card in 3KLife planning only.
- Update only the 3KLife planning card, `docs/tasks/tasks-atm.json`, the resolved shard `docs/tasks/tasks-atm/tasks-atm-part-54.json`, and `docs/tasks/tasks-atm/.shardrc.json`.
- Normalize absolute and relative paths to the same base before comparing task direction, pre-commit, close, and hook scope surfaces.
- Do not touch AAF source in this turn.
- Do not turn `007` runtime lock hand edits into this card's remediation.
- Do not fold TEAM import dirty repair into this card.
- Do not fold TASK-AAO-0113 closure packet repair into this card.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/hook.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts` only if close/closure scope comparison needs it
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-git-hooks-enforcement.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts`

## Phase 1 Forbidden Surfaces
- `.atm/runtime/**`
- `.atm/history/TASK-TEAM-*`
- TASK-AAO-0113 evidence repair
- `release/**`
- `scratch / .playwright-mcp / claim_out.json`
- any direct runtime lock edits

## Validators
### Phase 0 Planning Validators
- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`
- `node tools_node/check-doc-shard-health.js`
- Phase 1 validators stay on the card only; do not run AAF validators in Phase 0.

### Phase 1 AAF Validators
- Path normalization regression coverage for task direction, hook scope, pre-commit, and close comparison.
- task-ledger governance validation evidence.
- git hook enforcement validation evidence.
- typecheck evidence if the Phase 1 implementation needs it.

## Rollback Hint
If the card metadata or shard placement is inconsistent, revert only the 0124 planning card and its `docs/tasks/tasks-atm.json` / shard updates.
Do not touch AAF source while rolling back the planning-card layer.

## Plain-language Anchor
This card fixes ATM's ruler.
The same path must not become two different routes just because one side writes it as an absolute address and the other side writes it as a relative one.
