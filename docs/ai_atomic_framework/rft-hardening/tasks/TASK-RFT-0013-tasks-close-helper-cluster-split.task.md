---
doc_id: doc_rft_0013
task_id: TASK-RFT-0013
title: "tasks.ts close helper cluster split (closure-packet + framework-close + broker-lifecycle + plugin-registry)"
status: planned
owner: atm-core
priority: P0
milestone: RFT-M4
depends_on: [TASK-RFT-0010, TASK-RFT-0011, TASK-RFT-0012]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/close-helpers/closure-packet-writer.ts"
  - "packages/cli/src/commands/tasks/close-helpers/framework-close-transaction.ts"
  - "packages/cli/src/commands/tasks/close-helpers/broker-lifecycle.ts"
  - "packages/cli/src/commands/tasks/close-helpers/plugin-registry.ts"
  - "packages/cli/src/commands/tasks/close-orchestrator.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-helpers-closure-packet-writer.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-helpers-framework-close-transaction.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-helpers-broker-lifecycle.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-helpers-plugin-registry.spec.ts"
  - "scripts/validate-tasks-close-helpers-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/close-helpers/closure-packet-writer.ts"
  - "packages/cli/src/commands/tasks/close-helpers/framework-close-transaction.ts"
  - "packages/cli/src/commands/tasks/close-helpers/broker-lifecycle.ts"
  - "packages/cli/src/commands/tasks/close-helpers/plugin-registry.ts"
  - "packages/cli/src/commands/tasks/close-orchestrator.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-helpers-closure-packet-writer.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-helpers-framework-close-transaction.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-helpers-broker-lifecycle.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-helpers-plugin-registry.spec.ts"
  - "scripts/validate-tasks-close-helpers-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-tasks-close-helpers-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/close-helpers-closure-packet-writer.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/close-helpers-framework-close-transaction.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/close-helpers-broker-lifecycle.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/close-helpers-plugin-registry.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if any helper split changes tasks close semantics on the closure-packet write, framework close transaction, broker release, or plugin registry paths."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-atomic-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Rewriting the closure-packet schema"
  - "Rewriting broker or framework-close semantics"
  - "Extracting helpers for runTasksImport or runTasksVerify (those are follow-up RFT cards if needed)"
nonGoals:
  - "Do not merge helpers into a single mega-file; each of the four helper clusters gets its own module"
  - "Do not treat this card as a full architecture change; only helper ownership moves"
---

# TASK-RFT-0013 — tasks.ts close helper cluster split

## Goal

Extract the four helper clusters that `runTasksClose` still depends on inside `tasks.ts` into named modules under `tasks/close-helpers/`, so that `close-orchestrator.ts` (from RFT-0012) becomes a genuine thin orchestrator delegating to focused helpers and `tasks.ts` drops below 1,500 lines.

## Atom/Map Extraction Pattern

- `tasks/close-helpers/closure-packet-writer.ts` — write / verify / repair closure packets.
- `tasks/close-helpers/framework-close-transaction.ts` — framework-close transaction lifecycle (open / commit / rollback).
- `tasks/close-helpers/broker-lifecycle.ts` — broker register / decision / release during close.
- `tasks/close-helpers/plugin-registry.ts` — plugin registry lookup and dispatch during close.

`close-orchestrator.ts` imports each helper. `tasks.ts` retains only argv routing plus the small set of helpers used across multiple orchestrators.

## Required Behavior

- `tasks close`, `taskflow close --write`, and `evidence historical-batch → tasks close` produce byte-identical stdout JSON.
- Broker release semantics unchanged (idempotent, tolerant of missing lease).
- Framework-close transaction rollback semantics unchanged.

## Execution Plan

- Extract each helper cluster verbatim, adjusting imports.
- Update `close-orchestrator.ts` to import from the new helper modules.
- Measure `tasks.ts` line count before/after.

## Testing Requirements

- One spec per helper cluster covering the main branches (happy path + one failure + one rollback path where applicable).

## Validation

`scripts/validate-tasks-close-helpers-atomic-map.ts` asserts:
- Each helper module exists under `tasks/close-helpers/`
- `close-orchestrator.ts` imports each helper
- `tasks.ts` line count is under 1,500 (major reduction from ~6,400 after RFT-0012)
- `docs/reports/tasks-command-atomic-map.md` reflects the six-layer map (Facade / Sub-Orchestrators / Policy Objects / Strategy Maps / Result Contracts / Close Helpers)

## Why This Runs Third

RFT-0012 must land first so `close-orchestrator.ts` exists as the import target for the new helpers. After this card `tasks.ts` is finally under the "thin facade" threshold and the tasks command surface is layered into named atoms with focused ownership.
