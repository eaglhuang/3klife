---
doc_id: doc_rft_0004
task_id: TASK-RFT-0004
title: "validate-task-ledger-governance.ts invariant registry split"
status: done
owner: atm-core
priority: P0
milestone: RFT-M2
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
related_skill: .agents/skills/atm-atom-map-refactor
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/lib/task-ledger-invariant-registry.ts"
  - "scripts/lib/task-ledger-fixture-builder.ts"
  - "scripts/lib/task-ledger-assertions.ts"
  - "scripts/validators/task-ledger/residue-classification.ts"
  - "scripts/validators/task-ledger/taskflow-close-orchestration.ts"
  - "scripts/validators/task-ledger/planning-only-audit-boundary.ts"
  - "scripts/validators/task-ledger/closure-packet-dirty-tree-hygiene.ts"
  - "scripts/validators/task-ledger/task-import-dispatch-metadata.ts"
  - "scripts/validators/task-ledger/task-import-refresh-claim-preservation.ts"
  - "scripts/validators/task-ledger/tasks-roster-update-contract.ts"
  - "scripts/validators/task-ledger/tasks-new-rejects-root-output.ts"
  - "scripts/validators/task-ledger/taskflow-host-opener-fallback.ts"
  - "scripts/validators/task-ledger/sandbox-diagnostics-actionable.ts"
  - "scripts/validators/task-ledger/last-transition-hash.ts"
  - "scripts/validators/task-ledger/emergency-use-pre-commit-audit.ts"
  - "scripts/validators/task-ledger/ledger-readers-atomization.ts"
  - "scripts/validators/task-ledger/__tests__/registry.spec.ts"
  - "scripts/validators/task-ledger/__tests__/residue-classification.spec.ts"
  - "scripts/validators/task-ledger/__tests__/taskflow-close-orchestration.spec.ts"
  - "scripts/validate-task-ledger-atomic-map.ts"
  - "docs/reports/task-ledger-governance-atomic-map.md"
deliverables:
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/lib/task-ledger-invariant-registry.ts"
  - "scripts/lib/task-ledger-fixture-builder.ts"
  - "scripts/lib/task-ledger-assertions.ts"
  - "scripts/validators/task-ledger/residue-classification.ts"
  - "scripts/validators/task-ledger/taskflow-close-orchestration.ts"
  - "scripts/validators/task-ledger/planning-only-audit-boundary.ts"
  - "scripts/validators/task-ledger/closure-packet-dirty-tree-hygiene.ts"
  - "scripts/validators/task-ledger/task-import-dispatch-metadata.ts"
  - "scripts/validators/task-ledger/task-import-refresh-claim-preservation.ts"
  - "scripts/validators/task-ledger/tasks-roster-update-contract.ts"
  - "scripts/validators/task-ledger/tasks-new-rejects-root-output.ts"
  - "scripts/validators/task-ledger/taskflow-host-opener-fallback.ts"
  - "scripts/validators/task-ledger/sandbox-diagnostics-actionable.ts"
  - "scripts/validators/task-ledger/last-transition-hash.ts"
  - "scripts/validators/task-ledger/emergency-use-pre-commit-audit.ts"
  - "scripts/validators/task-ledger/ledger-readers-atomization.ts"
  - "scripts/validators/task-ledger/__tests__/registry.spec.ts"
  - "scripts/validators/task-ledger/__tests__/residue-classification.spec.ts"
  - "scripts/validators/task-ledger/__tests__/taskflow-close-orchestration.spec.ts"
  - "scripts/validate-task-ledger-atomic-map.ts"
  - "docs/reports/task-ledger-governance-atomic-map.md"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-task-ledger-governance.ts"
  - "node --strip-types scripts/validate-task-ledger-atomic-map.ts"
  - "node --strip-types scripts/validators/task-ledger/__tests__/registry.spec.ts"
  - "node --strip-types scripts/validators/task-ledger/__tests__/residue-classification.spec.ts"
  - "node --strip-types scripts/validators/task-ledger/__tests__/taskflow-close-orchestration.spec.ts"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if any of the 13 invariant checks stops firing or changes failure code."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-atomic-map"
  mapUpdates:
    - "docs/reports/task-ledger-governance-atomic-map.md"
outOfScope:
  - "Changing any invariant's failure code or message"
  - "Adding new invariants in the same card (open a follow-up)"
  - "Touching the `taskflow open/close` runtime path"
nonGoals:
  - "Do not skip an invariant because it is awkward to fixture; build the fixture instead."
completed_at: "2026-07-10T01:38:39.415Z"
completed_by_agent: "cursor-composer-rft0004"
closedAt: "2026-07-10T01:38:39.415Z"
closedByActor: "cursor-composer-rft0004"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T01-38-39-335Z-close-f8c56c429d85"
lastTransitionAt: "2026-07-10T01:38:39.415Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d16e18b2657a8234a5395f75ee2e19168ecfb0f8"
---

# TASK-RFT-0004 - validate-task-ledger-governance.ts invariant registry split

## Goal

