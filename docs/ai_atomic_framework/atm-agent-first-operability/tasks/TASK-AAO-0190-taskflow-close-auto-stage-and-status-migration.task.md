---
task_id: TASK-AAO-0190
title: "Fix taskflow close UX for auto-stage and --status migration"
status: done
owner: cursor-grok-4.5
priority: P2
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-151
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "tests/cli/taskflow-status-migration-hint.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts"
  - "tests/cli/taskflow-status-migration-hint.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts"
  - "node --strip-types tests/cli/taskflow-status-migration-hint.test.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert auto-stage remediation hints and taskflow --status migration text if the governed commit staging contract changes."
atomizationImpact:
  ownerAtomOrMap: "atm.cli-command-router-map"
  mapUpdates: []
  extractionCandidates:
    - disposition: inline
      path: packages/cli/src/commands/shared.ts
      inlineReason: "Targeted ATM_CLI_USAGE migration hint for taskflow --status only; no new module boundary."
    - disposition: inline
      path: packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
      inlineReason: "One-line --auto-stage hint alignment; no extraction required."
outOfScope:
  - "release/**"
  - "Changing tasks close low-level semantics"
  - "Editing .atm/history or .atm/runtime by hand"
started_at: "2026-07-13T09:07:20.374Z"
started_by_agent: "cursor-grok-4.5"
completed_at: "2026-07-13T09:14:51.015Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-13T09:14:51.015Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T09-14-50-924Z-close-b85c7f839112"
lastTransitionAt: "2026-07-13T09:14:51.015Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f69b2a17424b5a844898219b0a0812a2fda06ead"
closure_commit: "ae1532abaf455220747365b847490c6365668455"
notes: "Retroactively formalized in 3KLife AAO tasks after target-repo-only import/close. Planning card was missing at claim time."
---

# TASK-AAO-0190 Fix taskflow close UX for auto-stage and --status migration

## Problem

`ATM-BUG-2026-07-12-151`:

1. `taskflow pre-close` / dirty-guard remediation suggested
   `node atm.mjs git commit ... --json` without `--auto-stage`, so the first
   attempt failed with `ATM_GIT_COMMIT_TASK_SCOPED_STAGING_REQUIRED`.
2. Passing low-level `--status done` to `taskflow close` produced a generic
   `ATM_CLI_USAGE` instead of a targeted migration hint.

## Goal

- Emit copy-paste-ready governed commit commands that include `--auto-stage`
  for target-repo remediation.
- When `taskflow` receives `--status`, print a migration hint that points
  operators to omit the flag on `taskflow close`, or use
  `tasks close --status ...` for the low-level backend lane.
- Cover both behaviors with focused regressions.

## Acceptance Criteria

- Dirty-guard `requiredCommand` includes `--auto-stage`.
- `commitCommandFor` target-repo hint includes `--auto-stage`.
- `node atm.dev.mjs taskflow close --task <id> --status done --json` returns
  `ATM_CLI_USAGE` with a migration hint naming `tasks close --status` / omit
  `--status` on taskflow.
- Validators listed above pass.
- Backlog row `ATM-BUG-2026-07-12-151` is marked fixed.

## Delivery

- Target delivery commit: `f69b2a17424b5a844898219b0a0812a2fda06ead`
- Target close commit: `ae1532abaf455220747365b847490c6365668455`
- Actor: `cursor-grok-4.5`

## Planning note

This card was retro-authored in the 3KLife AAO planning directory after the
target-repo lane had already delivered and closed. The miss itself is recorded
as `ATM-BUG-2026-07-13-176`.
