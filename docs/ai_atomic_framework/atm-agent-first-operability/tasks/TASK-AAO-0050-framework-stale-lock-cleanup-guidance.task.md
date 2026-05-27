---
doc_id: doc_task_aao_0050
task_id: TASK-AAO-0050
title: "Framework stale lock cleanup guidance"
status: planned
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "Prevents completed-task framework-mode locks from blocking the next governed delivery and forcing agents to choose between unsafe recovery options."
milestone: M16
depends_on:
  - "TASK-AAO-0040"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/guard.ts"
  - "packages/cli/src/commands/doctor.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/guard.ts"
  - "packages/cli/src/commands/doctor.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "node atm.mjs doctor --json"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert stale-lock classification, requiredCommand, and diagnostic changes; stale framework locks return to the previous manual recovery behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.framework-mode-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Reusing a completed-task framework lock for a different task"
  - "Skipping framework-mode, pre-commit, evidence, or protected-state gates"
  - "Manual deletion or hand editing of .atm/runtime/locks/**"
  - "Taking over a still-running task lock without explicit takeover or handoff"
nonGoals:
  - "Automatically deleting every old lock without checking task status and actor"
  - "Weakening framework critical file claim requirements"
  - "Replacing the framework-mode claim/release lifecycle"
---
# TASK-AAO-0050 - Framework stale lock cleanup guidance

## Goal

Make stale framework-mode lock recovery deterministic and safe when a completed task leaves a lock that blocks the next governed task for the same actor.

## Why

During AAO dogfood, a delivery commit for a later task was blocked by a stale framework-mode lock from an already completed prior task. Auto mode asked the agent to choose between releasing the stale lock, reusing it, or skipping framework-mode. The safe answer was release-then-fresh-claim, but ATM should classify that situation and provide the exact repair command instead of making agents infer the governance rule.

## Implementation Contract

- Detect when a framework-mode lock belongs to a different task than the current claim attempt.
- Classify the old lock before suggesting repair:
  - same task: renew or extend the existing lock;
  - different task and old task is done/abandoned/review with no matching active dirty scope: release stale lock, then require a fresh claim for the new task;
  - different task and old task is still running or unknown: block with takeover/handoff guidance;
  - missing or unreadable task metadata: require manual review, not automatic deletion.
- Recovery must use ATM CLI commands, not hand edits to `.atm/runtime/locks/**`.
- `Reuse existing lock` must not be the default recommendation when the task id differs.
- `Skip framework-mode` must remain disallowed for framework critical files.

## Deliverables

- Framework-mode claim/release diagnostics for stale completed-task locks.
- Pre-commit hook finding with a concrete `requiredCommand` for safe cleanup.
- Doctor or audit visibility for stale framework locks that can block future work.
- Regression coverage for a completed-task lock blocking a new task by the same actor.
- Atomization ownership map update for any touched command or validator paths.

## Validators

- npm run typecheck
- npm run validate:cli
- node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
- node atm.mjs doctor --json

## Acceptance Criteria

- A stale lock from a completed task produces a specific finding such as `ATM_FRAMEWORK_STALE_LOCK_CLEANUP_REQUIRED` or equivalent stable code.
- The finding includes the stale task id, current task id, actor id, lock path, and a safe `requiredCommand` sequence: release stale framework lock, then claim fresh for the current task.
- If the stale lock task is still running, ATM blocks cleanup and gives takeover/handoff guidance instead of release.
- If the actor differs, ATM does not recommend silent cleanup.
- If the task id differs, ATM does not recommend extending or reusing the old lock as the default path.
- Pre-commit hook output, framework-mode claim output, and doctor/audit diagnostics use the same classification rules.
- Regression evidence includes the dogfood shape: an old `TASK-AAO-0020` framework lock for `opus47-aao-doc-runner` blocks a fresh task until ATM guides release-then-claim.

## Rollback

Revert the task commit. Existing manual framework-mode release and claim commands remain available.

## Atomization Impact

- Owner atom/map: atm.framework-mode-governance-map
- Map updates: atomic_workbench/atomization-coverage/path-to-atom-map.json
- Any new validator fixture or command helper introduced by this card must be mapped before closure.

## Notes

This is an AAO P0 early unblocker because it prevents agents from choosing unsafe lock reuse or framework-mode bypass during critical framework commits.
