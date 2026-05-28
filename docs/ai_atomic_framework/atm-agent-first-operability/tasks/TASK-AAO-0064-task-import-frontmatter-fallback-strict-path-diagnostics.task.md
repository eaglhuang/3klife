---
doc_id: doc_other_aao_0064
task_id: TASK-AAO-0064
title: "Task import frontmatter fallback and strict path diagnostics"
status: planned
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - "TASK-AAO-0038"
  - "TASK-AAO-0052"
  - "TASK-AAO-0061"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the frontmatter precedence and strict-path validator additions; no on-disk task records are rewritten by this change."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Refresh entries for tasks.ts and validate-task-ledger-governance.ts to cover the new diagnostic surface."
outOfScope:
  - "Redesign of the markdown body parser"
  - "Retroactive sanitization of existing task cards already on disk"
  - "Migration of legacy task card formats"
nonGoals:
  - "Do not strip body sections silently"
  - "Do not change the default behaviour of `tasks import` without `--strict-paths`"
  - "Do not modify frontmatter parsing for non-deliverable fields"
tags:
  - "governance-safety"
  - "cli-ergonomics"
---

# TASK-AAO-0064 - Task import frontmatter fallback and strict path diagnostics

## Goal

(1) Make frontmatter canonical for `scopePaths` and `deliverables` — when those keys exist in YAML, skip the markdown body parser for the matching section and emit an `importDiagnostics` warning when the body restates the same field, so the operator sees that the body was ignored. (2) Add a strict-path validator that rejects entries containing sentence-boundary English words (e.g., the literal tokens `the`, `for`, `of`, `closure`, `packet` when surrounded by whitespace) or stray markdown bullet syntax. Surface violations as warnings by default; add a `--strict-paths` flag that escalates them to errors.

## Why

Operators routinely see `deliverables` arrays polluted with prose fragments like `"the closure packet"` because the body parser overrides clean frontmatter values. The result is silently broken task cards that fail later at close time when the deliverable gate cannot resolve the path. Treating frontmatter as canonical removes the override, and the strict-path validator catches the prose contamination before the task card enters the ledger.

## Acceptance Criteria

- `tasks import --from <file>` with both frontmatter `deliverables` and a body `## Deliverables` section uses only the frontmatter values and emits `importDiagnostics[]` containing `IMPORT_BODY_SECTION_IGNORED` (or equivalent).
- `tasks import --from <file>` flags every entry matching the strict-path heuristic in `importDiagnostics[]`.
- `tasks import --from <file> --strict-paths` returns non-zero exit and `ok: false` when any strict-path violation is detected.
- A regression test in `scripts/validate-task-ledger-governance.ts` covers a corrupt fixture and asserts both the warning and the strict-path escalation paths.

## Stop Conditions

- If the strict-path heuristic produces false positives on legitimate non-ASCII paths (CJK directories, accented characters), keep the heuristic conservative and document the boundary in the card; do not block CJK path imports.
