---
task_id: TASK-AAO-0103
title: "Environment and workspace hygiene preflight"
status: open
priority: high
created_at: 2026-06-01T15:38:52+08:00
created_by_agent: codex-gpt-5.4-mini
closure_authority: target_repo
depends_on:
  - TASK-AAO-0027
  - TASK-AAO-0047
  - TASK-AAO-0060
scopePaths:
  - atm.mjs
  - package.json
  - packages/cli/dist/atm.js
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - packages/cli/src/commands/framework-development.ts
  - packages/cli/src/commands/hook.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/tasks/task-option-parsers.ts
  - release/atm-onefile/atm.mjs
  - scripts/validate-cli.ts
  - scripts/validate-git-hooks-enforcement.ts
  - scripts/validate-task-ledger-governance.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
deliverables:
  - "Environment preflight report for node_modules, tsc, ajv, and runner sync"
  - "Workspace hygiene decision log for package-lock drift routing and false-M diagnostics"
  - "Evidence-backed preflight checklist for future task starts"
validators:
  - "npm run typecheck"
  - "npm run build"
  - "npm run validate:cli"
  - "npm run validate:git-hooks-enforcement"
  - "npm run validate:task-ledger-governance"
  - "node atm.mjs next --prompt \"environment workspace hygiene preflight\" --json"
atomizationImpact: "Captures the reusable preflight hygiene workflow so future ATM tasks can detect node_modules/tsc/ajv gaps, route package-lock drift to follow-up governance, handle runner sync, and detect false modified-state signals before task work starts."
outOfScope:
  - "Source feature work"
  - "Editing package.json"
  - "Editing source, dist, or release artifacts"
  - "Repairing package-lock.json"
  - "Editing node_modules"
  - "Any 3KLife files beyond this task card and the AAO ledger"
nonGoals:
  - "Task closure"
  - "Changing validator behavior without a separate follow-up task"
notes: "2026-06-01 | status: open | validation: pending | change: formalized environment/workspace hygiene preflight | blocker: none | risk: node_modules/tsc/ajv drift, package-lock drift routing, runner sync, false-M diagnostics | package-lock remediation handled by TASK-AAO-0107"
---

# TASK-AAO-0103 Environment and workspace hygiene preflight

## Goal
Create a Phase 0 hygiene preflight that makes common environment drift visible before a task starts.

## Scope
- Verify whether `node_modules/.bin/tsc.cmd` exists before work begins.
- Verify whether `ajv` is installed before work begins.
- If `ATM_RUNNER_SYNC_REQUIRED` appears, require `npm run build` and rerun the same check.
- Treat any `package-lock.json` diff introduced during a task as an explicit decision, not a silent carry-on.
- Diagnose cases where `git status` shows `M` but `git diff` is empty.
- Classify untracked files instead of blanket-cleaning or blanket-ignoring them.
- Route package-lock drift to governance rather than fixing it in this card.

## Acceptance Criteria
- The preflight documents how to check `node_modules/.bin/tsc.cmd` before opening work.
- The preflight documents how to check for `ajv` before opening work.
- The preflight requires a build-and-rerun step whenever `ATM_RUNNER_SYNC_REQUIRED` is emitted.
- The preflight requires a routing decision for any `package-lock.json` diff caused by an in-task `npm install`, with remediation delegated to TASK-AAO-0107.
- The preflight defines a diagnostic rule for `git status` showing `M` while `git diff` is empty.
- The preflight forbids treating untracked files as automatically safe to ignore.

## Validators
- `npm run typecheck`
- `npm run build`
- `npm run validate:cli`
- `npm run validate:git-hooks-enforcement`
- `npm run validate:task-ledger-governance`
- `node atm.mjs next --prompt "environment workspace hygiene preflight" --json`

## Notes
This is a planning-only Phase 0 card. It exists to keep future tasks from burning time on environment drift, runner skew, or false-positive modified-state noise.
