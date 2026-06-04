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
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-task-import.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts
forbidden_files:
  - AAF history and runtime mutation surfaces.
  - AAF release, dist, and build outputs.
  - scratch and browser runtime noise.
  - TEAM import runtime commits or manual cleanup.
  - TASK-AAO-0113 evidence repair.
  - TASK-AAO-0122 repair-closure implementation.
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
- Keep this card in 3KLife planning only.
- Update only the 3KLife planning ledger and shard.
- The planning card, tasks-atm index, shard, and shardrc stay narrative-only and do not become route-visible AAF source scope.
- Do not touch AAF source in this turn.
- Do not continue TEAM import commit while active claims are still vulnerable.
- Keep this issue separate from TASK-AAO-0113 evidence repair and TASK-AAO-0122 protected-state commit context alignment.

## Route-Visible Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts` only if claim-lock interpretation is needed
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-import.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts`
- focused tests / fixtures only if needed

## Route-Visible Phase 1 Forbidden Surfaces
- AAF history and runtime mutation surfaces.
- AAF release, dist, and build outputs.
- scratch and browser runtime noise.
- TEAM import runtime commits or manual cleanup.
- TASK-AAO-0113 evidence repair.
- TASK-AAO-0122 repair-closure implementation.

## Validators

### Phase 0 Planning Validators
- Local encoding check on touched planning files.
- Clean diff check before commit.
- doc shard health check; if repo-wide unmanaged docs noise fails it, report the noise rather than widening scope.

### Phase 1 AAF Validators
- CLI import contract validation evidence.
- task import guard validation evidence.
- task-ledger governance validation evidence.
- typecheck evidence.
- Route check must stay read-only and must surface unsafe guidance if an import write path would overwrite an active claim or lock state.

## Rollback Hint
If the import refresh guard proves broader than the Phase 1 candidate files, keep the 0123 planning card open and split the unsafe warning / blocked-guidance work into a follow-up card.
Revert only the 0123 card and its ledger/shard updates if the opener or validator metadata becomes inconsistent.
Do not touch AAF source while reverting the planning-card layer.

## Plain-language Anchor
This card adds a safety latch so import refresh cannot repaint a parking space that is already occupied.
It does not continue TEAM import work, and it does not repair TASK-AAO-0113 or TASK-AAO-0122.
