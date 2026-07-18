---
task_id: TASK-AAO-0085
title: "Context Map schema dual card extension (Layer 3)"
status: done
priority: P1
closure_authority: target_repo
depends_on:
  - TASK-AAO-0083
  - TASK-AAO-0084
scopePaths:
  - "schemas/governance/work-item.schema.json"
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/atm-markdown-task-source/src/index.ts"
  - "tests/cli/work-item-context-map.test.ts"
deliverables:
  - "schemas/governance/work-item.schema.json"
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/atm-markdown-task-source/src/index.ts"
  - "tests/cli/work-item-context-map.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run test -- tests/cli/work-item-context-map.test.ts"
  - "git diff --check"
  - "npm run validate:git-head-evidence"
atomizationImpact:
  ownerAtomOrMap: "atm.cli-tasks-map"
  mapUpdates:
    - path_pattern: "tests/cli/work-item-context-map.test.ts"
      atom_id: "atm.test-tasks-cli"
      capability: "CLI work-item contextMap schema import tests"
      coverage_status: "active"
outOfScope:
  - "advisory check / hook 預警 — 留 TASK-AAO-0086 或後續"
  - "強制驗證 Secondary 檔變動 — 留後續"
nonGoals:
  - "Do not upgrade schemaVersion to v0.3 (must stay at v0.2 as a purely additive change)"
  - "Do not migrate existing 84 task ledger records"
  - "Do not add advisory check in hook.ts (leave that for TASK-AAO-0086)"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
completed_at: "2026-06-07T23:12:15+08:00"
completed_by_agent: "historical-backfill"
closedAt: "2026-06-07T23:12:15+08:00"
closedByActor: "historical-backfill"
closedByCommand: "historical planning closeback backfill for TASK-CID-0124"
lastTransitionId: "2026-06-07T23-12-15+08-00-close-2c99a7fa71b0"
lastTransitionAt: "2026-06-07T23:12:15+08:00"
ledgerContractVersion: "task-ledger/v1"
delivery_commit: "343ce28f884ce0aa4d7ff45704601c7024f19581"
---

## Goal
Extend the work-item schema with a nested `contextMap` configuration (containing `primary`, `secondary`, `tests`, and `patterns` optional array fields). Implement robust parser logic inside CLI task import validators and standard markdown plugin to cleanly propagate the `contextMap` to the ledger, and construct comprehensive CLI integration tests.

## Acceptance
- `schemas/governance/work-item.schema.json` defines optional `contextMap` with `primary`, `secondary`, `tests`, and `patterns` structures.
- `packages/cli/src/commands/tasks/task-import-validators.ts` implements `parseContextMap` helper and successfully parses `frontmatter.contextMap`.
- `packages/cli/src/commands/tasks.ts` propagates `contextMap` field into top-level ledger write operations.
- `packages/atm-markdown-task-source/src/index.ts` cleanly passes `contextMap` through `ParsedExternalTask` transparently.
- `tests/cli/work-item-context-map.test.ts` covers mock import tests with and without `contextMap`, and ensures backward-compatible byte-identical imports for existing 0083 task cards.
