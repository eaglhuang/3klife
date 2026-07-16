---
task_id: TASK-RFT-0061
title: Split task option parsers below 600 lines
status: done
owner: atm-refactor
priority: P1
depends_on:
  - TASK-RFT-0060
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0061-task-option-parsers-final-600.task.md
scopePaths:
  - packages/cli/src/commands/tasks/task-option-parsers.ts
  - packages/cli/src/commands/tasks/task-option-parsers/**/*.ts
  - tests/unit/task-option-parsers.unit.test.ts
  - tests/unit/task-option-parsers-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli*.json
deliverables:
  - packages/cli/src/commands/tasks/task-option-parsers.ts
  - packages/cli/src/commands/tasks/task-option-parsers/**/*.ts
  - tests/unit/task-option-parsers-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
validators:
  - node --strip-types tests/unit/task-option-parsers-final-600.test.ts
  - node --strip-types tests/unit/task-option-parsers.unit.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the parser facade split and rebuild release artifacts only if ATM reports runner drift.
atomizationImpact:
  ownerAtomOrMap: atm.task-option-parsers-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.task-option-parsers-facade
      pattern: Facade
      source: packages/cli/src/commands/tasks/task-option-parsers.ts
      disposition: extract
      inlineReason: null
    - atom: atm.task-option-parser-groups
      pattern: Strategy Map
      source: packages/cli/src/commands/tasks/task-option-parsers.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T04:27:45.831Z"
completed_by_agent: "codex-task-rft-0061"
closedAt: "2026-07-16T04:27:45.831Z"
closedByActor: "codex-task-rft-0061"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T04-27-45-831Z-close-e98bc9491ee7"
lastTransitionAt: "2026-07-16T04:27:45.831Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "60ab404c2e3d136306353887a6c950b81782143d"
---

# TASK-RFT-0061

Split `packages/cli/src/commands/tasks/task-option-parsers.ts` so the public import path remains a stable facade while parser groups move into owned helper modules. Every physical TypeScript file in this card's deliverable surface must be below 600 lines.

## Acceptance

- `packages/cli/src/commands/tasks/task-option-parsers.ts` keeps exporting the same parser functions used by the task command facade.
- Parser behavior remains compatible with the existing unit coverage in `tests/unit/task-option-parsers.unit.test.ts`.
- `tests/unit/task-option-parsers-final-600.test.ts` verifies the facade and extracted modules are below 600 lines and that the CLI owner shard maps the facade and module glob to `atm.task-option-parsers-map`.
- No task lifecycle, closeout, or broker semantics are changed in this card.

## Atom Plan

Atom: `atm.task-option-parsers-map`
Pattern: Facade plus Strategy Map
Owner module: `packages/cli/src/commands/tasks/task-option-parsers/**`
Callers: `packages/cli/src/commands/tasks/legacy/implementation.ts`, task command orchestrators, unit tests
Public surface: `packages/cli/src/commands/tasks/task-option-parsers.ts` exports stay stable
Focused test: `node --strip-types tests/unit/task-option-parsers-final-600.test.ts`
CLI regression: `node --strip-types tests/unit/task-option-parsers.unit.test.ts`
Out of scope: task lifecycle semantics, close orchestration, import validation, broker behavior
Commit split: source/test/map delivery, taskflow close bundle, release sync only if ATM reports runner drift
