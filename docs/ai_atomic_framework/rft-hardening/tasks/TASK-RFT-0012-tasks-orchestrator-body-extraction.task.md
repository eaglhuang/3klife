---
doc_id: doc_rft_0012
task_id: TASK-RFT-0012
title: "tasks.ts orchestrator body extraction (close/import/verify)"
status: planned
owner: atm-core
priority: P0
milestone: RFT-M4
depends_on: [TASK-RFT-0010, TASK-RFT-0011]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/close-orchestrator.ts"
  - "packages/cli/src/commands/tasks/import-orchestrator.ts"
  - "packages/cli/src/commands/tasks/verify-orchestrator.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-orchestrator.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/verify-orchestrator.spec.ts"
  - "scripts/validate-tasks-orchestrator-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/close-orchestrator.ts"
  - "packages/cli/src/commands/tasks/import-orchestrator.ts"
  - "packages/cli/src/commands/tasks/verify-orchestrator.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-orchestrator.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/verify-orchestrator.spec.ts"
  - "scripts/validate-tasks-orchestrator-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-tasks-orchestrator-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/close-orchestrator.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/verify-orchestrator.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if orchestrator extraction changes CLI semantics for tasks close, tasks import, or tasks verify golden paths."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-atomic-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Extracting helper clusters that runTasksClose depends on (that is TASK-RFT-0013)"
  - "Changing public CLI verb names or JSON field names"
  - "Rewriting already-extracted atoms from RFT-0010"
nonGoals:
  - "Do not chase further line-count reduction by inlining helpers into orchestrators; the split is shell-first, helpers stay put for now"
  - "Do not treat this card as a full facade rewrite; orchestrators still contain their existing helper calls"
---

# TASK-RFT-0012 — tasks.ts orchestrator body extraction

## Goal

Move the three largest orchestrator bodies (`runTasksClose`, `runTasksImport`, `runTasksVerify`) out of `tasks.ts` and into named sub-orchestrator modules, so the facade shrinks from ~7,484 to ~6,400 lines and future refactors can target the orchestrators individually.

## Atom/Map Extraction Pattern

- `tasks/close-orchestrator.ts` — houses `runTasksClose`. Imports and reuses all existing sibling atoms (`close-governance.ts`, `status-triangulation.ts`, `residue-diagnostics.ts`, `closeout-provenance.ts`, `close-window-lock.ts`, `historical-delivery.ts`, `planning-mirror-close-diagnostics.ts`, etc.). No helper is moved; only the top-level function body.
- `tasks/import-orchestrator.ts` — houses `runTasksImport`. Imports `import-verify.ts` + `task-import-validators.ts` + `task-file-io-helpers.ts` + `task-markdown-helpers.ts`.
- `tasks/verify-orchestrator.ts` — houses `runTasksVerify`. Imports `import-verify.ts` + `result-contracts.ts` + `historical-delivery.ts`.

`tasks.ts` becomes a genuine argv-router: parse subcommand, dispatch to the orchestrator, format result. No behavior change.

## Required Behavior

- `tasks close`, `tasks import`, `tasks verify` produce byte-identical stdout JSON (compared by `diff` after normalizing timestamps).
- All existing task test suites (including `tasks.spec.ts`) pass unchanged.
- `taskflow close --write` continues to route through the new orchestrator files without hitting broken imports.

## Execution Plan

- Move `runTasksClose` verbatim (imports adjusted).
- Move `runTasksImport` verbatim.
- Move `runTasksVerify` verbatim.
- Update `tasks.ts` router to import the three symbols.
- Verify byte-identical CLI output on the golden paths.

## Testing Requirements

- `close-orchestrator.spec.ts`: normal-close / historical-delivery / historical-batch / rollback happy paths.
- `import-orchestrator.spec.ts`: fresh-open / drift / reset-open / emergency-lease paths.
- `verify-orchestrator.spec.ts`: pass / fail / diagnostic-sort.

## Validation

`scripts/validate-tasks-orchestrator-atomic-map.ts` asserts that:
- `runTasksClose`, `runTasksImport`, `runTasksVerify` are no longer defined in `tasks.ts`
- Each has moved to its named sub-orchestrator file
- `tasks.ts` imports each symbol from its new home
- Line count of `tasks.ts` is under 6,600 (down from ~7,484)

## Why This Runs Second

TASK-RFT-0011 must land first so `taskflow close --write --auto-evidence` runs cleanly on this card's validators without emergency leases.
