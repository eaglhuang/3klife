---
doc_id: doc_rft_0019
task_id: TASK-RFT-0019
title: "tasks.ts card parser + scope/queue final facade split"
status: done
owner: atm-core
priority: P0
milestone: RFT-M6
depends_on: [TASK-RFT-0018]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/scope-queue.ts"
  - "packages/cli/src/commands/tasks/task-card-writer.ts"
  - "packages/atm-markdown-task-source/src/task-card-parser.ts"
  - "packages/atm-markdown-task-source/src/index.ts"
  - "packages/cli/src/commands/tasks/__tests__/task-card-parser.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/task-card-writer.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/scope-queue.spec.ts"
  - "scripts/validate-tasks-final-facade-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/scope-queue.ts"
  - "packages/cli/src/commands/tasks/task-card-writer.ts"
  - "packages/atm-markdown-task-source/src/task-card-parser.ts"
  - "packages/atm-markdown-task-source/src/index.ts"
  - "packages/cli/src/commands/tasks/__tests__/task-card-parser.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/task-card-writer.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/scope-queue.spec.ts"
  - "scripts/validate-tasks-final-facade-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-tasks-final-facade-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/task-card-parser.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/task-card-writer.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/scope-queue.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if task import parsing, scope add/repair, queue, parallel, lock cleanup, or roster behavior changes."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-atomic-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Touching packages/cli/src/commands/next.ts or RFT-0001 Lane A files"
  - "Changing markdown task source public schema"
  - "Changing queue conflict semantics"
  - "Changing taskflow close semantics"
nonGoals:
  - "Do not rewrite parser behavior; move it behind a package boundary with parity tests."
  - "Do not chase sub-1,000 lines by deleting useful named exports without compatibility review."
completed_at: "2026-07-09T17:48:59.552Z"
completed_by_agent: "codex-lane-b"
closedAt: "2026-07-09T17:48:59.552Z"
closedByActor: "codex-lane-b"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-09T17-48-59-461Z-close-9df88f6a99fa"
lastTransitionAt: "2026-07-09T17:48:59.552Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "318dae4fa48418272254c125f3e9a7b7b0a7d153"
---

# TASK-RFT-0019 - tasks.ts card parser + scope/queue final facade split

## Goal

Finish Lane B by moving card parsing and scope/queue/parallel/lock residual
clusters out of `packages/cli/src/commands/tasks.ts`, then record the final
facade line count and any justified residual glue.

## Atom/Map Extraction Pattern

- `packages/atm-markdown-task-source/src/task-card-parser.ts` owns
  `parsePlanMarkdown`, `parseSingleCard`, markdown section parsing, table
  metadata, and card enrichment logic.
- `tasks/task-card-writer.ts` owns `writeTaskFiles` and `writeImportEvidence`
  if those writers cannot move into the markdown package without broad package
  boundary churn.
- `tasks/scope-queue.ts` owns scope add / repair, lock cleanup, queue,
  parallel analysis, roster update glue, and related helpers.
- `tasks.ts` ends as a thin router/facade.

## Required Behavior

- `tasks import` parsing remains compatible with existing markdown cards.
- `tasks scope`, `tasks queue`, `tasks parallel`, `tasks lock cleanup`, and
  `tasks roster update` preserve public JSON fields and exit codes.
- `docs/reports/tasks-command-atomic-map.md` records final line count, residual
  exports, and the Lane B parallel-boundary evidence.

## Validation

`scripts/validate-tasks-final-facade-atomic-map.ts` must assert:

- Parser-heavy functions are no longer defined in `tasks.ts`.
- Scope/queue/parallel/lock functions are no longer defined in `tasks.ts`
  except for intentionally retained router glue.
- `tasks.ts` line count is under 1,000, or the report lists the exact residual
  exported glue and a follow-up tripwire.
- Lane A `next.ts` files are untouched by this card.

## Team Broker Boundary

This card closes Lane B. It must leave RFT-0001 / Lane A files untouched and
must not claim ownership of `next.ts` follow-up work.
