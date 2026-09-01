---
task_id: TASK-TMP-0009
title: Restore lint baseline by consolidating duplicate imports
status: planned
owner: codex-captain-recovery
priority: P1
depends_on: []
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Temporary, mechanical lint-baseline recovery. This card exists only to remove three duplicate-import failures that block independent closeout validation; it introduces no runtime behavior and closes once the baseline is restored.
scopePaths:
  - packages/cli/src/commands/broker/steward-queues.ts
  - packages/cli/src/commands/next/route-resolution/pending-worktree.ts
  - packages/cli/src/commands/taskflow/historical-close-preflight.ts
deliverables:
  - packages/cli/src/commands/broker/steward-queues.ts
  - packages/cli/src/commands/next/route-resolution/pending-worktree.ts
  - packages/cli/src/commands/taskflow/historical-close-preflight.ts
validators:
  - npm run lint
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only the import declaration consolidation; no runtime behavior, generated output, or task ledger is part of the delivery.
tddMode: reasoned-not-applicable
tddReason: The change only coalesces duplicate TypeScript import declarations and must preserve imported bindings; lint and typecheck are the direct executable oracle.
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-TMP-0009 Restore lint baseline by consolidating duplicate imports

## Intent

Restore the repository lint baseline without expanding the independent certification card. Each of the three files imports from the same module in separate declarations, which violates the repository's no-duplicate-import rule even though runtime behavior is unchanged.

This is temporary recovery work, not a new policy: merge each same-module type/value import into one declaration while preserving the imported symbols, source module, and type-only semantics.

## Required Work

- Consolidate the duplicate import from `./parser.ts` in `steward-queues.ts`.
- Consolidate the duplicate import from `../../planning-repo-root.ts` in `pending-worktree.ts`.
- Consolidate the duplicate import from `../git-index-ownership.ts` in `historical-close-preflight.ts`.
- Do not alter control flow, exports, runtime values, tests, generated artifacts, or unrelated lint warnings.

## Acceptance

- [ ] Each affected module has at most one import declaration per referenced source module.
- [ ] Imported symbols retain the same type/value semantics and source module.
- [ ] `npm run lint` exits 0.
- [ ] `npm run typecheck` exits 0.
- [ ] Diff contains only the three declared import consolidations and governed task evidence.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-14T13:33:11.507Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0009-restore-lint-baseline-by-consolidating-duplicate-imports.task.md","contentDigest":"sha256:cf0d8664995e2a04e27020c52a8dba42a9333b56409ce4dbcd7a6bdfd3dd6eba"} -->
