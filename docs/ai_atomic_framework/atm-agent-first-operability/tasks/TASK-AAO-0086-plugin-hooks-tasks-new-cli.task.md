---
task_id: TASK-AAO-0086
title: "plugin hooks + tasks new CLI (4 卡系列收尾)"
status: done
priority: P1
closure_authority: target_repo
depends_on:
  - TASK-AAO-0083
  - TASK-AAO-0084
  - TASK-AAO-0085
scopePaths:
  - "packages/atm-markdown-task-source/src/index.ts"
  - "packages/atm-markdown-task-source/templates/aao-l2-split-template.md"
  - "packages/atm-markdown-task-source/src/templates.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli/tasks-new.test.ts"
  - "tests/plugin-sdk/atm-markdown-task-source-hooks.test.ts"
deliverables:
  - "packages/atm-markdown-task-source/src/index.ts"
  - "packages/atm-markdown-task-source/templates/aao-l2-split-template.md"
  - "packages/atm-markdown-task-source/src/templates.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli/tasks-new.test.ts"
  - "tests/plugin-sdk/atm-markdown-task-source-hooks.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run test -- tests/cli/tasks-new.test.ts"
  - "npm run test -- tests/plugin-sdk/atm-markdown-task-source-hooks.test.ts"
  - "git diff --check"
atomizationImpact:
  ownerAtomOrMap: "atm.plugin-sdk-map"
  mapUpdates:
    - path_pattern: "packages/atm-markdown-task-source/src/templates.ts"
      atom_id: "atm.markdown-task-source-plugin"
      capability: "Template loader for task template generation"
      coverage_status: "active"
outOfScope:
  - "advisory check in commit hook — 留 TASK-AAO-0087+"
  - "多個 reference templates — 本卡只 bundle 1 個（aao-l2-split）"
  - "3KLife task-card-opener consume 上游 — 3KLife 端決定"
  - "doc_id-registry / HARN brief 等 downstream 特有邏輯"
nonGoals:
  - "Do not modify target close or import workflows"
  - "Do not add advisory check in hook.ts"
  - "Do not upgrade schemaVersion (keep v0.2)"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
completed_at: "2026-06-07T23:12:15+08:00"
completed_by_agent: "historical-backfill"
closedAt: "2026-06-07T23:12:15+08:00"
closedByActor: "historical-backfill"
closedByCommand: "historical planning closeback backfill for TASK-CID-0124"
lastTransitionId: "2026-06-07T23-12-15+08-00-close-c55d358f3797"
lastTransitionAt: "2026-06-07T23:12:15+08:00"
ledgerContractVersion: "task-ledger/v1"
delivery_commit: "343ce28f884ce0aa4d7ff45704601c7024f19581"
---

## Goal
Complete the 4-card external task source plugin architecture by implementing `validate` and `generate` hooks inside `atm-markdown-task-source`. Bundle the standard `aao-l2-split` task template, create a template loader, register the new `tasks new` sub-command inside the CLI command specs, routing it to plugin template generation, and implement comprehensive CLI and hook validation tests.

## Acceptance
- `packages/atm-markdown-task-source/src/index.ts` provides robust implementations of `validate` and `generate` hooks.
- `packages/atm-markdown-task-source/templates/aao-l2-split-template.md` is created with proper frontmatter, contextMap, and phase placeholders.
- `packages/atm-markdown-task-source/src/templates.ts` implements template list, load, and replacement logic.
- `packages/cli/src/commands/tasks.ts` handles the `tasks new` sub-command and invokes plugin template generation.
- `packages/cli/src/commands/command-specs/tasks.spec.ts` registers `tasks new` with type-safe argument spec validation.
- `tests/cli/tasks-new.test.ts` validates CLI generation execution and JSON/Markdown output formatting.
- `tests/plugin-sdk/atm-markdown-task-source-hooks.test.ts` verifies hook behaviors (diagnostics warning on incomplete contextMap, round-trip generation parsing).
