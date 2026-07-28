---
task_id: TASK-RFT-0069
title: Split core registry facade below 600 lines
status: done
owner: atm-core
priority: P1
depends_on:
  - TASK-RFT-0068
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0069-core-registry-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/registry/registry.ts
  - packages/core/src/registry/registry/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - tests/registry/registry-final-600.test.ts
deliverables:
  - packages/core/src/registry/registry.ts
  - packages/core/src/registry/registry/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - tests/registry/registry-final-600.test.ts
validators:
  - node --strip-types tests/registry/registry-final-600.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:governance-projections
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atom-core-registry
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atom-core-registry
      pattern: Facade
      source: packages/core/src/registry/registry.ts
      disposition: extract
      inlineReason: null
    - atom: atom-core-registry-validation-contract
      pattern: Result Contract Object
      source: packages/core/src/registry/registry.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T06:26:27.982Z"
completed_by_agent: "codex-task-rft-0069"
closedAt: "2026-07-16T06:26:27.982Z"
closedByActor: "codex-task-rft-0069"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T06-26-27-915Z-close-4cad83f40591"
lastTransitionAt: "2026-07-16T06:26:27.982Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "8f3918c8ffc2603687a2175f6f0c8674ac0638d5"
---

# TASK-RFT-0069 - Split core registry facade below 600 lines

## Goal

Split the core registry implementation so `packages/core/src/registry/registry.ts` becomes a bounded facade while registry entry creation, document IO, validation, drift evaluation, and shared path helpers live in smaller atom-owned modules. Every touched physical code file must stay below 600 lines.

## Acceptance

- `registry.ts` continues to expose the same public functions and constants used by existing callers.
- All new `packages/core/src/registry/registry/*.ts` files are below 600 lines.
- `tests/registry/registry-final-600.test.ts` proves the facade and split files stay below 600 lines and owner-map coverage exists.
- Existing registry behavior remains covered by typecheck and CLI validation.

## Out of Scope

- Changing registry schemas or public behavior.
- Committing `release/**` generated artifacts.
- Refactoring other core registry modules such as `map-registry.ts`, `registry-index.ts`, or capsule registries.
