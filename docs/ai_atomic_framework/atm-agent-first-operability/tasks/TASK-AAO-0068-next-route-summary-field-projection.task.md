---
doc_id: doc_other_aao_0068
task_id: TASK-AAO-0068
title: "next route summary and field projection"
status: planned
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - "TASK-AAO-0061"
  - "TASK-AAO-0065"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/output-projection.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/output-projection.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Additive flags only; revert removes `--summary` and `--fields` but leaves existing `--json` and `--output-json` behaviour intact."
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Refresh entries for next.ts and tasks.ts to cover the new summary-projection helpers; update task-output-formatters.ts entry if split happened in TASK-AAO-0061."
outOfScope:
  - "Streaming or NDJSON output"
  - "Interactive field selection UI"
  - "File-write routing (see TASK-AAO-0065)"
  - "Field projection on commands beyond `next` and `tasks show`"
nonGoals:
  - "Do not break existing `--json` or `--output-json` callers"
  - "Do not introduce `--fields` projection that hides fields the close gate depends on without documentation"
  - "Do not change exit codes"
tags:
  - "cli-ergonomics"
  - "agent-operability"
---

# TASK-AAO-0068 - next route summary and field projection

## Goal

Add `--summary` (default compact subset) and `--fields <comma-list>` to `node atm.mjs next` and `node atm.mjs tasks show`. With `--summary`, the envelope is projected to a documented default subset (`taskId`, `status`, `claimedByActor`, `allowedFilesCount`, `nextAction.code`). With `--fields <comma-list>`, the envelope is projected to the caller-specified top-level keys plus `ok`, `command`, `mode`, and `warnings[]`.

## Why

The current `next --task <id> --json` envelope is extremely large (full playbook, evidence schemas, decisionTrail), wasting agent context window when callers only need a compact status view. Adding a summary flag and field projection flag collapses common read-only use cases into a single compact call, compounding savings across every agent invocation.

## Acceptance Criteria

- `node atm.mjs next --task <id> --json --summary` returns only the documented default summary subset.
- `node atm.mjs next --task <id> --json --fields taskId,status` returns `{taskId, status, ok, command, mode}` plus `warnings[]` if any.
- `node atm.mjs tasks show --task <id> --json --fields status,claimedByActor` applies the same projection.
- Existing `--json` behaviour (full envelope) is unchanged; `validate:cli` shows zero regression.
- A test in `next.spec.ts` and `tasks.spec.ts` each assert the projected shape for at least two field combinations.

## Stop Conditions

- If a `--fields` projection would hide a field the close gate depends on, do not include that field in the default `--summary` subset; document the constraint and stop.
- If `--summary` and `--fields` interact ambiguously (e.g., both flags given), define precedence in a `captain-decision` shard rather than silently merging.
