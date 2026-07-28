---
task_id: TASK-RFT-0092
title: Split replacement lane atom map under 600 lines
status: done
owner: atm-release
priority: P0
depends_on:
  - TASK-RFT-0091
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0092-replacement-lane-map.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/registry/replacement-lane.ts
  - packages/core/src/registry/replacement-lane/**
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
deliverables:
  - packages/core/src/registry/replacement-lane.ts
  - packages/core/src/registry/replacement-lane/**
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
validators:
  - node atm.mjs upgrade --propose --behavior behavior.split --atom atom-core-registry --to 0.1.1 --legacy-target "packages/core/src/registry/replacement-lane.ts#transitionReplacementMode" --guidance-session guidance-20260716131837-247dc3c7eb --dry-run --json
  - node --strip-types scripts/validate-registry-core.ts --mode validate
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atom-core-registry
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atom-core-registry-replacement-transition
      pattern: Transition Orchestrator Facade
      source: packages/core/src/registry/replacement-lane.ts
      disposition: extract
      inlineReason: null
    - atom: atom-core-registry-replacement-target-loader
      pattern: Target Loading Module
      source: packages/core/src/registry/replacement-lane.ts
      disposition: extract
      inlineReason: null
    - atom: atom-core-registry-replacement-evidence
      pattern: Evidence Validation Module
      source: packages/core/src/registry/replacement-lane.ts
      disposition: extract
      inlineReason: null
    - atom: atom-core-registry-replacement-normalization
      pattern: Normalization and IO Module
      source: packages/core/src/registry/replacement-lane.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T13:42:22.579Z"
completed_by_agent: "codex-task-rft-0092"
closedAt: "2026-07-16T13:42:22.579Z"
closedByActor: "codex-task-rft-0092"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T13-42-22-478Z-close-6b1667c5a979"
lastTransitionAt: "2026-07-16T13:42:22.579Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "103eeb24405ec568b73ffced86ed2728b72e752e"
---

# TASK-RFT-0092 - Split Replacement Lane Atom Map

## Objective

Reduce `packages/core/src/registry/replacement-lane.ts` below 600 lines by preserving it as the public facade for `ReplacementMode` and `transitionReplacementMode`, while extracting target loading, transition validation, evidence checks, lineage rendering, and normalization helpers into bounded support modules.

## Acceptance

- `packages/core/src/registry/replacement-lane.ts` is below 600 physical lines.
- Every newly created physical source file is below 600 physical lines.
- `transitionReplacementMode` and `ReplacementMode` remain import-compatible for the CLI and core callers.
- Replacement lane transition behavior remains deterministic, including map spec writes, lineage log appends, registry lifecycle updates, and validation errors.
- The path-to-atom owner shard maps both the facade and extracted support modules to `atom-core-registry`.
- Validation evidence is command-backed, including the guided `behavior.split` dry-run proposal.

## Notes

- Do not redesign replacement-lane semantics in this card.
- Do not touch the stale foreign `next/playbook-projection` lock scope.
- If a high-value governance defect appears during closeout, amend scope before fixing it.
