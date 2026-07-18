---
task_id: ATM-GOV-0175
title: Durable Broker Scheduler
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0172
  - ATM-GOV-0174
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  ATM-GOV-0168 through ATM-GOV-0171 were occupied by prerequisite safety work,
  ATM-GOV-0172 delivered the unified wave manifest, ATM-GOV-0173 delivered the
  batch wave selector, and ATM-GOV-0174 delivered the executor-neutral Team Wave
  runtime. This card uses the next free GOV slot to implement the remapped
  Durable Broker Scheduler stage from the approved end-to-end auto-batch plan.
scopePaths:
  - packages/cli/src/commands/broker/**
  - packages/cli/src/commands/broker.ts
  - packages/cli/src/commands/command-specs/broker.spec.ts
  - packages/cli/src/commands/tasks/**
  - packages/cli/src/commands/taskflow/**
  - packages/core/src/broker/wave-manifest.ts
  - packages/core/src/broker/wave-broker-scheduler.ts
  - tests/cli/durable-broker-scheduler.test.ts
  - docs/governance/command-surface.md
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - .atm/history/evidence/ATM-GOV-0175.*
  - .atm/history/task-events/ATM-GOV-0175/**
  - .atm/history/tasks/ATM-GOV-0175.json
deliverables:
  - packages/core/src/broker/wave-broker-scheduler.ts
  - packages/cli/src/commands/broker/**
  - tests/cli/durable-broker-scheduler.test.ts
  - docs/governance/command-surface.md
validators:
  - node --strip-types tests/cli/durable-broker-scheduler.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.wave-broker-scheduler
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.wave-broker-scheduler
      pattern: Scheduler Policy Object
      source: packages/core/src/broker/wave-broker-scheduler.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-e2e-2026-07
surfaceFamily: broker-scheduler
completed_at: "2026-07-18T18:10:38.909Z"
completed_by_agent: "codex-gov-auto-batch"
closedAt: "2026-07-18T18:10:38.909Z"
closedByActor: "codex-gov-auto-batch"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T18-10-38-909Z-close-0437d2712278"
lastTransitionAt: "2026-07-18T18:10:38.909Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "23be4213da9e998c45493cbb3c718aaa4545074c"
---

# ATM-GOV-0175 - Durable Broker Scheduler

## Context

The approved product model is: Batch selects cards, Team Wave does the work,
Broker batches shared writes, and Checkpoint closes tasks. ATM-GOV-0174 now
emits executor-neutral runtime records. This card makes broker scheduling durable
across task import, reservation/claim, taskflow gates, branch commit,
runner-sync, and projection queues without creating a new lifecycle.

## Required Behavior

- Carry `waveId` and `surfaceFamily` through broker scheduling records so shared
  branch commit, runner-sync, and projection queues can reason about the same
  manifest.
- Add a durable scheduler helper for broker tickets with states
  `queued/head/batched/executing/released/failed/cancelled`.
- Ticket idempotency keys must use wave/task/surface/payload digest and replay
  must not duplicate tickets.
- Same-manifest tickets can be batched only when they share compatible
  `surfaceFamily`; cross-wave tickets must remain separate.
- Expected tickets that do not arrive within the collection timeout must return
  a deterministic `reseal-or-serial-fallback` decision instead of absorbing
  unrelated work.
- Extend broker CLI help/spec docs enough for downstream executor cards to call
  the scheduler predictably.

## Acceptance

- Command-backed test covers deterministic idempotency, state transitions,
  compatible same-wave batching, cross-wave separation, and collection timeout
  fallback.
- Typecheck and CLI validation pass.
- No branch workflow is introduced; all commits remain on `main`.
- The card closes with target ledger/evidence and planning-source updates.
