---
doc_id: doc_rft_0009
task_id: TASK-RFT-0009
title: "taskflow.ts production close atom split and size tripwire recovery"
status: done
owner: atm-core
priority: P2
milestone: RFT-M1
depends_on:
  - TASK-RFT-0008
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
related_skill: .agents/skills/atm-atom-map-refactor
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
closed_at: "2026-06-20T03:43:30.190Z"
closed_by: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionAt: "2026-06-20T03:43:30.190Z"
lastTransitionId: "2026-06-20T03-43-30-192Z-close-49a47ba7c769"
delivery_commit: "d1a8212bd5d6e987bf4d4614bfe92bd4373a27ed"
target_ledger_status: done
planning_closeback_status: reconciled-from-target-ledger
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-preflight.ts"
  - "packages/cli/src/commands/taskflow/write-readiness.ts"
  - "packages/cli/src/commands/taskflow/broker-gate.ts"
  - "packages/cli/src/commands/taskflow/branch-commit-queue-gate.ts"
  - "packages/cli/src/commands/taskflow/closeback-orchestration.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/taskflow/__tests__/close-preflight.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/write-readiness.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "scripts/validate-taskflow-size-tripwire.ts"
  - "scripts/validate-taskflow-atomic-map.ts"
  - "docs/reports/taskflow-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-preflight.ts"
  - "packages/cli/src/commands/taskflow/write-readiness.ts"
  - "packages/cli/src/commands/taskflow/broker-gate.ts"
  - "packages/cli/src/commands/taskflow/branch-commit-queue-gate.ts"
  - "packages/cli/src/commands/taskflow/closeback-orchestration.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/taskflow/__tests__/close-preflight.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/write-readiness.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "scripts/validate-taskflow-size-tripwire.ts"
  - "scripts/validate-taskflow-atomic-map.ts"
  - "docs/reports/taskflow-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-taskflow-size-tripwire.ts"
  - "node --strip-types scripts/validate-taskflow-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/close-preflight.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/write-readiness.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if taskflow close JSON contracts, closeback semantics, governed commit bundle staging, or write-readiness blocker codes change unexpectedly."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-close-production-map"
  mapUpdates:
    - "docs/reports/taskflow-command-atomic-map.md"
    - "scripts/validate-taskflow-atomic-map.ts"
outOfScope:
  - "Changing taskflow open behavior"
  - "Changing public taskflow close CLI flags"
  - "Changing taskflow close JSON schema in a breaking way"
  - "Changing default close commit message strings"
  - "Reworking the test atom layer already owned by TASK-RFT-0008 beyond adapting imports"
nonGoals:
  - "Do not combine this with new closeback product behavior."
  - "Do not use this card to redesign task lifecycle authority."
  - "Do not replace taskflow close with backend tasks close or tasks reconcile."
completed_at: "2026-06-20T03:43:30.261Z"
completed_by_agent: "codex-gpt-5.4-mini"
delivery_commit: "d1a8212bd"
closure_commit: "1c6e75e08"
---

# TASK-RFT-0009 - taskflow.ts production close atom split and size tripwire recovery

## Goal

Shrink the production `taskflow.ts` close path into named atoms after `TASK-RFT-0008` has made close validation fast enough to support the split.

This card exists because `TASK-RFT-0008` should stay focused on validation speed. `TASK-RFT-0009` owns the production main-body reduction needed to make the size tripwire pass again.

Result: `packages/cli/src/commands/taskflow.ts` was reduced from 2,574 lines to 1,295 lines, a net shrink of 1,279 lines while preserving the governed close lane.

## Governance Invariant

`taskflow close` remains the normal operator lane for governed closeback. The split must not create a second task lifecycle, second close authority, or direct backend close path.

## Extraction Pattern

Use `atm-atom-map-refactor`.

Primary pattern: **Facade**.

`packages/cli/src/commands/taskflow.ts` should become the facade that parses taskflow arguments and delegates close-specific work to named atoms.

Supporting patterns:

1. **Policy Object** for close preflight and write-readiness gates.
2. **Result Contract Object** for closeback evidence, blocker summaries, and governed commit bundle assembly.

## Production Atom Targets

1. `taskflow.close-preflight`
   - owner module: `packages/cli/src/commands/taskflow/close-preflight.ts`
   - owns close eligibility checks before write or dry-run output.
2. `taskflow.write-readiness`
   - owner module: `packages/cli/src/commands/taskflow/write-readiness.ts`
   - owns blocker aggregation and `writeReadinessHint` construction.
3. `taskflow.broker-gate`
   - owner module: `packages/cli/src/commands/taskflow/broker-gate.ts`
   - owns write broker conflict and lease epoch interpretation.
4. `taskflow.branch-commit-queue-gate`
   - owner module: `packages/cli/src/commands/taskflow/branch-commit-queue-gate.ts`
   - owns branch queue lock detection and diagnostics.
5. `taskflow.closeback-orchestration`
   - owner module: `packages/cli/src/commands/taskflow/closeback-orchestration.ts`
   - owns target/planning closeback evidence coordination.
6. `taskflow.commit-bundle-assembly`
   - owner module: `packages/cli/src/commands/taskflow/commit-bundle-assembly.ts`
   - owns governed stage/commit bundle preview and exact staging metadata.

## Required Behavior

- `taskflow close --dry-run` and `taskflow close --write` return the same public JSON contracts as before this card.
- Existing close blocker codes remain stable.
- Existing governed commit bundle staging remains exact and deterministic.
- `taskflow.ts` line count falls below the tripwire threshold or the threshold is re-baselined only with explicit evidence in `docs/reports/taskflow-command-atomic-map.md`.
- `validate-taskflow-size-tripwire.ts` exits 0 after this card.
- `taskflow-dryrun.spec.ts` and `close-gates-focused.spec.ts` still pass.

## Test Strategy

Use the test atoms from `TASK-RFT-0008` instead of recreating fixture setup.

Focused production tests should cover:

1. close preflight accepts a ready task and rejects missing evidence;
2. write-readiness reports the same blocker codes for broker and branch queue gates;
3. closeback orchestration preserves target/planning repo closeback evidence;
4. commit bundle assembly preserves exact staging and commit message defaults.

The broad dry-run spec remains the end-to-end guard. The focused close gate spec remains the first fast validator.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-taskflow-size-tripwire.ts
node --strip-types scripts/validate-taskflow-atomic-map.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/close-preflight.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/write-readiness.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
npm run validate:git-head-evidence
git diff --check
```

## Closing

Use `taskflow open --write` / `taskflow close --write`. This card should not use backend close commands as the normal close path.
