---
doc_id: doc_rft_0010
task_id: TASK-RFT-0010
title: "tasks.ts thin-facade recovery"
status: done
started_at: "2026-07-01T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
owner: atm-core
priority: P0
milestone: RFT-M3
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
related_skill: .agents/skills/atm-atom-map-refactor
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/close-governance.ts"
  - "packages/cli/src/commands/tasks/status-triangulation.ts"
  - "packages/cli/src/commands/tasks/import-verify.ts"
  - "packages/cli/src/commands/tasks/result-contracts.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-governance.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/status-triangulation.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/import-verify.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/result-contracts.spec.ts"
  - "scripts/validate-tasks-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/close-governance.ts"
  - "packages/cli/src/commands/tasks/status-triangulation.ts"
  - "packages/cli/src/commands/tasks/import-verify.ts"
  - "packages/cli/src/commands/tasks/result-contracts.ts"
  - "packages/cli/src/commands/tasks/__tests__/close-governance.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/status-triangulation.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/import-verify.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/result-contracts.spec.ts"
  - "scripts/validate-tasks-atomic-map.ts"
  - "docs/reports/tasks-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-tasks-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/close-governance.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/status-triangulation.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/import-verify.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/result-contracts.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if the split changes task close authority, status truth computation, import verification semantics, or residue remediation routing."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-atomic-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Changing CLI command names under tasks"
  - "Changing public JSON result field names emitted by tasks close/status/reconcile/import"
  - "Rewriting already-extracted atoms such as tasks.command.dispatch, tasks.claim.lifecycle, or tasks.residue.diagnostics unless needed for wiring"
  - "Touching unrelated command surfaces such as next.ts, evidence.ts, or taskflow.ts"
nonGoals:
  - "Do not treat a line shuffle as success; ownership must move into named atom modules."
  - "Do not re-open CID planning as the primary owner of tasks.ts."
  - "Do not collapse close governance, status truth, and import verification into one new mega-helper."
completed_at: "2026-06-30T18:24:05.265Z"
completed_by_agent: "claude-code-opus-4-7"
closedAt: "2026-06-30T18:24:05.265Z"
closedByActor: "claude-code-opus-4-7"
closedByCommand: atm tasks close
lastTransitionId: "2026-06-30T18-24-05-265Z-close-fcc2aa333614"
lastTransitionAt: "2026-06-30T18:24:05.265Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6965e11ea45be563ac0a09b9fbbffe0b09f7a49c"
---

# TASK-RFT-0010 - tasks.ts thin-facade recovery

## Goal

Pull `packages/cli/src/commands/tasks.ts` (7,085 lines as of 2026-06-20) back under the RFT refactor track and restore it to a readable Facade by extracting the largest remaining inline governance owners: close governance, status triangulation, import/verify envelopes, and shared result contracts.

This card supersedes the earlier assumption that `tasks.ts` belongs only to the CID line. CID history remains useful as evidence, but future size-reduction and atom-ownership work should close through RFT.

## Atom/Map Extraction Pattern

Use the `atm-atom-map-refactor` skill in implementation mode. The correct shape is not "everything becomes a route table." The target architecture is:

1. **`tasks.ts`** -- **Facade**.
2. **`tasks/close-governance.ts`** -- **Policy Object**.
3. **`tasks/status-triangulation.ts`** -- **Strategy Map** plus stable report output.
4. **`tasks/import-verify.ts`** -- **Result Contract Object** owner.
5. **`tasks/result-contracts.ts`** -- shared **Result Contract Object** module.

Existing extracted modules such as `command-dispatch.ts`, `lifecycle-state.ts`, `scope-lock-diagnostics.ts`, `residue-diagnostics.ts`, and `historical-delivery.ts` stay in place and become the sibling atom set around the thinner facade.

## Required Behavior

- `tasks close`, `tasks status`, `tasks reconcile`, and import/verify flows must preserve current CLI behavior and public JSON field names.
- Existing atom ownership already extracted in the CID wave must remain stable; this card only pulls the still-inline remainder into named owners.
- `docs/reports/tasks-command-atomic-map.md` must be updated with a four-layer map: Facade, Policy Objects, Strategy Maps, Result Contract Objects.
- `scripts/validate-tasks-atomic-map.ts` must assert the new owner modules exist and are referenced by the report.
- `tasks.ts` should be re-measured after extraction, with before/after line counts recorded in the report.

## Execution Plan

### Phase A - close governance

- Extract the close authority and blocker-code logic into `tasks/close-governance.ts`.
- Add focused coverage for allowed, blocked, and recoverable close outcomes.

### Phase B - status truth and residue route selection

- Extract status triangulation into `tasks/status-triangulation.ts`.
- Make residue and recovery route selection explicit rather than rebuilt inline.

### Phase C - import and verify envelopes

- Extract import/verify/migration result building into `tasks/import-verify.ts`.
- Move schema-heavy report builders out of the facade.

### Phase D - result-contract cleanup

- Move the remaining task report contract bulk into `tasks/result-contracts.ts`.
- Reduce `tasks.ts` to orchestration plus narrow glue code only.

## Testing Requirements

Each new owner module needs a focused spec:

- `close-governance.spec.ts`: allowed, blocked, recoverable.
- `status-triangulation.spec.ts`: truth-aligned, planning/live mismatch, residue-routing.
- `import-verify.spec.ts`: import success, verify failure, migration normalization.
- `result-contracts.spec.ts`: contract stability, additive-field tolerance.

## Validation

1. `npm run typecheck`
2. `npm run validate:cli`
3. `node --strip-types scripts/validate-tasks-atomic-map.ts`
4. `node --strip-types packages/cli/src/commands/tasks/__tests__/close-governance.spec.ts`
5. `node --strip-types packages/cli/src/commands/tasks/__tests__/status-triangulation.spec.ts`
6. `node --strip-types packages/cli/src/commands/tasks/__tests__/import-verify.spec.ts`
7. `node --strip-types packages/cli/src/commands/tasks/__tests__/result-contracts.spec.ts`
8. `git diff --check`

## Why This Lives In RFT

- the dominant pressure is file size, ownership clarity, and thin-facade recovery;
- the remaining work is architectural extraction, not just governance hardening;
- keeping `tasks.ts` in RFT keeps oversized-module ranking honest across the whole CLI surface instead of isolating the largest file in a side track.
