---
task_id: TASK-RFT-0075
title: Split validate-schemas script below 600 lines
status: done
owner: atm-scripts
priority: P1
depends_on:
  - TASK-RFT-0074
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0075-validate-schemas-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-schemas.ts
  - scripts/validate-schemas/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - tests/scripts/validate-schemas-final-600.test.ts
deliverables:
  - scripts/validate-schemas.ts
  - scripts/validate-schemas/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - tests/scripts/validate-schemas-final-600.test.ts
validators:
  - node --strip-types tests/scripts/validate-schemas-final-600.test.ts
  - node --strip-types scripts/validate-schemas.ts --mode validate
  - npm run typecheck
  - npm run validate:governance-projections
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.validate-schemas-script-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.validate-schemas-script-map
      pattern: Facade
      source: scripts/validate-schemas.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T07:37:01.265Z"
completed_by_agent: "codex-task-rft-0075"
closedAt: "2026-07-16T07:37:01.265Z"
closedByActor: "codex-task-rft-0075"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T07-37-01-265Z-close-3113f743b7fe"
lastTransitionAt: "2026-07-16T07:37:01.265Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "7063798600bff1a169e737126a3e6dc19094c5f0"
---

# TASK-RFT-0075 - Split Validate-Schemas Script Below 600 Lines

## Goal

Split `scripts/validate-schemas.ts` into a small validator facade plus bounded helper modules while preserving all schema loading, fixture validation, enum assertions, protected surface checks, and generated schema verification behavior.

## Acceptance

- `scripts/validate-schemas.ts` preserves the current validator command behavior.
- Helper modules live under `scripts/validate-schemas/`.
- Every touched physical TypeScript file is below 600 lines.
- `owner-shard-scripts.json` explicitly maps the facade and helper directory to the validate-schemas script atom/map.
- Focused final-600 guard proves line budgets, facade delegation, and owner-shard coverage.
- Existing validate-schemas, typecheck, governance projection validation, and CLI validation pass.

## Out Of Scope

- Changing schema semantics.
- Changing fixture contents.
- Changing generated release artifacts under `release/**`.
