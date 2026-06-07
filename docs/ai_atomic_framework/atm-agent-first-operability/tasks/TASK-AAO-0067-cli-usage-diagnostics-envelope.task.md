---
doc_id: doc_other_aao_0067
task_id: TASK-AAO-0067
title: "CLI usage diagnostics"
status: done
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - "TASK-AAO-0002"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/shared.ts"
  - "scripts/validate-cli.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/shared.ts"
  - "scripts/validate-cli.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "CliError envelope additions are backward-compatible; revert removes new diagnostic fields without breaking callers."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Add or refresh entries for shared.ts (envelope enrichment)."
outOfScope:
  - "Interactive flag suggestions or fuzzy matching"
  - "Localization of error messages"
  - "Rewriting CliError into a class hierarchy"
  - "Roster sync or README rewrite (see TASK-AAO-0069)"
nonGoals:
  - "Do not change exit codes returned by ATM_CLI_USAGE"
  - "Do not auto-repair user-supplied invalid commands"
tags:
  - "cli-ergonomics"
  - "agent-operability"
  - "governance-safety"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---

# TASK-AAO-0067 - CLI usage diagnostics

## Goal

Enrich every `ATM_CLI_USAGE` error envelope with canonical diagnostic arrays — `invalidFlags`, `missingRequired`, `allowedFlags`, plus an optional `suggestedCommand` — wired through `parseOptions` in `shared.ts` and the `CliError` constructor.

## Why

`ATM_CLI_USAGE` today is a catch-all that fires for unknown action, unknown flag, and missing required argument with no `data` to distinguish them. Operators and agents must inspect source code or trial-and-error their way to the wrong flag. Enriching the envelope with machine-readable diagnostic arrays gives callers a direct repair path without any source inspection.

## Acceptance Criteria

- Every `ATM_CLI_USAGE` envelope produced by `parseOptions` includes `data.invalidFlags: string[]`, `data.missingRequired: string[]`, `data.allowedFlags: string[]`, and may include `data.suggestedCommand: string | null`.
- A regression test in `scripts/validate-cli.ts` asserts the new envelope shape for at least three usage failure modes (unknown action, unknown flag, missing required argument).
- Existing exit codes for `ATM_CLI_USAGE` are unchanged.

## Stop Conditions

- If enriching `ATM_CLI_USAGE` requires changing the public error-code literal, stop and document in a `captain-decision` shard; this card is data-only.
