---
task_id: ATM-GOV-0173
title: Batch Wave Selector
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0172
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  ATM-GOV-0172 delivered the unified wave manifest foundation after 0168-0171
  were occupied by prerequisite safety repairs. This card is the next free GOV
  slot and implements the remapped Batch Wave Selector stage from the approved
  end-to-end auto-batch plan.
scopePaths:
  - packages/cli/src/commands/batch/**
  - packages/cli/src/commands/batch.ts
  - packages/core/src/broker/wave-manifest.ts
  - tests/cli/batch-wave-selector.test.ts
  - docs/governance/command-surface.md
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - .atm/history/evidence/ATM-GOV-0173.*
  - .atm/history/task-events/ATM-GOV-0173/**
  - .atm/history/tasks/ATM-GOV-0173.json
deliverables:
  - packages/cli/src/commands/batch/**
  - tests/cli/batch-wave-selector.test.ts
  - docs/governance/command-surface.md
validators:
  - node --strip-types tests/cli/batch-wave-selector.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.batch-wave-selector
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.batch-wave-selector
      pattern: Selector Policy plus CLI Presenter
      source: packages/cli/src/commands/batch/**
      disposition: extract
      inlineReason: null
waveId: auto-batch-e2e-2026-07
surfaceFamily: batch-selector
completed_at: "2026-07-18T17:15:30.187Z"
completed_by_agent: "codex-gov-auto-batch"
closedAt: "2026-07-18T17:15:30.187Z"
closedByActor: "codex-gov-auto-batch"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T17-15-30-187Z-close-2639c94dc05b"
lastTransitionAt: "2026-07-18T17:15:30.187Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "14ca49168670824a3814ec16ea6b2e32b73a7975"
---

# ATM-GOV-0173 - Batch Wave Selector

## Context

The approved auto-batch product model is: Batch selects cards, Team Wave does
the work, Broker batches shared writes, and Checkpoint closes tasks.
ATM-GOV-0172 delivered the shared `atm.waveManifest.v1` contract. This card
makes Batch Mode the selection control surface that creates a wave manifest
from ready queue entries without creating a second lifecycle.

## Required Behavior

- Add `batch current` or an equivalent command surface that reports
  `currentWave`, `deferredReasons`, and the dispatch command for the selected
  wave.
- Always include the current batch queue head, then scan ready cards in existing
  queue order until `maxWaveSize = 4` or no compatible cards remain.
- Preserve the relative order of deferred or blocked cards; selection must not
  reshuffle the queue.
- Require same target repo, dependency-ready status, compatible surface family,
  and declared validators before a card joins the wave.
- Selection creates only reservation or manifest state. It must not masquerade
  as worker claim and must not commit or close tasks.
- Emit `atm.waveManifest.v1` records and reuse ATM-GOV-0172 eligibility helpers.
- If fewer than two cards are eligible, return a serial fallback that preserves
  the existing single-card batch flow.

## Acceptance Criteria

- A fixture queue with a ready head plus compatible ready cards produces one
  deterministic wave manifest with at most four members.
- Cards blocked by dependency, target repo mismatch, surface mismatch, or missing
  validators appear in `deferredReasons` with machine-readable reason codes.
- Single-card or no-compatible-card queues return serial fallback and do not
  create a misleading multi-card wave.
- Re-running selection against the same queue and planning seals yields the same
  wave id and does not duplicate reservations.

## Validation

Run:

```shell
node --strip-types tests/cli/batch-wave-selector.test.ts
npm run typecheck
npm run validate:cli
```

## Rollback

Revert the selector implementation, command-surface documentation, tests, and
atomization map entries. Existing serial batch behavior remains the fallback.
