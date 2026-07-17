---
task_id: TASK-RFT-0083
title: Split MAO parallel routing benchmark runner below 600 lines
status: done
owner: atm-release
priority: P1
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/lib/mao-parallel-routing-benchmark-runner.ts
  - scripts/lib/mao-parallel-routing-benchmark-runner/**
  - scripts/validate-mao-parallel-routing.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
deliverables:
  - scripts/lib/mao-parallel-routing-benchmark-runner.ts
  - scripts/lib/mao-parallel-routing-benchmark-runner/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
validators:
  - node --strip-types scripts/validate-mao-parallel-routing.ts
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.mao-parallel-routing-benchmark-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.mao-parallel-routing-benchmark-map
      pattern: Facade
      source: scripts/lib/mao-parallel-routing-benchmark-runner.ts
      disposition: extract
      inlineReason: null
    - atom: atm.mao-parallel-routing-benchmark-rendering-map
      pattern: Result Contract Object
      source: scripts/lib/mao-parallel-routing-benchmark-runner/**
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T11:02:43.555Z"
completed_by_agent: "codex-task-rft-0083"
closedAt: "2026-07-16T11:02:43.555Z"
closedByActor: "codex-task-rft-0083"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T11-02-43-555Z-close-c68961894728"
lastTransitionAt: "2026-07-16T11:02:43.555Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "83edb1f4107b79137cd4f78c01999a68a2cff1bb"
---

# TASK-RFT-0083 - Split MAO Parallel Routing Benchmark Runner Below 600 Lines

## Goal

Reduce `scripts/lib/mao-parallel-routing-benchmark-runner.ts` below 600 physical lines by extracting bounded benchmark rendering/report support while preserving the existing MAO parallel routing benchmark public API.

## Acceptance

- `scripts/lib/mao-parallel-routing-benchmark-runner.ts` is below 600 physical lines.
- Every new file under `scripts/lib/mao-parallel-routing-benchmark-runner/**` is below 600 physical lines.
- `scripts/validate-mao-parallel-routing.ts` continues to import the same public runner facade symbols.
- MAO parallel routing validation continues to pass and benchmark semantics remain unchanged.
- Atomization coverage maps the runner facade and support directory to `atm.mao-parallel-routing-benchmark-map`.

## Atom Map Refactor Plan

- Atom: `atm.mao-parallel-routing-benchmark-map`
- Pattern: Facade plus Result Contract Object support
- Owner module: `scripts/lib/mao-parallel-routing-benchmark-runner.ts`
- Extraction target: markdown rendering and report presentation helpers.
- Out of scope: broker conflict semantics, route lifecycle behavior, steward plan behavior, fixture contents, generated benchmark report wording changes beyond mechanical relocation.
