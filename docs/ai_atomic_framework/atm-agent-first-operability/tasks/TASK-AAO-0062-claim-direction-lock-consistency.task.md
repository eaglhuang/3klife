---
doc_id: doc_other_aao_0062
task_id: TASK-AAO-0062
title: "Claim direction lock consistency"
status: planned
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - "TASK-AAO-0012"
  - "TASK-AAO-0058"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-task-direction-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-task-direction-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-direction-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the direction-lock embed addition to `tasks claim`; runtime lock files are ephemeral, no migration needed."
atomizationImpact:
  ownerAtomOrMap: "atm.task-direction-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Update mapping entries for tasks.ts and task-direction.ts to reflect new symmetry between claim paths."
outOfScope:
  - "Changes to lock-file schema version"
  - "Runtime lock cleanup or expiry policy changes"
  - "Refactoring of `next --claim` itself"
nonGoals:
  - "Do not introduce a new claim subcommand"
  - "Do not change `tasks close` semantics beyond improved error envelope"
  - "Do not silently swallow legacy lock files missing the direction-lock embed"
tags:
  - "agent-operability"
  - "governance-safety"
  - "cli-ergonomics"
---

# TASK-AAO-0062 - Claim direction lock consistency

## Goal

Make `tasks claim` write a lock record compatible with `assertTaskCloseAllowedByDirection`, OR enrich the `ATM_TASK_DIRECTION_LOCK_REQUIRED` error envelope to explicitly identify the missing `taskDirectionLock` embed and surface a `requiredCommand` suggesting `node atm.mjs next --claim --prompt <task>`.

## Why

Today `tasks claim` and `next --claim` both create `.atm/runtime/locks/<task>.lock.json`, but only `next --claim` calls `writeTaskDirectionLock` to embed the `taskDirectionLock` object required by `assertTaskCloseAllowedByDirection` at close time. The asymmetry is silent until `tasks close` fails with `ATM_TASK_DIRECTION_LOCK_REQUIRED`, and the current error envelope does not say "use `next --claim` instead of `tasks claim`" — operators must read source to discover the difference. This is a high-impact footgun for validator authors and any script that programmatically sets up claims.

## Acceptance Criteria

- Either:
  - (Path A) `tasks claim` produces a lock record that embeds a valid `taskDirectionLock` object, allowing `tasks close` to proceed without `ATM_TASK_DIRECTION_LOCK_REQUIRED`; OR
  - (Path B) `ATM_TASK_DIRECTION_LOCK_REQUIRED` envelope adds `data.missingField: "taskDirectionLock"`, `data.detectedClaimCommand`, and `data.requiredCommand: "node atm.mjs next --claim --prompt <task>"`.
- A regression test in `scripts/validate-task-direction-governance.ts` covers the chosen path.
- `npm run typecheck`, `npm run validate:cli`, and the targeted governance validator all pass.
- No change to the lock-file schema version.

## Stop Conditions

- If Path A introduces any change to lock-file schema, stop and reopen scope review.
- If Path B requires a new public error code beyond `ATM_TASK_DIRECTION_LOCK_REQUIRED`, stop and document in a `captain-decision` shard.
