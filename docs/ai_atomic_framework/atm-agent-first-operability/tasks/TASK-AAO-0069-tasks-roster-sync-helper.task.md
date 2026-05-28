---
doc_id: doc_other_aao_0069
task_id: TASK-AAO-0069
title: "tasks roster sync helper"
status: planned
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - "TASK-AAO-0025"
  - "TASK-AAO-0061"
  - "TASK-AAO-0067"
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
  notes: "Additive subcommand; revert removes `tasks roster update` without touching existing task commands or on-disk task records."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Add entries for the new roster sync surface in tasks.ts; update task-planning-doc.ts entry if that helper is introduced by TASK-AAO-0061."
outOfScope:
  - "Interactive flag suggestions or fuzzy matching"
  - "Full README regeneration beyond roster table sections"
  - "Roster sync for non-AAO task families"
nonGoals:
  - "Do not rewrite README sections unrelated to the roster table"
  - "Do not modify task card files on disk during sync"
  - "Do not emit ATM_CLI_USAGE for missing index without the enriched diagnostics from TASK-AAO-0067"
tags:
  - "cli-ergonomics"
  - "agent-operability"
  - "governance-safety"
---

# TASK-AAO-0069 - tasks roster sync helper

## Goal

Add `node atm.mjs tasks roster update --index <readme-path> --from <task-file> --dry-run --json` (and without `--dry-run`) that reads the frontmatter of a single `*.task.md` file and rewrites the matching roster table row in the target README to reflect the live card values (`title`, `status`, `depends_on`, `scopePaths`, `validators`). The `--dry-run` variant returns a diff of would-be changes without writing. The write variant rewrites only the matching table row, preserves all other README content byte-for-byte, and emits an `evidence` block recording the change.

## Why

The AAO `README.md` roster table drifts silently each time a card is updated — there is no command that re-syncs it from frontmatter, so the README and the on-disk cards diverge until someone notices manually. A targeted per-card update command (rather than a full re-render) is safe, deterministic, and easy to wire into a post-edit hook.

## Acceptance Criteria

- `node atm.mjs tasks roster update --index <readme> --from <task-file> --dry-run --json` returns a diff of would-be roster row changes without writing the file.
- `node atm.mjs tasks roster update --index <readme> --from <task-file> --json` rewrites only the matching roster table row, preserves all other README content byte-for-byte, and emits an `evidence` block recording the change.
- If the task id from `<task-file>` does not appear in the roster table of `<readme>`, the command returns `ok: false` with a diagnostic rather than silently inserting a new row.
- A regression test in `scripts/validate-task-ledger-governance.ts` covers the dry-run path and the write path against a fixture README.
- The `--dry-run` path provably does NOT write `<readme>` (validated by file-hash comparison before and after).

## Stop Conditions

- If `tasks roster update` cannot reliably identify the table row boundaries in the target README (e.g., multi-line cells, non-standard markdown table), ship with `--dry-run` only and defer the rewrite to a follow-up card.
