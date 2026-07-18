---
task_id: ATM-GOV-0178
title: Parallel Analyzer v2 and End-to-End Failure Matrix
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0172
  - ATM-GOV-0173
  - ATM-GOV-0174
  - ATM-GOV-0175
  - ATM-GOV-0176
  - ATM-GOV-0177
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  ATM-GOV-0177 completed shared generated-write receipts and checkpoint readiness. This card uses the next planned GOV slot to make the Batch -> Team Wave -> Broker -> Checkpoint pipeline measurable and failure-safe.
scopePaths:
  - scripts/analyze-captain-parallel-ledger.ts
  - docs/reports/captain-parallel-ledger-analysis.md
  - tests/cli/captain-parallel-ledger-analysis.test.ts
  - tests/cli/analyze-captain-parallel-ledger-lane-concurrency.test.ts
  - tests/cli/parallel-analyzer-v2-failure-matrix.test.ts
  - scripts/fixtures/auto-batch-analyzer/**
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - .atm/history/evidence/ATM-GOV-0178.*
  - .atm/history/task-events/ATM-GOV-0178/**
  - .atm/history/tasks/ATM-GOV-0178.json
deliverables:
  - scripts/analyze-captain-parallel-ledger.ts
  - tests/cli/parallel-analyzer-v2-failure-matrix.test.ts
  - docs/reports/captain-parallel-ledger-analysis.md
validators:
  - node --strip-types tests/cli/parallel-analyzer-v2-failure-matrix.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.parallel-analyzer-v2
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.parallel-analyzer-v2
      pattern: Analyzer Metrics Contract
      source: scripts/analyze-captain-parallel-ledger.ts
      disposition: keep-inline
      inlineReason: bounded script already under line budget
waveId: auto-batch-e2e-2026-07
surfaceFamily: analyzer-evidence
completed_at: "2026-07-18T19:03:20.099Z"
completed_by_agent: "codex-gov-auto-batch"
closedAt: "2026-07-18T19:03:20.099Z"
closedByActor: "codex-gov-auto-batch"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T19-03-20-099Z-close-9b14364f4a08"
lastTransitionAt: "2026-07-18T19:03:20.099Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6e95382ac34060047a0628285c1fb44f8c5bb67e"
---

# ATM-GOV-0178 - Parallel Analyzer v2 and End-to-End Failure Matrix

## Context

The approved product model is: Batch selects cards, Team Wave does the work, Broker batches shared writes, and Checkpoint closes tasks. ATM-GOV-0172 through ATM-GOV-0177 delivered the functional path. This card makes the path measurable and adds failure-matrix evidence so later A/B dogfood can prove or reject speed claims.

## Required Behavior

- Extend the existing captain parallel ledger analyzer instead of creating a second analyzer.
- Read task events, lane session events, broker tickets, shared write receipts, generated write receipts, checkpoint readiness receipts, task evidence, and commits when present.
- Report max concurrency, hard-overlap minutes, makespan, active throughput, waitedMs p50/p95, batchRate, builds/projections/commits per wave, false blocks, repair closure rate, lane intervention count, and executor cost when data exists.
- Add an end-to-end failure matrix covering happy-path wave, conflict, docs-only runner skip, worker partial failure, HEAD moved, build retry, projection retry, checkpoint retry, lane conflict, kill switch, and serial fallback.
- Missing evidence must be explicit as an observability gap, not silently zero.

## Acceptance

- Command-backed tests cover analyzer v2 metrics and failure matrix fixtures.
- Typecheck and CLI validation pass.
- Generated report documents whether current ATM data proves speed, only safety, or an observability gap.
- No branch workflow is introduced; all commits remain on main.
