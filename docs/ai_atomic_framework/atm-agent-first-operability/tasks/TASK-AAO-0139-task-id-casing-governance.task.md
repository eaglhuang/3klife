---
doc_id: ""
task_id: TASK-AAO-0139
title: "Preserve task-id casing across import, close verification, and pre-commit transition checks"
milestone: M17
status: done
artifact_status: done
runtime_status: validated
upstream_mutation_status: applied
created: "2026-06-10"
created_by_agent: cursor-asp-runner
started_at: ""
started_by_agent: ""
blocked_by: []
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-task-id-casing-governance
planning_repo: 3KLife
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0139-task-id-casing-governance.task.md
related:
  - TASK-AAO-0135
  - TASK-AAO-0137
  - TASK-APO-0030
depends_on:
  - TASK-AAO-0135
depends: []
scopePaths:
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/hook.ts
  - tests/cli/task-id-casing.test.ts
deliverables:
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/hook.ts
  - tests/cli/task-id-casing.test.ts
validators:
  - npm run typecheck
  - npm run validate:cli
  - node --strip-types tests/cli/task-id-casing.test.ts
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.cli-tasks-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  newScriptsAllowed: false
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0139-task-id-casing-governance.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks/task-import-validators.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/hook.ts
  - C:/Users/User/AI-Atomic-Framework/tests/cli/task-id-casing.test.ts
  - C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not redesign the task-id format or introduce a new id allocation scheme (INV-ATM-001)."
  - "Do not relax the pre-commit transition-pairing requirement itself; only fix its path comparison."
  - "Do not hand-edit .atm/history or .atm/runtime state as part of the fix."
  - "Do not require ledger migration for existing uppercase-id tasks."
notes: "2026-06-11 | status: done | validation: passed | change: AAF 交付 c8ad9d5b + 治理 c655983b；政策 option (a) preserve authored casing | blocker: none"
outOfScope:
  - broker decision logic
  - taskflow opener numbering policy (separate from this casing fix)
contextMap:
  primary:
    - path: packages/cli/src/commands/tasks/task-import-validators.ts
      reason: normalizeTaskId currently uppercases authored ids at import
    - path: packages/cli/src/commands/tasks.ts
      reason: verifyPersistedTaskDocument identity check rolls back close on casing-only mismatch
    - path: packages/cli/src/commands/hook.ts
      reason: task-file-missing-transition uses case-sensitive staged path lookup
  secondary:
    - path: packages/cli/src/commands/batch.ts
      reason: queue head ids may preserve filename casing while ledger does not
  tests:
    - path: tests/cli/task-id-casing.test.ts
      reason: regression coverage for import, close verification, and hook pairing
  patterns:
    - referencePath: TASK-AAO-0135
      referenceTaskId: TASK-AAO-0135
      description: closure/import safety hardening in the same tasks.ts + hook.ts surfaces
---

# TASK-AAO-0139 Preserve task-id casing across import, close verification, and pre-commit transition checks

## Goal

Preserve authored task-id casing end-to-end so mixed-case planning cards can be imported, closed, and committed without rewriting ledger filenames or `task-events/` directories. Case-insensitive comparison may be used for matching and lookup, but the stored `workItemId` must remain the authored casing.

## Background

While closing `TASK-APO-0030-python-language-adapter-plugin` in batch `batch-d95420db3166` (AAF governance commit `eda4e412`), two defects surfaced:

1. **`tasks import` force-uppercases task ids.** `normalizeTaskId()` in `packages/cli/src/commands/tasks/task-import-validators.ts` currently applies `.toUpperCase()` to the whole id, so a card with `task_id: TASK-APO-0030-python-language-adapter-plugin` lands in the ledger as `TASK-APO-0030-PYTHON-LANGUAGE-ADAPTER-PLUGIN`. Batch queues and prompt routing derive ids from file names with casing preserved, so the live ledger and the queue head disagree. On a case-insensitive filesystem (Windows) both ids resolve to the same ledger file, and `verifyPersistedTaskDocument()` in `tasks.ts` then fails its identity check, rolling back an otherwise valid close transaction (`ATM_TASK_CLOSE_TRANSACTION_FAILED`).

2. **The pre-commit hook compares staged paths too literally.** The `task-file-missing-transition` check in `packages/cli/src/commands/hook.ts` builds `expectedEventPath` from the ledger `workItemId` and looks it up in a staged-path string set. When the on-disk event directory casing differs from the ledger `workItemId` casing, the staged transition event is not recognized and the governance commit is blocked (`ATM_HOOK_PRE_COMMIT_FAILED`), even though the matching event is staged.

The observed workaround was hand-aligning `workItemId` casing and renaming `.atm/history/task-events/<id>/` directories, which is exactly the kind of direct `.atm` surgery the framework forbids.

## Exposing Decision

- Prior work: batch `batch-d95420db3166` closure of TASK-APO-0030 (2026-06-10).
- Related cards: `TASK-AAO-0135` (closure/import safety), `TASK-AAO-0137` (write-path atomicity).
- Decision: choose option (a), preserve authored `task_id` casing end-to-end.
- Gate that changes: `tasks import` identity normalization, `tasks close` persisted-identity verification, and pre-commit `task-file-missing-transition` path pairing.

## Acceptance Criteria

### 1. One canonical casing policy

- Preserve the authored `task_id` casing end-to-end.
- `normalizeTaskId()` may trim wrappers such as whitespace or backticks, but it must not uppercase authored ids during import.
- Queue and prompt routing may compare ids case-insensitively for matching, but they must not rewrite the persisted ledger casing.
- Existing uppercase-id tasks, such as `TASK-ASP-0001`, remain valid and do not require migration.

### 2. Close verification

- `verifyPersistedTaskDocument()` must accept casing-only differences between the queue/head id and the persisted ledger id.
- The comparison should use a case-folded canonical id for equality checks, while leaving the persisted `workItemId` unchanged.
- A valid close must not roll back because of a casing-only difference.

### 3. Pre-commit transition pairing

- The `task-file-missing-transition` check must match the staged transition event using a case-insensitive path comparison against the expected `.atm/history/task-events/<taskId>/<lastTransitionId>.json` record.
- A ledger/event-directory casing skew must not block a governed commit.
- The hook must not require manual renaming of existing `task-events/` directories.

### 4. Regression tests

`tests/cli/task-id-casing.test.ts` covers:

- import of a mixed-case `task_id` and the resulting ledger `workItemId`;
- close verification passing when queue id casing and ledger casing differ only by case;
- hook transition-pairing check passing when the staged event directory casing differs from `workItemId` casing;
- an uppercase legacy id such as `TASK-ASP-0001` remains accepted without migration.

## Verification

```bash
cd AI-Atomic-Framework
npm run typecheck
npm run validate:cli
node --strip-types tests/cli/task-id-casing.test.ts
```

## Rollback

Revert the delivery commit. No generated artifacts or ledger migrations are required.

## Closure & Reports

1. State the chosen policy explicitly in close notes: option (a), preserve authored casing.
2. Confirm the regression scenarios pass.
3. Confirm no manual `.atm/history` repair was required during claim, close, or governance commit.
