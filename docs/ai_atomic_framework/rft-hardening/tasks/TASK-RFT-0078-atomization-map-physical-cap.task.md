---
task_id: TASK-RFT-0078
title: Cap atomization coverage map physical files below 600 lines
status: done
owner: atm-coverage
priority: P1
depends_on:
  - TASK-RFT-0077
related_plan: docs/ai_atomic_framework/governance-optimization/giant-file-atomization-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/manifest.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli-*.json
  - tests/atomic-map-physical-cap.test.ts
deliverables:
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/manifest.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - tests/atomic-map-physical-cap.test.ts
validators:
  - node --strip-types tests/atomic-map-physical-cap.test.ts
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - node --strip-types scripts/validate-atomization-coverage.ts
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the TASK-RFT-0078 delivery commit and close bundle; if projection formatting changes are reverted, rebuild projection through the shard merge tool before retrying.
atomizationImpact:
  ownerAtomOrMap: atm.atomization-coverage-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/manifest.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.atomization-coverage-map-physical-cap
      pattern: Result Contract Object
      source: atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T09:39:30.669Z"
completed_by_agent: "codex-task-rft-0078"
closedAt: "2026-07-16T09:39:30.669Z"
closedByActor: "codex-task-rft-0078"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T09-39-30-588Z-close-41ce34080cf2"
lastTransitionAt: "2026-07-16T09:39:30.669Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "53c7fa4246fe37c3d944d95c6358686d539054aa"
---

# TASK-RFT-0078 - Cap Atomization Coverage Map Physical Files

## Goal

Bring the atomization coverage map physical files under the 600-line cap while preserving the existing owner-shard merge contract and downstream JSON consumers.

## Acceptance

- `atomic_workbench/atomization-coverage/path-to-atom-map.json` is below 600 physical lines.
- `atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json` is below 600 physical lines.
- The shard merge validator proves the projection still semantically matches owner shards.
- Existing direct JSON readers of `owner-shard-cli.json` continue to pass without caller rewrites.
- A focused guard fails if the projection or CLI owner shard regresses above 600 lines.

## Boundaries

- Do not change atom ids, path ownership, or coverage semantics.
- Do not widen into TypeScript command refactors.
- Do not edit release artifacts in the delivery commit.