Reduce `scripts/validate-task-ledger-governance.ts` (2,714 lines as of 2026-06-20, now larger than the original planning baseline and fourth on the open RFT board) into a registry-driven dispatcher.

## Atom/Map Extraction Pattern

Use the `atm-atom-map-refactor` skill (`Strategy Map` + shared envelope). Per casebook RFT-0004 forward case:

1. **`scripts/lib/task-ledger-invariant-registry.ts`** — **Strategy Map** keyed by invariant id. Each entry is `{ id, description, run: (ctx) => Promise<InvariantResult> }` where `InvariantResult` is `atm.taskLedgerInvariantResult.v1` (`{ schemaId, ok, code, summary, details }`).
2. **`scripts/lib/task-ledger-fixture-builder.ts`** — shared helpers `makeHostRepo`, `makeFrameworkRepo`, `initGitRepo`, `writeJson`, `readJson`, `sha256File`.
3. **`scripts/lib/task-ledger-assertions.ts`** — `expectTaskError`, `expectTaskErrorDetails`, `evidenceReport`, `assertLastTransitionHashMatchesDisk`, `assert`, `fail`.
4. **`scripts/validators/task-ledger/<invariant>.ts`** — one file per invariant (13 total per the diagnosis):
   - `residue-classification.ts` ← `validateTaskResidueClassification`
   - `taskflow-close-orchestration.ts` ← `validateTaskflowCloseOrchestration`
   - `planning-only-audit-boundary.ts` ← `validatePlanningOnlyLedgerAuditBoundary`
   - `closure-packet-dirty-tree-hygiene.ts` ← `validateClosurePacketDirtyTreeHygieneGuard`
   - `task-import-dispatch-metadata.ts` ← `validateTaskImportDispatchMetadataPreservation`
   - `task-import-refresh-claim-preservation.ts` ← `validateTaskImportRefreshClaimPreservation`
   - `tasks-roster-update-contract.ts` ← `assertTasksRosterUpdateContract`
   - `tasks-new-rejects-root-output.ts` ← `assertTasksNewRejectsRootOutput`
   - `taskflow-host-opener-fallback.ts` ← `assertTaskflowHostOpenerFallbackContract`
   - `sandbox-diagnostics-actionable.ts` ← `assertSandboxDiagnosticsAreActionable`
   - `last-transition-hash.ts` ← `assertLastTransitionHashMatchesDisk`
   - `emergency-use-pre-commit-audit.ts` ← `validateEmergencyUsePreCommitAudit`
   - `ledger-readers-atomization.ts` ← `validateTaskLedgerReadersAtomization`
5. **`scripts/validate-task-ledger-governance.ts`** — thin Facade: load registry, loop run all invariants, accumulate envelopes, print one final envelope.

## Required Behavior

- `node --strip-types scripts/validate-task-ledger-governance.ts` exit code and stdout text must be byte-identical to the pre-split version on the same workspace.
- Each invariant's failure code (e.g. `ATM_TASK_RESIDUE_CLASSIFICATION_DRIFT`) must match the pre-split behavior.
- `validate-task-ledger-governance.ts` after the split must be under 200 lines (it should be a thin loop).
- Atomic-map report enumerates each of the 13 invariants, its module path, and pre/post line counts.

## Testing Requirements

This card is heavier on tests than RFT default because the validators ARE tests.

- `registry.spec.ts`:
  - one case asserting all 13 invariants are registered;
  - one case asserting registry order is stable (alphabetical by id);
  - one case asserting `run()` is callable on every entry without throwing in a fixture workspace.
- `residue-classification.spec.ts`:
  - positive case (no residue);
  - negative case (status divergence between live ledger and planning frontmatter);
  - boundary case (terminal state, should return `no-residue` per TASK-CID-0073 follow-up C4).
- `taskflow-close-orchestration.spec.ts`:
  - positive case (normal-close);
  - negative case (ambiguous-manual-review);
  - boundary case (residue-repair routing).
- For the remaining 10 invariants, focused specs are **not** required in this card but each invariant MUST have an inline self-test fixture (the existing `tempRoot` pattern) that the registry can execute as part of `node --strip-types scripts/validate-task-ledger-governance.ts`.

Add `scripts/validate-task-ledger-atomic-map.ts` that asserts:

- registry contains exactly 13 entries (matching pre-split count);
- each registered invariant has a corresponding `.ts` file;
- `scripts/validate-task-ledger-governance.ts` line count is below 200.

## Validation

```powershell
npm run typecheck
node --strip-types scripts/validate-task-ledger-governance.ts
node --strip-types scripts/validate-task-ledger-atomic-map.ts
node --strip-types scripts/validators/task-ledger/__tests__/registry.spec.ts
node --strip-types scripts/validators/task-ledger/__tests__/residue-classification.spec.ts
node --strip-types scripts/validators/task-ledger/__tests__/taskflow-close-orchestration.spec.ts
npm run validate:git-head-evidence
git diff --check
```

## Closing

Use `taskflow open --write` / `taskflow close --write`.
