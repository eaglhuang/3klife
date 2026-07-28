---
task_id: TASK-LANE-0011
title: Lane command and envelope echo
status: done
owner: atm-core
priority: P0
depends_on:
  - TASK-LANE-0010
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/lane-session/resolve.ts
  - packages/cli/src/commands/lane.ts
  - packages/cli/src/commands/command-specs/lane.spec.ts
  - packages/cli/src/commands/command-specs.ts
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/shared/result-core.ts
  - tests/cli/cli-result-contract.test.ts
deliverables:
  - packages/cli/src/commands/lane-session/resolve.ts
  - packages/cli/src/commands/lane.ts
  - packages/cli/src/commands/command-specs/lane.spec.ts
  - packages/cli/src/commands/shared/result-core.ts
validators:
  - node --strip-types tests/cli/cli-result-contract.test.ts
  - node atm.mjs lane status --json
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Remove lane command dispatch, result envelope echo, and resolve helper changes.
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.lane-session-resolution
      pattern: Policy Object
      source: packages/cli/src/commands/lane-session/resolve.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - claim stamping
  - commit attribution
  - lane adoption semantics
  - framework temp lock ownership changes
nonGoals:
  - Do not add lane flags to existing claim commands during the migration phase
completed_at: "2026-07-16T17:07:38.249Z"
completed_by_agent: "codex-lane-0011"
closedAt: "2026-07-16T17:07:38.249Z"
closedByActor: "codex-lane-0011"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T17-07-38-127Z-close-1043cbf7b9d9"
lastTransitionAt: "2026-07-16T17:07:38.249Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f7a90caf1392b5d7d055c0a294ec41fef8c90661"
---

# TASK-LANE-0011 - Lane Command and Envelope Echo

## Goal

Add the user-visible `atm lane` surface and the standard JSON envelope echo for
the current lane session.

## Acceptance

- `ATM_LANE_SESSION_ID` resolves by option, env, then lazy mint.
- Lazy mint emits `ATM_LANE_SESSION_MINTED` and an export hint.
- Same-handle active lanes emit `ATM_LANE_SESSION_ADOPTABLE` with copyable
  adopt guidance, but bare flows are not blocked.
- Missing or closed env lanes emit `ATM_LANE_SESSION_STALE_ENV` and mint a new
  lane.
- Standard CLI JSON can include
  `laneSession: { laneSessionId, status, source, exportHint }`.
- `atm lane status --json` works through the frozen entrypoint.
- `cli-result-contract` is updated only if the optional envelope key is locked.

## Notes

This card creates the visible lane surface but does not change task ownership
policy. Ownership semantics land in later cards.

