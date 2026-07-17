---
task_id: TASK-RFT-0081
title: Split core broker team lane below 600 lines
status: done
owner: atm-release
priority: P1
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/team-lane.ts
  - packages/core/src/broker/team-lane/**
  - scripts/validate-team-brokered-write.ts
  - tests/atomic-map-physical-cap.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
deliverables:
  - packages/core/src/broker/team-lane.ts
  - packages/core/src/broker/team-lane/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
validators:
  - node --strip-types scripts/validate-team-brokered-write.ts
  - node --strip-types tests/atomic-map-physical-cap.test.ts
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.team-broker-lane-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.team-broker-lane-map
      pattern: Facade
      source: packages/core/src/broker/team-lane.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-broker-admission-map
      pattern: Policy Object
      source: packages/core/src/broker/team-lane/**
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T10:23:49.662Z"
completed_by_agent: "codex-task-rft-0081"
closedAt: "2026-07-16T10:23:49.662Z"
closedByActor: "codex-task-rft-0081"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T10-23-49-662Z-close-20cec71b9671"
lastTransitionAt: "2026-07-16T10:23:49.662Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1968e0cfdc8626dffba3f3fde8889af8b21f7611"
---

# TASK-RFT-0081 - Split Core Broker Team Lane Below 600 Lines

## Goal

Reduce `packages/core/src/broker/team-lane.ts` below 600 physical lines by extracting bounded helper modules while preserving the existing Team Broker lane public API.

## Acceptance

- `packages/core/src/broker/team-lane.ts` is below 600 physical lines.
- Every new file under `packages/core/src/broker/team-lane/**` is below 600 physical lines.
- Public exports from `team-lane.ts` remain compatible for existing callers.
- Team broker write/admission validation continues to pass.
- Atomization coverage maps `team-lane.ts` and `team-lane/**` to `atm.team-broker-lane-map`.

## Atom Map Refactor Plan

- Atom: `atm.team-broker-lane-map`
- Pattern: Facade plus Policy Object helpers
- Owner module: `packages/core/src/broker/team-lane.ts`
- Public surface: keep existing exported constants, types, and functions
- Focused test: `node --strip-types scripts/validate-team-brokered-write.ts`
- CLI regression: `npm run typecheck`
- Out of scope: changing broker decision semantics, runtime activation contract, or proposal admission schemas
