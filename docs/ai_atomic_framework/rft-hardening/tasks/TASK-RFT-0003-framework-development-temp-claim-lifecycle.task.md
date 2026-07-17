---
doc_id: doc_rft_0003
task_id: TASK-RFT-0003
title: "framework-development.ts temp-claim lifecycle extraction"
status: done
owner: atm-core
priority: P1
milestone: RFT-M2
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
related_skill: .agents/skills/atm-atom-map-refactor
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
closed_at: "2026-06-14T14:08:21.411Z"
closed_by: "captain-teamagents"
closedByCommand: atm tasks close
lastTransitionAt: "2026-06-14T14:08:21.411Z"
delivery_commit: "b76c494346bbe72dc4e005fa552e61a28d240248"
target_ledger_status: done
planning_closeback_status: reconciled-from-target-ledger
scopePaths:
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/framework-development/temp-claim.ts"
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "packages/cli/src/commands/framework-development/critical-path-gate.ts"
  - "packages/cli/src/commands/framework-development/sha256-normalization.ts"
  - "packages/cli/src/commands/framework-development/historical-delivery-provenance.ts"
  - "packages/cli/src/commands/framework-development/__tests__/temp-claim.spec.ts"
  - "packages/cli/src/commands/framework-development/__tests__/closure-packet-schema.spec.ts"
  - "packages/cli/src/commands/framework-development/__tests__/critical-path-gate.spec.ts"
  - "packages/cli/src/commands/framework-development/__tests__/sha256-normalization.spec.ts"
  - "packages/cli/src/commands/framework-development/__tests__/historical-delivery-provenance.spec.ts"
  - "scripts/validate-framework-development-atomic-map.ts"
  - "docs/reports/framework-development-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/framework-development/temp-claim.ts"
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "packages/cli/src/commands/framework-development/critical-path-gate.ts"
  - "packages/cli/src/commands/framework-development/sha256-normalization.ts"
  - "packages/cli/src/commands/framework-development/historical-delivery-provenance.ts"
  - "packages/cli/src/commands/framework-development/__tests__/temp-claim.spec.ts"
  - "packages/cli/src/commands/framework-development/__tests__/closure-packet-schema.spec.ts"
  - "packages/cli/src/commands/framework-development/__tests__/critical-path-gate.spec.ts"
  - "packages/cli/src/commands/framework-development/__tests__/sha256-normalization.spec.ts"
  - "packages/cli/src/commands/framework-development/__tests__/historical-delivery-provenance.spec.ts"
  - "scripts/validate-framework-development-atomic-map.ts"
  - "docs/reports/framework-development-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-framework-development-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/framework-development/__tests__/temp-claim.spec.ts"
  - "node --strip-types packages/cli/src/commands/framework-development/__tests__/closure-packet-schema.spec.ts"
  - "node --strip-types packages/cli/src/commands/framework-development/__tests__/critical-path-gate.spec.ts"
  - "node --strip-types packages/cli/src/commands/framework-development/__tests__/sha256-normalization.spec.ts"
  - "node --strip-types packages/cli/src/commands/framework-development/__tests__/historical-delivery-provenance.spec.ts"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if any closure packet field name, sha256 normalization invariant, or critical-path gate decision changes."
atomizationImpact:
  ownerAtomOrMap: "atm.framework-development-atomic-map"
  mapUpdates:
    - "docs/reports/framework-development-atomic-map.md"
outOfScope:
  - "Changing the closure packet JSON schema or its field names"
  - "Changing emergency lease validation rules"
  - "Changing framework-mode status thresholds"
  - "Touching .atm/history/ entries"
nonGoals:
  - "Do not change the temp-claim TTL or max-uses defaults."
  - "Do not collapse stale-lock classification kinds."
---

# TASK-RFT-0003 - framework-development.ts temp-claim lifecycle extraction

## Goal

Reduce `packages/cli/src/commands/framework-development.ts` (2,757 lines) by extracting five concern-specific modules behind a Facade.

## Atom/Map Extraction Pattern

Use the `atm-atom-map-refactor` skill (`Policy Object` + `Facade` + `Result Contract Object`). Per the casebook RFT-0003 forward case:

