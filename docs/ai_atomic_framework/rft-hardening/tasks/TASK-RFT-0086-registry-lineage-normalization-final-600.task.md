---
task_id: TASK-RFT-0086
title: Split registry lineage normalization below 600 lines
status: done
owner: atm-release
priority: P1
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/registry.ts
  - packages/cli/src/commands/registry/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
deliverables:
  - packages/cli/src/commands/registry.ts
  - packages/cli/src/commands/registry/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
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
  ownerAtomOrMap: atm.registry-lineage-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.registry-lineage-command-map
      pattern: Facade
      source: packages/cli/src/commands/registry.ts
      disposition: extract
      inlineReason: null
    - atom: atm.registry-lineage-normalization-map
      pattern: Result Contract Object
      source: packages/cli/src/commands/registry/**
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T11:52:01.775Z"
completed_by_agent: "codex-task-rft-0086"
closedAt: "2026-07-16T11:52:01.775Z"
closedByActor: "codex-task-rft-0086"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T11-52-01-687Z-close-f53472b64853"
lastTransitionAt: "2026-07-16T11:52:01.775Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "14e3069123eca5a05790896fab610b1fbe518c67"
---

# TASK-RFT-0086 - Split Registry Lineage Normalization Below 600 Lines

## Goal

Reduce `packages/cli/src/commands/registry.ts` below 600 physical lines by extracting registry lineage normalization, timestamp resolution, and version record comparison helpers into a bounded support module while preserving `registry lineage backfill` behavior.

## Acceptance

- `packages/cli/src/commands/registry.ts` is below 600 physical lines.
- Every new file under `packages/cli/src/commands/registry/**` is below 600 physical lines.
- `npm run typecheck` continues to pass.
- `npm run validate:cli` continues to pass.
- Atomization coverage maps the registry facade and support directory to `atm.registry-lineage-command-map`.

## Atom Map Refactor Plan

- Atom: `atm.registry-lineage-command-map`
- Pattern: Facade plus Result Contract Object support
- Owner module: `packages/cli/src/commands/registry.ts`
- Extraction target: `normalizeVersionLineage`, lineage candidate extraction, map matching, timestamp resolution, version record normalization, and semantic comparison helpers.
- Out of scope: registry write/apply behavior, evidence document validation semantics, registry diff generation, taskflow/governance commands, generated release artifacts.
