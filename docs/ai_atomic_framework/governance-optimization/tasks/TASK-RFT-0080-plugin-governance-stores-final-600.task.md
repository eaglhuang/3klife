---
task_id: TASK-RFT-0080
title: Split plugin governance local stores below 600 lines
status: done
owner: atm-release
priority: P1
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/plugin-governance-local/src/stores.ts
  - packages/plugin-governance-local/src/stores/**
  - packages/plugin-governance-local/src/index.ts
  - scripts/validate-governance-local.ts
  - tests/atomic-map-physical-cap.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-plugins.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
deliverables:
  - packages/plugin-governance-local/src/stores.ts
  - packages/plugin-governance-local/src/stores/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-plugins.json
validators:
  - node --strip-types scripts/validate-governance-local.ts
  - node --strip-types tests/atomic-map-physical-cap.test.ts
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the delivery commit and generated taskflow governance commits; rerun atomization map shard merge if projection drift remains.
atomizationImpact:
  ownerAtomOrMap: atm.plugin-governance-stores-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-plugins.json
  extractionCandidates:
    - atom: atm.plugin-governance-stores-map
      pattern: Facade
      source: packages/plugin-governance-local/src/stores.ts
      disposition: extract
      inlineReason: null
    - atom: atm.plugin-governance-store-adapters
      pattern: Adapter/Port
      source: packages/plugin-governance-local/src/stores/**
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T10:11:20.268Z"
completed_by_agent: "codex-task-rft-0080"
closedAt: "2026-07-16T10:11:20.268Z"
closedByActor: "codex-task-rft-0080"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T10-11-20-268Z-close-842b7d42f786"
lastTransitionAt: "2026-07-16T10:11:20.268Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b08858e1d695cee767f435ac6ca8b5826c9e70fd"
---

# TASK-RFT-0080 - Split Plugin Governance Local Stores Below 600 Lines

## Goal

Reduce `packages/plugin-governance-local/src/stores.ts` from 793 lines to a bounded facade below 600 lines, moving cohesive store builders and shared helpers into `packages/plugin-governance-local/src/stores/**` without changing the public `createLocalGovernanceStores` contract.

## Acceptance

- `packages/plugin-governance-local/src/stores.ts` is below 600 physical lines.
- Every new file under `packages/plugin-governance-local/src/stores/**` is below 600 physical lines.
- `createLocalGovernanceStores(config)` remains the public entry point used by `packages/plugin-governance-local/src/index.ts` and bootstrap callers.
- Task, lock, document, shard, artifact, log, run report, state, rule, evidence, registry, context budget, and context summary behavior remains semantically equivalent.
- Atomization coverage maps `packages/plugin-governance-local/src/stores.ts` and `packages/plugin-governance-local/src/stores/**` to `atm.plugin-governance-stores-map`.

## Atom Map Refactor Plan

- Atom: `atm.plugin-governance-stores-map`
- Pattern: Facade plus Adapter/Port modules
- Owner module: `packages/plugin-governance-local/src/stores.ts`
- Callers: `packages/plugin-governance-local/src/index.ts`, plugin bootstrap implementation, CLI governance-local validator
- Public surface: no public export removal; keep `createLocalGovernanceStores`
- Focused test: `node --strip-types scripts/validate-governance-local.ts`
- CLI regression: `npm run typecheck`
- Out of scope: changing plugin-sdk store interfaces, changing local governance layout semantics, or altering task/lock/evidence document schemas
- Commit split: one source delivery commit, followed by taskflow close governance commit

## Notes

This card continues the TASK-RFT final-600 series after TASK-RFT-0079. The candidate was selected by source line scan on 2026-07-16: it was the largest remaining non-release, non-dist, non-fixture source file above 600 lines.
