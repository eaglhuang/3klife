---
task_id: ATM-GOV-0176
title: Shared Delivery Commit Executor
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0172
  - ATM-GOV-0173
  - ATM-GOV-0174
  - ATM-GOV-0175
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  ATM-GOV-0172 through ATM-GOV-0175 delivered the shared wave manifest,
  selector, executor-neutral runtime, and durable broker scheduler. This card
  uses the next planned GOV slot for the shared delivery commit executor stage
  in the approved Batch -> Team Wave -> Broker -> Checkpoint product pipeline.
scopePaths:
  - packages/cli/src/commands/broker/**
  - packages/cli/src/commands/broker.ts
  - packages/cli/src/commands/command-specs/broker.spec.ts
  - packages/core/src/broker/wave-broker-scheduler.ts
  - packages/core/src/broker/wave-manifest.ts
  - packages/core/src/broker/shared-delivery-commit.ts
  - tests/cli/shared-delivery-commit-executor.test.ts
  - docs/governance/command-surface.md
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - .atm/history/evidence/ATM-GOV-0176.*
  - .atm/history/task-events/ATM-GOV-0176/**
  - .atm/history/tasks/ATM-GOV-0176.json
deliverables:
  - packages/core/src/broker/shared-delivery-commit.ts
  - packages/cli/src/commands/broker/**
  - tests/cli/shared-delivery-commit-executor.test.ts
  - docs/governance/command-surface.md
validators:
  - node --strip-types tests/cli/shared-delivery-commit-executor.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.shared-delivery-commit-executor
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.shared-delivery-commit-executor
      pattern: Shared Write Executor Policy Object
      source: packages/core/src/broker/shared-delivery-commit.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-e2e-2026-07
surfaceFamily: shared-delivery-commit
completed_at: "2026-07-18T18:30:41.924Z"
completed_by_agent: "codex-gov-auto-batch"
closedAt: "2026-07-18T18:30:41.924Z"
closedByActor: "codex-gov-auto-batch"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T18-30-41-657Z-close-8eb89a788ec9"
lastTransitionAt: "2026-07-18T18:30:41.924Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2c6943c18d7c0ccb956397218d7714a8918f77a4"
---

# ATM-GOV-0176 - Shared Delivery Commit Executor

## Context

The approved product model is: Batch selects cards, Team Wave does the work,
Broker batches shared writes, and Checkpoint closes tasks. ATM-GOV-0175 now
provides durable wave-aware broker scheduling. This card adds the delivery
commit executor that can safely create broker-owned shared commits for
same-wave compatible tasks without introducing branch development or a fourth
batch model.

## Required Behavior

- Implement `broker batch execute --surface commit` or an equivalent governed
  command path that consumes durable scheduler tickets.
- Validate task claims, wave id, surface family, sealed base, current HEAD,
  scope coverage, validator evidence, and staged file set before committing.
- Use a temporary index or equivalent isolation so shared delivery composition
  cannot pollute the live developer index.
- Produce `atm.sharedWriteReceipt.v1` with wave id, task ids, manifest digest,
  commit sha, file slices, payload digest, executor actor, and timestamps.
- Refuse to absorb unrelated branch-window work even when it is waiting on the
  same branch; only same-wave compatible tickets can share the commit.
- Fall back to serial execution when the scheduler returns serial fallback,
  timeout fallback, incompatible surface, or missing receipt evidence.
- Keep workers out of commit/close authority; the coordinator/executor owns the
  shared write.

## Acceptance

- Command-backed test covers compatible same-wave commit planning, unrelated
  task rejection, stale HEAD rejection, missing claim/validator rejection,
  temporary-index isolation, and `atm.sharedWriteReceipt.v1` shape.
- Typecheck and CLI validation pass.
- No branch workflow is introduced; all commits remain on `main`.
- The card closes with target ledger/evidence and planning-source updates.
