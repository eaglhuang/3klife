---
task_id: TASK-RFT-0088
title: Split map generator support below 600 lines
status: done
source_repo: AI-Atomic-Framework
target_repo: AI-Atomic-Framework
task_family: TASK-RFT
governance: ATM
scopePaths:
  - packages/core/src/manager/map-generator.ts
  - packages/core/src/manager/map-generator/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
validators:
  - npm run typecheck
  - npm run validate:cli
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - node atm.mjs doctor --json
atomizationImpact:
  ownerAtomOrMap: atom-core-map-generator
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atom-core-map-generator
      pattern: Facade
      source: packages/core/src/manager/map-generator.ts
      disposition: extract
      inlineReason: null
    - atom: atom-core-map-generator-support
      pattern: Support Modules
      source: packages/core/src/manager/map-generator/**
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T12:23:30.664Z"
completed_by_agent: "codex-task-rft-0088"
closedAt: "2026-07-16T12:23:30.664Z"
closedByActor: "codex-task-rft-0088"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T12-23-30-587Z-close-b2d0a62cb06c"
lastTransitionAt: "2026-07-16T12:23:30.664Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f666638248463935adc83b6d1ad8106656084eaa"
---

# TASK-RFT-0088 - Split Map Generator Support Below 600 Lines

## Goal

Reduce `packages/core/src/manager/map-generator.ts` below 600 physical lines while preserving the public map generation facade and current behavior.

## Atomic Boundary

- Keep `generateAtomicMap` and exported result types available from the existing facade.
- Extract cohesive support for request/spec normalization, generated map test/report execution, and atomic map hash creation into bounded files under `packages/core/src/manager/map-generator/`.
- Keep every touched physical source file below 600 lines.

## Acceptance

- `packages/core/src/manager/map-generator.ts` is below 600 lines.
- Every new or touched physical TypeScript file is below 600 lines.
- Existing imports of `generateAtomicMap` and `createMinimalAtomicMapSpec` remain compatible.
- Atomization coverage maps the facade and support directory to the map generator atom owner.
- Validators pass and are recorded as command-backed ATM evidence:
  - `npm run typecheck`
  - `npm run validate:cli`
  - `node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate`
  - `node atm.mjs doctor --json`

## Notes

- This is a continuation of the TASK-RFT large-file atomization series.
- Do not include unrelated captain parallel ledger WIP, ATMChart drift, or report residues in this card.