1. **`framework-development/temp-claim.ts`** — **Policy Object**. Owns claim/release/status of the temporary framework-development runtime lock. Exposes `claimTempLock`, `releaseTempLock`, `inspectTempLock` returning `atm.frameworkTempClaimResult.v1`. Handles `FrameworkStaleLockKind` classification.
2. **`framework-development/closure-packet-schema.ts`** — **Result Contract Object** type module. Re-exports `ClosurePacket`, `ClosurePacketCommandRun`, `ClosurePacketTargetCommitDelta`, `ClosurePacketRequiredGatesSnapshot`, `ClosurePacketReconcileAttestation`, `ClosurePacketRepairMetadata`, `FrameworkCloseWorktreeReport`, `ClosurePacketValidationIssue`, `ClosurePacketRepairResult`, `ClosureRepairUpstreamStatus`. Owns schema validation but **no** I/O.
3. **`framework-development/critical-path-gate.ts`** — **Policy Object**. Owns `isTaskCloseGovernanceCriticalPath`.
4. **`framework-development/sha256-normalization.ts`** — small utility module owning `normalizeSha256DigestValue`, `normalizeSha256FieldsDeep`, `summarizeSha256ActualValue`, `pushSha256ValidationIssue`.
5. **`framework-development/historical-delivery-provenance.ts`** — schema + helpers around `HistoricalDeliveryProvenance`.
6. **`framework-development.ts`** — Facade for `runFrameworkDevelopment` + re-exports of every public type/symbol callers consume.

## Required Behavior

- All public exports from `framework-development.ts` keep their names and shapes; callers (notably `hook/pre-commit.ts` after RFT-0002, `taskflow.ts`, `evidence.ts`) must compile without changes.
- `framework-mode claim/release/status --json` output is byte-identical to pre-split.
- `framework-development.ts` after the split must be under 900 lines.
- Atomic-map report `docs/reports/framework-development-atomic-map.md` enumerates each atom, public surface, and line counts.

## Testing Requirements

Each atom requires a focused spec with **at least three cases**:

- `temp-claim.spec.ts`:
  - one fresh-claim case;
  - one already-claimed (conflict) case returning the stale-lock kind;
  - one release-without-claim case (graceful no-op);
  - one expired-lock case showing classification kind = `expired-ttl`.
- `closure-packet-schema.spec.ts`:
  - one valid closure packet validation case;
  - one missing-required-field case (e.g. missing `targetCommit`);
  - one sha256-mismatch case;
  - one repair-metadata round-trip case.
- `critical-path-gate.spec.ts`:
  - one match case (`.atm/history/tasks/<id>.json`);
  - one non-match case (regular source file);
  - one task-id mismatch case (wrong task in path);
  - one edge case (path that looks like ATM history but isn't).
- `sha256-normalization.spec.ts`:
  - one valid `sha256:<hex>` input;
  - one bare hex input;
  - one nested-object deep normalization round-trip;
  - one invalid input that pushes a validation issue.
- `historical-delivery-provenance.spec.ts`:
  - one complete provenance case;
  - one missing-commit case;
  - one waiver-applied case.

Add `scripts/validate-framework-development-atomic-map.ts` that asserts:

- five new atom files exist;
- each has at least one spec;
- `framework-development.ts` line count is below 900;
- every closure-packet-related symbol is re-exported from `framework-development.ts`.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-framework-development-atomic-map.ts
node --strip-types packages/cli/src/commands/framework-development/__tests__/temp-claim.spec.ts
node --strip-types packages/cli/src/commands/framework-development/__tests__/closure-packet-schema.spec.ts
node --strip-types packages/cli/src/commands/framework-development/__tests__/critical-path-gate.spec.ts
node --strip-types packages/cli/src/commands/framework-development/__tests__/sha256-normalization.spec.ts
node --strip-types packages/cli/src/commands/framework-development/__tests__/historical-delivery-provenance.spec.ts
npm run validate:git-head-evidence
git diff --check
```

## Closing

Use `taskflow open --write` / `taskflow close --write`.

## Completion Evidence

- Completed in target repo `AI-Atomic-Framework` on 2026-06-14.
- Delivery commit: `b76c494346bbe72dc4e005fa552e61a28d240248`
- Closure commit: `55c435baf45dd12240329fb516dd24173980ea12`
- Runner sync commit: `4a07560619b9cfe78e8051ca785829694bc50159`
- Closure packet: `.atm/history/evidence/TASK-RFT-0003.closure-packet.json`
