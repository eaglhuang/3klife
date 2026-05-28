---
doc_id: doc_other_aao_0065
task_id: TASK-AAO-0065
title: "CLI output-json file writer flag"
status: planned
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - "TASK-AAO-0003"
  - "TASK-AAO-0034"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
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
  notes: "Additive flag only; revert removes `--output-json <path>` wiring without touching existing `--json` behaviour."
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Refresh entries for next.ts, tasks.ts, and shared.ts to cover the new output-json file-writer helper."
outOfScope:
  - "Streaming or NDJSON output"
  - "Interactive field selection UI"
  - "Replacing the existing `--json` flag"
  - "Field projection or summary subset selection (see TASK-AAO-0068)"
  - "Stdout clean-mode semantics for existing `--json`"
nonGoals:
  - "Do not break existing `--json` callers"
  - "Do not add `--output-json` semantics that hide errors"
  - "Do not introduce `--fields` or `--summary` on any command (see TASK-AAO-0068)"
tags:
  - "cli-ergonomics"
  - "agent-operability"
---

# TASK-AAO-0065 - CLI output-json file writer flag

## Goal

Add `--output-json <path>` to all commands that currently support `--json`. With `--output-json <path>`, the JSON response is written to the file at `<path>` and stdout carries only non-JSON diagnostic lines (or nothing). This eliminates the stdout-pollution problem that causes `ConvertFrom-Json` failures on Windows/PowerShell — the caller reads the file rather than parsing stdout.

## Why

Agents running ATM on Windows/PowerShell routinely fail to `ConvertFrom-Json` ATM output because non-JSON warning prefixes (e.g., `ATM_RUNNER_SYNC_REQUIRED:`, build hints) contaminate stdout. Writing the JSON body to a named file decouples the structured response from the human-readable diagnostic stream without requiring changes to exit codes, error codes, or existing `--json` callers.

## Acceptance Criteria

- `node atm.mjs <any-cmd> --output-json <path>` writes a valid JSON object to `<path>` and emits nothing to stdout that would break `JSON.parse()` on `<path>`.
- All commands currently accepting `--json` also accept `--output-json <path>`; the flag is defined once in `shared.ts` and wired uniformly.
- Existing `--json` behaviour is unchanged; `validate:cli` shows zero regression.
- A test in `next.spec.ts` and `tasks.spec.ts` each assert that the file at `<path>` parses cleanly and that stdout contains no JSON body when `--output-json` is used.

## Stop Conditions

- If `--output-json` requires changing the exit-code semantics of any command, stop and reopen scope review; this card is output-routing-only.
- If file-write failures (permission denied, bad path) cannot be surfaced without polluting the JSON response, document the error surface in a `captain-decision` shard and stop.
