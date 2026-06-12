---
doc_id: doc_cid_0061
task_id: TASK-CID-0061
title: "Tasks command surface invariant hard gate"
status: done
started_at: "2026-06-12T22:25:00+08:00"
closed_at: "2026-06-12T22:33:00+08:00"
started_by_agent: "007"
owner: atm-core
priority: P0
milestone: M12
depends_on:
  - "TASK-CID-0060"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/public-surface.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-tasks-command-surface.ts"
  - "docs/reports/tasks-command-surface-contract.md"
  - "package.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/public-surface.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-tasks-command-surface.ts"
  - "docs/reports/tasks-command-surface-contract.md"
  - "package.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-tasks-command-surface.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the new hard gate if it incorrectly rejects legitimate command-surface evolution, then tighten the invariant list and reland."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-surface-invariant-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
    - "docs/reports/tasks-command-surface-contract.md"
outOfScope:
  - "Broad module extraction from tasks.ts"
  - "Mailbox transport redesign"
  - "Rewriting unrelated broker workflows"
nonGoals:
  - "Do not rely on build failure alone as the only detection path."
  - "Do not weaken existing closeout or historical-delivery gates to make the validator pass."
---

# TASK-CID-0061 - Tasks command surface invariant hard gate

## Goal

Turn the recent `tasks.ts` drift class into a named, fail-fast ATM breach.

## Problem

The framework recently entered a state where `packages/cli/src/commands/tasks.ts` no longer exposed required governance helpers and types relied on by:

- `next.ts`
- `taskflow.ts`
- `taskflow/close-orchestration.ts`
- `validate-cli.ts`

The breakage was only discovered after downstream build and regression failures. That means ATM still lacks a first-class gate for "core command surface silently shrank or drifted."

## Required Work

- Pull the outward-facing `tasks.ts` service contract into one explicit surface module or facade that other command surfaces are allowed to import.
- Document that contract in a small report so the invariant is reviewable in prose and not only implicit in code.
- Define the minimum required governance surface that `tasks.ts` must continue to expose while the refactor family is in progress.
- Add a focused validator that fails if required exports, types, or helper entrypoints disappear or drift unexpectedly.
- Cover both source-side and release-side command surfaces so the framework can catch source/release divergence earlier.
- Ensure the failure is explained as an ATM governance invariant breach, not as an opaque TypeScript accident.
- Update `validate:cli` only as needed so this new hard gate becomes part of the normal regression path.

## Acceptance Signals

- If `tasks.ts` loses a required export or helper, ATM should fail before a worker mistakes the repo as healthy.
- If a caller wants to depend on `tasks.ts` behavior, it should depend on the declared public surface, not on ad hoc internal helpers.
- If release-side command surface and source-side command surface diverge, the validator must report the drift explicitly.
- The output must identify which surface contract broke and which downstream surface depended on it.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-tasks-command-surface.ts
git diff --check
```

## Report Back

Report the invariant list, the exact drift scenario now caught, validator results, and commit SHA.
