---
task_id: TASK-LANE-0012
title: Lane claim stamping and direction metadata
status: done
owner: atm-core
priority: P0
depends_on:
  - TASK-LANE-0011
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/lane-session/resolve.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/next/claim-helpers.ts
  - packages/cli/src/commands/task-direction.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/tasks/claim-preparation.ts
  - packages/cli/src/commands/tasks/task-transition-helpers.ts
  - packages/cli/src/commands/tasks/task-ledger-readers.ts
  - packages/cli/src/commands/tasks/__tests__/lifecycle-state.test.ts
deliverables:
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/task-direction.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/tasks/task-transition-helpers.ts
validators:
  - node --strip-types packages/cli/src/commands/tasks/__tests__/lifecycle-state.test.ts
  - node --strip-types tests/cli/cli-result-contract.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert lane fields on claim, work-session linkage, and task direction metadata while preserving actor-only fallback.
atomizationImpact:
  ownerAtomOrMap: atm.task-claim-lifecycle
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.lane-claim-stamping
      pattern: Policy Object
      source: packages/cli/src/commands/next/claim-orchestration.ts
      disposition: follow-up-card
      inlineReason: null
    - atom: atm.task-direction-lane-metadata
      pattern: Policy Object
      source: packages/cli/src/commands/task-direction.ts
      disposition: follow-up-card
      inlineReason: null
outOfScope:
  - commit attribution
  - lane adoption command semantics
  - framework temp lock ownership changes
  - broker conflict policy changes
nonGoals:
  - Do not migrate historical legacy task records.
  - Do not remove actor id from claim records.
completed_at: "2026-07-16T17:32:44.844Z"
completed_by_agent: "codex-lane-0012"
closedAt: "2026-07-16T17:32:44.844Z"
closedByActor: "codex-lane-0012"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T17-32-44-844Z-close-70d13bb83dd9"
lastTransitionAt: "2026-07-16T17:32:44.844Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "5a4bc4d472bb9d773406e59082740cb884b449ac"
---

# TASK-LANE-0012 - Lane Claim Stamping and Direction Metadata

## Goal

When a governed task is claimed after `TASK-LANE-0011`, stamp the active lane
session id into the claim record, the guidance/work-session linkage, and the
task direction metadata. Actor id remains required metadata for attribution, but
future ownership checks need durable lane fields to compare.

## Acceptance

- A claim made with `ATM_LANE_SESSION_ID` records `laneSessionId` on the active
  claim and task direction lock.
- A claim made without `ATM_LANE_SESSION_ID` lazily resolves or mints a lane
  through the same resolution helper used by `atm lane status`.
- Existing actor-only tasks remain readable and closeable through legacy
  fallback.
- Work-session records expose the lane id without changing the meaning of
  `guidanceSessionId`.
- JSON output for claim-related routes may include the optional top-level
  `laneSession` envelope when a lane is resolved.
- Focused tests cover lane-stamped claim metadata and actor-only legacy fallback.

## Notes

This card only records lane metadata. It does not yet make conflict decisions
compare lane ids; that policy lands in `TASK-LANE-0017`.
