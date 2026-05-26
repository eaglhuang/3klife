---
doc_id: doc_task_aao_0047
task_id: TASK-AAO-0047
title: "P0 throughput acceleration bundle"
status: planned
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "Bundles the P0 batch throughput fixes so AAO can continue without repeated process, routing, and checkpoint friction."
milestone: M16
depends_on:
  - "TASK-AAO-0024"
  - "TASK-AAO-0027"
  - "TASK-AAO-0034"
  - "TASK-AAO-0037"
  - "TASK-AAO-0040"
  - "TASK-AAO-0046"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "scripts/run-validators.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-direction-governance.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "package.json"
deliverables:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/hook.ts"
  - "scripts/run-validators.ts"
  - "scripts/validate-cli.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-cli.ts --mode surface"
  - "node --strip-types scripts/validate-task-direction-governance.ts --mode validate"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the bundle commit and rebuild the frozen runner from the previous release state."
atomizationImpact:
  ownerAtomOrMap: "atm.aao-throughput-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Weakening checkpoint, evidence, or protected-state gates"
  - "Changing unrelated task card lifecycle semantics"
  - "Manual edits to .atm/runtime/**"
nonGoals:
  - "General-purpose parallel execution before non-overlap proof exists"
  - "Suppressing real validator failures"
---
# TASK-AAO-0047 — P0 throughput acceleration bundle

## Goal

Land the smallest coherent P0 acceleration bundle that removes current AAO batch friction without weakening governance gates.

## Why

Dogfood showed that high-end models still lose time on checkpoint/commit windows, stale frozen runner behavior, intent routing drift, verbose batch output, validator baseline noise, and sandbox EPERM diagnosis. These are coupled enough that fixing only one still leaves the batch flow slow.

## Implementation Contract

- Treat this as a coordination bundle over existing cards; do not close or rewrite already-completed TASK-AAO-0004.
- Prefer small compatibility helpers over a router rewrite.
- Keep all gates intact: checkpoint, evidence, protected state, and source ownership remain required.
- Implement compact output and idempotent current-head behavior before optional parallelism.
- If implementation needs new runtime state, expose repair/status commands rather than asking agents to edit runtime files.

## Deliverables

- batch compact/current output for queue-head only views.
- next claim idempotency for active batch current head.
- source/frozen runner stale diagnostic that points to build/sync instead of --no-verify.
- sandbox EPERM and validator baseline-noise diagnostics that are actionable.
- validator fast surface path and evidence reuse hooks where safe.
- atomization ownership map updates for touched scripts/commands.

## Validators

- npm run typecheck
- npm run validate:cli
- node --strip-types scripts/validate-cli.ts --mode surface
- node --strip-types scripts/validate-task-direction-governance.ts --mode validate
- node --strip-types scripts/validate-prompt-scoped-next.ts

## Acceptance Criteria

- `batch current --compact` or equivalent returns only batchId, currentTaskId, allowedFiles, validators, pending commit window, and requiredCommand.
- `next --claim` never claims the next task while the active batch current head has checkpoint debt.
- A stale frozen runner produces `ATM_RUNNER_SYNC_REQUIRED` with `npm run build` / sync guidance, not a generic hook failure or `--no-verify` path.
- Sandbox git/temp EPERM is classified as environment diagnostic with a concrete rerun/elevated/temp-root command.
- Baseline unrelated validator failures are separated from current-task failures in hook/validator output.
- `validate:cli` fast surface path remains under a few seconds and full validate remains materially faster than the prior 56 second baseline.
- Regression evidence covers checkpoint commit window, active batch claim idempotency, compact batch output, and sandbox diagnostic paths.

## Rollback

Revert the bundle commit and rebuild the frozen runner. If compatibility runtime files were introduced, remove them in the same revert.

## Atomization Impact

- Owner atom/map: atm.aao-throughput-map
- Map updates: atomic_workbench/atomization-coverage/path-to-atom-map.json
- New script/validator changes must be mapped before closure.

## Notes

This bundle exists so AAO can unblock current dogfood quickly. Longer-term subagent / parallel execution remains gated by TASK-AAO-0045 non-overlap policy.