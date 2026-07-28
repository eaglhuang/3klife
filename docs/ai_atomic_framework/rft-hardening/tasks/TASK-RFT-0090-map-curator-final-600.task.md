---
task_id: TASK-RFT-0090
title: Split atom map curator below 600 lines
status: done
source_repo: AI-Atomic-Framework
target_repo: AI-Atomic-Framework
task_family: TASK-RFT
governance: ATM
owner: atm-release
priority: P1
depends_on: []
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - packages/core/src/upgrade/map-curator.ts
  - packages/core/src/upgrade/map-curator/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
deliverables:
  - packages/core/src/upgrade/map-curator.ts
  - packages/core/src/upgrade/map-curator/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
validators:
  - npm run typecheck
  - npm run validate:cli
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.upgrade-map-curation-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.upgrade-map-curation-types
      pattern: Type Boundary Module
      source: packages/core/src/upgrade/map-curator.ts
      disposition: extract
      inlineReason: null
    - atom: atm.upgrade-map-curation-policy
      pattern: Policy and Gate Helpers
      source: packages/core/src/upgrade/map-curator/**
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T12:56:27.827Z"
completed_by_agent: "codex-task-rft-0090"
closedAt: "2026-07-16T12:56:27.827Z"
closedByActor: "codex-task-rft-0090"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T12-56-27-721Z-close-d9033f9c1b2d"
lastTransitionAt: "2026-07-16T12:56:27.827Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d86cd21cc49ecce01a0e03a1a25de6e0671d52d9"
---

# TASK-RFT-0090 - Split Atom Map Curator Below 600 Lines

## Goal

Reduce `packages/core/src/upgrade/map-curator.ts` below 600 physical lines while preserving the atom map curator API and deterministic proposal/report behavior.

## Atomic Boundary

- Keep `packages/core/src/upgrade/map-curator.ts` as the public facade for existing imports.
- Extract cohesive curator type declarations, constants, policy helpers, scoring helpers, or report/proposal builders into bounded modules under `packages/core/src/upgrade/map-curator/`.
- Preserve exported type/function names currently provided by the facade unless a re-export is required to maintain compatibility.
- Keep every touched physical source/test file below 600 lines.

## Acceptance

- `packages/core/src/upgrade/map-curator.ts` is below 600 lines.
- Every new or touched physical TypeScript/JavaScript file is below 600 lines.
- Existing curator behavior remains deterministic and compatible with the current validation suite.
- Atomization coverage maps the facade and extracted support directory to the upgrade map-curation owner.
- Validators pass and are recorded as command-backed ATM evidence:
  - `npm run typecheck`
  - `npm run validate:cli`
  - `node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate`
  - `node atm.mjs doctor --json`

## Notes

- This is a continuation of the TASK-RFT large-file atomization series.
- Do not include unrelated runner-sync admission WIP, ATMChart drift, bug backlog edits, or report residues in this card.
