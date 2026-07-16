---
task_id: TASK-RFT-0082
title: Split CLI task direction below 600 lines
status: done
owner: atm-release
priority: P1
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-governance-optimization-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/task-direction.ts
  - packages/cli/src/commands/task-direction/**
  - scripts/validate-task-direction-governance.ts
  - tests/atomic-map-physical-cap.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js
deliverables:
  - packages/cli/src/commands/task-direction.ts
  - packages/cli/src/commands/task-direction/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
validators:
  - node --strip-types scripts/validate-task-direction-governance.ts
  - node --strip-types tests/atomic-map-physical-cap.test.ts
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-direction-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.task-direction-map
      pattern: Facade
      source: packages/cli/src/commands/task-direction.ts
      disposition: extract
      inlineReason: null
    - atom: atm.task-direction-support-map
      pattern: Support Module
      source: packages/cli/src/commands/task-direction/**
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T10:37:00.228Z"
completed_by_agent: "codex-task-rft-0082"
closedAt: "2026-07-16T10:37:00.228Z"
closedByActor: "codex-task-rft-0082"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T10-37-00-228Z-close-bf68cc954912"
lastTransitionAt: "2026-07-16T10:37:00.228Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f451ace65bbf9a1f967f418bbb7bb9c78f0ae177"
---

# TASK-RFT-0082 - Split CLI Task Direction Below 600 Lines

## Goal

Reduce `packages/cli/src/commands/task-direction.ts` below 600 physical lines by extracting bounded support modules while preserving the existing task direction public API.

## Acceptance

- `packages/cli/src/commands/task-direction.ts` is below 600 physical lines.
- Every new file under `packages/cli/src/commands/task-direction/**` is below 600 physical lines.
- Public exports from `task-direction.ts` remain compatible for existing callers.
- Task direction governance validation continues to pass.
- Atomization coverage maps `task-direction.ts` and `task-direction/**` to `atm.task-direction-map`.

## Atom Map Refactor Plan

- Atom: `atm.task-direction-map`
- Pattern: Facade plus Support Module helpers
- Owner module: `packages/cli/src/commands/task-direction.ts`
- Extraction target: queue IO, path normalization, planning mirror helpers, and small pure support utilities.
