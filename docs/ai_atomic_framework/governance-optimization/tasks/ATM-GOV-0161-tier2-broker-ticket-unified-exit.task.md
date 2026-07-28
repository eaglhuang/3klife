---
task_id: ATM-GOV-0161
title: Convert Tier 2 shared-surface refusals into broker tickets
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0165
  - ATM-GOV-0158
  - ATM-GOV-0159
  - ATM-GOV-0160
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
  - packages/cli/src/commands/taskflow/broker-gate.ts
  - packages/cli/src/commands/taskflow/branch-commit-queue-gate.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/lane-session/events.ts
  - tests/cli/tier2-broker-ticket-exit.test.ts
  - docs/governance/error-code-registry.json
deliverables:
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/taskflow/broker-gate.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - tests/cli/tier2-broker-ticket-exit.test.ts
validators:
  - node --strip-types packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
  - node --strip-types tests/cli/tier2-broker-ticket-exit.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.tier2-broker-ticket-unified-exit
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.tier2-broker-ticket-result-envelope
      pattern: Result Envelope
      source: packages/cli/src/commands/taskflow/broker-gate.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-18T08:20:20.548Z"
completed_by_agent: "atm-core"
closedAt: "2026-07-18T08:20:20.548Z"
closedByActor: "atm-core"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T08-23-26-519Z-import-23cd83643f6a"
lastTransitionAt: "2026-07-18T08:20:20.548Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f3310cd32c02fab9f972a7b5ce94d6f07956d653"
---

# ATM-GOV-0161 - Convert Tier 2 Shared-Surface Refusals Into Broker Tickets

## Context

F5 implements the rule that ATM should not answer code-class Tier 2 contention
with an opaque refusal. Outside R1 same-card conflicts, shared-surface contention
should return a broker ticket: immediate execution, queue position, or batch
eligibility.

## Required Behavior

- Convert code-class Tier 2 gate exits for runner-sync non-head, build windows,
  release mirrors, and projection regeneration into a common broker ticket
  envelope:
  - `ticketId`
  - `position`
  - `headOwner`
  - `headHealth`
  - `batchEligible`
  - `enqueuedAt`
  - `waitedMs`
  - `sharedSurface`
  - `scopeClass`
- Append ticket lifecycle events to `.atm/history/session-events/<laneId>/`.
- Preserve R1 as a hard conflict: same task card second-lane claims still return
  `ATM_LOCK_CONFLICT` and do not create a ticket.
- Preserve R4: docs-only and ledger-only work do not enter this broker ticket
  path.
- Keep existing safety blockers for missing ownership, corrupt queue state, or
  invalid release artifacts; those may still fail closed with actionable error
  details.

## Acceptance Criteria

- Runner-sync queue contention returns a broker ticket envelope instead of a
  bare refusal.
- Build/release/projection shared-surface gates use the same envelope shape.
- Ticket events are visible in lane session event history.
- R1 same-card conflict still hard-refuses with `ATM_LOCK_CONFLICT`.
- Analyzer fixtures can compute total queued time from `waitedMs`.

## Validation

Run:

```shell
node --strip-types packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
node --strip-types tests/cli/tier2-broker-ticket-exit.test.ts
npm run typecheck
npm run validate:cli
```

## Rollback

Revert the implementation and tests. Existing gate-specific refusal shapes
return, reducing parallel scheduling observability.
