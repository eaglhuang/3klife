---
task_id: ATM-GOV-0179
title: Strict Paired A/B Dogfood and Default-On Circuit Breaker
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0178
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  ATM-GOV-0178 made the auto-batch pipeline measurable. This final card runs a strict paired A/B dogfood proof and adds default-on controls only when evidence supports the rollout.
scopePaths:
  - packages/cli/src/commands/batch/**
  - packages/core/src/batch/**
  - packages/core/src/broker/**
  - scripts/analyze-captain-parallel-ledger.ts
  - scripts/fixtures/auto-batch-analyzer/**
  - docs/reports/captain-parallel-ledger-analysis.md
  - docs/governance/command-surface.md
  - tests/cli/strict-paired-ab-dogfood.test.ts
  - tests/cli/parallel-analyzer-v2-failure-matrix.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - .atm/history/evidence/ATM-GOV-0179.*
  - .atm/history/task-events/ATM-GOV-0179/**
  - .atm/history/tasks/ATM-GOV-0179.json
deliverables:
  - strict paired A/B fixture and analyzer report for serial-control vs auto-batch-treatment
  - default-on circuit-breaker controls: batch.autoBatch.enabled, batch.autoBatch.maxWaveSize, batch.autoBatch.collectionTimeoutMs, ATM_AUTO_BATCH=0, --auto-batch off, ATM_AUTO_BATCH_CIRCUIT_OPEN
  - machine-readable verdict: improved, inconclusive, or regressed
validators:
  - node --strip-types tests/cli/strict-paired-ab-dogfood.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: disable via ATM_AUTO_BATCH=0 or ATM_AUTO_BATCH_CIRCUIT_OPEN, then revert commit if needed
atomizationImpact:
  ownerAtomOrMap: atm.auto-batch-ab-proof
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
waveId: auto-batch-e2e-2026-07
surfaceFamily: auto-batch-evidence
completed_at: "2026-07-18T19:18:19.459Z"
completed_by_agent: "codex-gov-auto-batch"
closedAt: "2026-07-18T19:18:19.459Z"
closedByActor: "codex-gov-auto-batch"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T19-18-19-459Z-close-ed2188407145"
lastTransitionAt: "2026-07-18T19:18:19.459Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d032ab1be70725e3cd90de36d48f1f2832833106"
---

# ATM-GOV-0179 - Strict Paired A/B Dogfood and Default-On Circuit Breaker

## Context

The approved product model is Batch selects cards, Team Wave does the work, Broker batches shared writes, and Checkpoint closes tasks. ATM-GOV-0172 through ATM-GOV-0178 delivered the path and analyzer. This card proves whether the path is fast enough to enable by default.

## Required Behavior

- Run paired serial-control and auto-batch-treatment waves with AB/BA ordering to reduce cache/order bias.
- Pair task samples by scope class, validator cost, LOC, build requirement, and executor type.
- Report median makespan improvement, active throughput improvement, eligible treatment batchRate, buildsPerWave, projectionsPerWave, validator pass rate, close audit pass rate, out-of-scope violations, and R1 violations.
- Emit a machine-readable verdict: `improved`, `inconclusive`, or `regressed`.
- Add config/env/CLI controls for auto-batch rollout and emergency disablement.
- Default-on is allowed only when evidence meets thresholds; otherwise keep rollout off and report the reason.

## Acceptance

- Median makespan improves by at least 25 percent.
- Active throughput improves by at least 25 percent.
- Eligible treatment `batchRate >= 0.70`.
- `buildsPerWave <= 1` and `projectionsPerWave <= 1`.
- Validators and close audit pass at 100 percent.
- Out-of-scope and R1 violations are zero.
- Tests and command-backed evidence are recorded before close.
