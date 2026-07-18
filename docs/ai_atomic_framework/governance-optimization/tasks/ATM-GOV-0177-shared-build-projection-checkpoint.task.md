---
task_id: ATM-GOV-0177
title: Shared Build/Projection Executor and Atomic Wave Checkpoint
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0172
  - ATM-GOV-0173
  - ATM-GOV-0174
  - ATM-GOV-0175
  - ATM-GOV-0176
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  ATM-GOV-0176 delivered the shared commit receipt/executor. This card uses the
  next planned GOV slot to finish shared generated-write execution and atomic
  checkpoint integration for the approved Batch -> Team Wave -> Broker ->
  Checkpoint pipeline.
scopePaths:
  - packages/cli/src/commands/broker/**
  - packages/cli/src/commands/batch/**
  - packages/cli/src/commands/batch.ts
  - packages/cli/src/commands/command-specs/broker.spec.ts
  - packages/cli/src/commands/command-specs/batch.spec.ts
  - packages/core/src/broker/wave-generated-executor.ts
  - packages/core/src/broker/wave-broker-scheduler.ts
  - packages/core/src/broker/shared-delivery-commit.ts
  - packages/core/src/broker/index.ts
  - tests/cli/shared-build-projection-checkpoint.test.ts
  - tests/cli-fixtures/help-snapshots/broker.json
  - tests/cli-fixtures/help-snapshots/batch.json
  - docs/governance/command-surface.md
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - .atm/history/evidence/ATM-GOV-0177.*
  - .atm/history/task-events/ATM-GOV-0177/**
  - .atm/history/tasks/ATM-GOV-0177.json
deliverables:
  - packages/core/src/broker/wave-generated-executor.ts
  - packages/cli/src/commands/broker/**
  - packages/cli/src/commands/batch/**
  - tests/cli/shared-build-projection-checkpoint.test.ts
  - docs/governance/command-surface.md
validators:
  - node --strip-types tests/cli/shared-build-projection-checkpoint.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.shared-build-projection-checkpoint
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.shared-build-projection-checkpoint
      pattern: Shared Generated Write Executor Policy Object
      source: packages/core/src/broker/wave-generated-executor.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-e2e-2026-07
surfaceFamily: shared-generated-writes
completed_at: "2026-07-18T18:49:24.389Z"
completed_by_agent: "codex-gov-auto-batch"
closedAt: "2026-07-18T18:49:24.389Z"
closedByActor: "codex-gov-auto-batch"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T18-49-24-389Z-close-3b61a1e75052"
lastTransitionAt: "2026-07-18T18:49:24.389Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "99e6822951940990c6b77f7c715aa67cf1870a0f"
---

# ATM-GOV-0177 - Shared Build/Projection Executor and Atomic Wave Checkpoint

## Context

The approved product model is: Batch selects cards, Team Wave does the work,
Broker batches shared writes, and Checkpoint closes tasks. ATM-GOV-0176 now
validates broker-owned shared delivery commit receipts. This card adds shared
build/projection receipts and the atomic wave checkpoint readiness gate so a
wave cannot close until every member has the required delivery/generated-write
evidence.

## Required Behavior

- Add shared generated-write planning for build and projection surfaces, using
  durable scheduler decisions from ATM-GOV-0175.
- When inputs are compatible, produce one build receipt and one projection
  receipt per wave rather than per task.
- Fan out receipts to member task evidence references through deterministic
  `atm.waveGeneratedWriteReceipt.v1` records.
- Reuse content-addressed build-skip signals when the sealed source and surface
  digests prove the output is unchanged.
- Add `batch checkpoint --wave <id>` or equivalent checkpoint-readiness logic
  that requires delivery, build, and projection receipts for every member before
  close integration proceeds.
- Planning closeback must remain compare-and-swap safe; if closeback cannot be
  proven, emit reconcile-required evidence rather than silently mutating stale
  planning state.

## Acceptance

- Command-backed test covers compatible build/projection coalescing, content
  addressed skip, receipt fan-out, missing member receipt rejection, checkpoint
  readiness, serial fallback, and reconcile-required planning closeback.
- Typecheck and CLI validation pass.
- No branch workflow is introduced; all commits remain on `main`.
- The card closes with target ledger/evidence and planning-source updates.
