---
task_id: TASK-RFT-0079
title: Split atom ref readability registry module below 600 lines
status: done
owner: atm-registry
priority: P1
depends_on:
  - TASK-RFT-0078
related_plan: docs/ai_atomic_framework/governance-optimization/giant-file-atomization-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/registry/atom-ref-readability.ts
  - packages/core/src/registry/atom-ref-readability/**
  - packages/core/src/index.ts
  - scripts/validate-atom-callsite-readability.ts
  - tests/atomic-map-physical-cap.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
deliverables:
  - packages/core/src/registry/atom-ref-readability.ts
  - packages/core/src/registry/atom-ref-readability/types.ts
  - packages/core/src/registry/atom-ref-readability/catalog.ts
  - packages/core/src/registry/atom-ref-readability/callsites.ts
  - packages/core/src/registry/atom-ref-readability/render.ts
  - packages/core/src/registry/atom-ref-readability/reports.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
validators:
  - node --strip-types scripts/validate-atom-callsite-readability.ts --mode validate
  - node --strip-types tests/atomic-map-physical-cap.test.ts
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the TASK-RFT-0079 delivery commit and close bundle; regenerate atomization coverage projection through the shard merge tool if owner shard updates are reverted.
atomizationImpact:
  ownerAtomOrMap: atm.atom-ref-readability-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.atom-ref-readability-facade
      pattern: Facade
      source: packages/core/src/registry/atom-ref-readability.ts
      disposition: extract
      inlineReason: null
    - atom: atm.atom-ref-readability-result-contract
      pattern: Result Contract Object
      source: packages/core/src/registry/atom-ref-readability/reports.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T09:58:08.464Z"
completed_by_agent: "codex-task-rft-0079"
closedAt: "2026-07-16T09:58:08.464Z"
closedByActor: "codex-task-rft-0079"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T09-58-08-464Z-close-47784f66e3cf"
lastTransitionAt: "2026-07-16T09:58:08.464Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "5bbd1371262cb35c31e954d0f4b9af636bbeece4"
---

# TASK-RFT-0079 - Atom Ref Readability Final 600

## Goal

Split the atom ref readability registry module into bounded physical files while preserving the public `sweepAtomRefReadability` and `validateAtomRefReadability` contracts.

## Acceptance

- `packages/core/src/registry/atom-ref-readability.ts` is below 600 physical lines.
- Every new `packages/core/src/registry/atom-ref-readability/**` physical file is below 600 lines.
- Existing CLI and script imports keep working without caller rewrites.
- Atom callsite readability validation still passes for fixture repos and the current framework repo.
- Atomization coverage records the new owner paths.

## Boundaries

- Do not change readable ref semantics, report schema IDs, or generated file paths.
- Do not edit release artifacts in the delivery commit.
- Do not widen into other registry giant files; record adjacent candidates separately if discovered.
