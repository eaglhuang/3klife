---
task_id: TASK-LANE-0014
title: Lane adoption and handoff command
status: done
owner: atm-core
priority: P0
depends_on:
  - TASK-LANE-0012
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/lane.ts
  - packages/cli/src/commands/lane-session/store.ts
  - packages/cli/src/commands/lane-session/events.ts
  - packages/cli/src/commands/lane-session/__tests__/store.spec.ts
  - packages/cli/src/commands/lane-session/__tests__/events.spec.ts
deliverables:
  - packages/cli/src/commands/lane.ts
  - packages/cli/src/commands/lane-session/store.ts
  - packages/cli/src/commands/lane-session/events.ts
validators:
  - node --strip-types packages/cli/src/commands/lane-session/__tests__/store.spec.ts
  - node --strip-types packages/cli/src/commands/lane-session/__tests__/events.spec.ts
  - node atm.mjs lane status --json
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Remove adoption and handoff verbs while retaining lane status behavior.
atomizationImpact:
  ownerAtomOrMap: atm.lane-session-runtime
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.lane-adoption-policy
      pattern: Policy Object
      source: packages/cli/src/commands/lane.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - Claim conflict policy
  - Broker lifecycle policy
nonGoals:
  - Do not implicitly adopt a lane without an explicit command.
completed_at: "2026-07-16T18:15:54.602Z"
completed_by_agent: "codex-lane-0014"
closedAt: "2026-07-16T18:15:54.602Z"
closedByActor: "codex-lane-0014"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T18-15-54-526Z-close-aac613b3103b"
lastTransitionAt: "2026-07-16T18:15:54.602Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "eef10bf7178a8bdd26a688843027de65701b01b9"
---

# TASK-LANE-0014 - Lane Adoption and Handoff Command

## Goal

Add explicit lane adoption and handoff semantics so an agent can intentionally
continue an adoptable lane after TTL, handoff, or user approval instead of
silently sharing actor identity.

## Acceptance

- `atm lane adopt <lane-id> --json` validates that the lane is adoptable before
  changing current lane state.
- Adoption writes a lane event and returns an export hint.
- Closed lanes cannot be adopted.
- Same-actor adoptable lanes remain advisory until the explicit adopt command.
- Tests cover adoptable, closed, and unknown lane cases.
