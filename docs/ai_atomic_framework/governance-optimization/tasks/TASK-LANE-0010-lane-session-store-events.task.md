---
task_id: TASK-LANE-0010
title: Lane session store and event stream
status: planned
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/lane-session/store.ts
  - packages/cli/src/commands/lane-session/events.ts
  - packages/cli/src/commands/lane-session/__tests__/store.spec.ts
  - packages/cli/src/commands/lane-session/__tests__/events.spec.ts
deliverables:
  - packages/cli/src/commands/lane-session/store.ts
  - packages/cli/src/commands/lane-session/events.ts
  - packages/cli/src/commands/lane-session/__tests__/store.spec.ts
  - packages/cli/src/commands/lane-session/__tests__/events.spec.ts
validators:
  - node --strip-types packages/cli/src/commands/lane-session/__tests__/store.spec.ts
  - node --strip-types packages/cli/src/commands/lane-session/__tests__/events.spec.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Remove lane-session store/events files and their tests.
atomizationImpact:
  ownerAtomOrMap: atm.lane-session-runtime
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates: []
outOfScope:
  - CLI lane command dispatch
  - claim, task direction, or broker ownership policy
  - commit attribution
nonGoals:
  - Do not modify actor work session schema for this foundation card
---

# TASK-LANE-0010 - Lane Session Store and Event Stream

## Goal

Create the durable lane-session runtime document and append-only event stream
that later cards can use for ownership, adoption, and analysis.

## Acceptance

- `atm.laneSession.v1` documents live under `.atm/runtime/lane-sessions/`.
- Lane session documents include lane id, actor id metadata, identity snapshot,
  status, timestamps, TTL, adoption source, handoff token hash, and last command.
- Atomic writes use temp-file plus rename behavior consistent with existing ATM
  runtime stores.
- Lane event files live under `.atm/history/session-events/<laneId>/`.
- Lane event ids follow the task-transition id pattern.
- Tests cover mint/read round-trip, TTL phase classification, append-only event
  order, and no temp-file residue after writes.

## Notes

Actor id in this store is metadata. No ownership policy changes should land in
this card.

