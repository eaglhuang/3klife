---
task_id: TASK-RFT-0070
title: Split task import validator below 600 lines
status: done
owner: atm-scripts
priority: P1
depends_on:
  - TASK-RFT-0069
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0070-task-import-validator-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-task-import.ts
  - scripts/validate-task-import/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - tests/scripts/validate-task-import-final-600.test.ts
deliverables:
  - scripts/validate-task-import.ts
  - scripts/validate-task-import/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - tests/scripts/validate-task-import-final-600.test.ts
validators:
  - node --strip-types tests/scripts/validate-task-import-final-600.test.ts
  - npm run validate:task-import
  - npm run typecheck
  - npm run validate:governance-projections
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-import-validator-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.task-import-validator-map
      pattern: Facade
      source: scripts/validate-task-import.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T06:42:48.536Z"
completed_by_agent: "codex-task-rft-0070"
closedAt: "2026-07-16T06:42:48.536Z"
closedByActor: "codex-task-rft-0070"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T06-42-48-469Z-close-3e282cf44d27"
lastTransitionAt: "2026-07-16T06:42:48.536Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "15b2f243be535108c0f0e15010291f16202692b8"
---

# TASK-RFT-0070 - Split task import validator below 600 lines

## Goal

Split `scripts/validate-task-import.ts` into a bounded validator facade plus helper modules so every touched physical source file is below 600 lines while preserving the existing `npm run validate:task-import` behavior.

## Acceptance

- `scripts/validate-task-import.ts` remains the executable entrypoint for `npm run validate:task-import`.
- Helper modules under `scripts/validate-task-import/` own duplicate backlog checks, task import scenarios, emergency lease helpers, and imported task contract assertions.
- Every touched physical code file is below 600 lines.
- Focused guard verifies line budgets and owner-map coverage.

## Out of Scope

- Changing task import semantics or fixtures.
- Editing `packages/cli/src/commands/tasks.ts`.
- Committing `release/**` generated artifacts.
