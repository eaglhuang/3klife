---
doc_id: doc_rft_0017
task_id: TASK-RFT-0017
title: "tasks.ts claim lifecycle orchestrator split"
status: planned
owner: atm-core
priority: P0
milestone: RFT-M6
depends_on: [TASK-RFT-0013]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/claim-orchestrator.ts"
  - "packages/cli/src/commands/tasks/claim-preparation.ts"
  - "packages/cli/src/commands/tasks/claim-intent.ts"
  - "packages/cli/src/commands/tasks/takeover-evidence.ts"
  - "packages/cli/src/commands/tasks/repair-claim-orchestrator.ts"
  - "packages/cli/src/commands/tasks/claim-repair-diagnostics.ts"
  - "packages/cli/src/commands/tasks/__tests__/claim-orchestrator.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/repair-claim-orchestrator.spec.ts"
  - "scripts/validate-tasks-claim-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/claim-orchestrator.ts"
  - "packages/cli/src/commands/tasks/claim-preparation.ts"
  - "packages/cli/src/commands/tasks/claim-intent.ts"
  - "packages/cli/src/commands/tasks/takeover-evidence.ts"
  - "packages/cli/src/commands/tasks/repair-claim-orchestrator.ts"
  - "packages/cli/src/commands/tasks/__tests__/claim-orchestrator.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/repair-claim-orchestrator.spec.ts"
  - "scripts/validate-tasks-claim-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-tasks-claim-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/claim-orchestrator.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/repair-claim-orchestrator.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if claim, renew, release, handoff, takeover, or repair-claim semantics change."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-atomic-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Touching packages/cli/src/commands/next.ts or RFT-0001 Lane A files"
  - "Changing claim lease JSON schema or public command names"
  - "Changing broker conflict rules"
  - "Extracting reconcile, repair-closure, deliver-and-close, card parsing, scope, queue, or parallel clusters"
nonGoals:
  - "Do not optimize claim behavior while moving it; this is a verbatim extraction card."
  - "Do not collapse repair-claim diagnostics into a generic lifecycle helper."
---

# TASK-RFT-0017 - tasks.ts claim lifecycle orchestrator split

## Goal

Move the remaining claim lifecycle cluster out of
`packages/cli/src/commands/tasks.ts` so Lane B can continue reducing the
facade without interfering with Lane A `next.ts` work.

## Atom/Map Extraction Pattern

- `tasks/claim-orchestrator.ts` owns `runTasksClaimLifecycle`, claim / renew /
  release / handoff / takeover orchestration, lock/session transitions, and
  the lifecycle command result envelope.
- `tasks/claim-preparation.ts` owns `prepareTaskForClaim`, reserve/promote
  preparation, and planning-card auto-import orchestration. It consumes
  `parseSingleCard`, `writeTaskFiles`, and `writeImportEvidence` as injected
  atom boundaries so TASK-RFT-0019 can split parser/writer ownership later.
- `tasks/claim-intent.ts` owns auto-intent resolution for write vs closeout-only
  claims.
- `tasks/takeover-evidence.ts` owns takeover evidence append-only writes.
- `tasks/repair-claim-orchestrator.ts` owns `runTasksRepairClaim` and
  `parseRepairClaimOptions` if keeping repair claim separate makes the boundary
  clearer.
- `tasks.ts` imports the extracted symbols and keeps only the command router.

## Required Behavior

- `tasks claim`, `tasks renew`, `tasks release`, `tasks handoff`, and
  `tasks takeover` preserve public JSON fields and exit codes.
- `tasks repair-claim` remains diagnose-first and requires `--write --reason`
  for mutation.
- Existing `claim-repair-diagnostics.ts` ownership is preserved.
- The Lane A `next.ts` task set remains untouched.

## Validation

`scripts/validate-tasks-claim-atomic-map.ts` must assert:

- `runTasksClaimLifecycle` is no longer defined in `tasks.ts`.
- `runTasksRepairClaim` is no longer defined in `tasks.ts` unless the validator
  records a deliberate one-card exception.
- `tasks.ts` imports the new claim owner modules.
- `tasks.ts` line count is under 4,800 for this card.
- `claim-preparation.ts` stays under 600 lines and preserves parser/writer
  injection boundaries instead of absorbing those atoms.

## Team Broker Boundary

This card owns only Lane B tasks-command files. It must not modify
`packages/cli/src/commands/next.ts`, `packages/cli/src/commands/next/**`, or
RFT-0001 deliverables.
