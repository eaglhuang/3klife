---
doc_id: doc_rft_0006
task_id: TASK-RFT-0006
title: "police/family.ts role split"
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
scopePaths:
  - "packages/core/src/police/family.ts"
  - "packages/core/src/police/types.ts"
  - "packages/core/src/police/suppression-keys.ts"
  - "packages/core/src/police/roles/dedup.ts"
  - "packages/core/src/police/roles/demand.ts"
  - "packages/core/src/police/roles/quality.ts"
  - "packages/core/src/police/roles/map-integration.ts"
  - "packages/core/src/police/roles/atomization.ts"
  - "packages/core/src/police/roles/decomposition.ts"
  - "packages/core/src/police/roles/evolution.ts"
  - "packages/core/src/police/roles/polymorph.ts"
  - "packages/core/src/police/roles/rollback.ts"
  - "packages/core/src/police/roles/evidence-integrity.ts"
  - "packages/core/src/police/roles/reversibility.ts"
  - "packages/core/src/police/roles/noise-control.ts"
  - "packages/core/src/police/roles/adopter-neutrality.ts"
  - "packages/core/src/police/__tests__/role-registry.spec.ts"
  - "packages/core/src/police/__tests__/suppression-keys.spec.ts"
  - "packages/core/src/police/__tests__/dedup.spec.ts"
  - "packages/core/src/police/__tests__/quality.spec.ts"
  - "packages/core/src/police/__tests__/polymorph.spec.ts"
  - "scripts/validate-police-family.ts"
  - "scripts/validate-police-atomic-map.ts"
  - "docs/reports/police-family-atomic-map.md"
deliverables:
  - "packages/core/src/police/family.ts"
  - "packages/core/src/police/types.ts"
  - "packages/core/src/police/suppression-keys.ts"
  - "packages/core/src/police/roles/dedup.ts"
  - "packages/core/src/police/roles/demand.ts"
  - "packages/core/src/police/roles/quality.ts"
  - "packages/core/src/police/roles/map-integration.ts"
  - "packages/core/src/police/roles/atomization.ts"
  - "packages/core/src/police/roles/decomposition.ts"
  - "packages/core/src/police/roles/evolution.ts"
  - "packages/core/src/police/roles/polymorph.ts"
  - "packages/core/src/police/roles/rollback.ts"
  - "packages/core/src/police/roles/evidence-integrity.ts"
  - "packages/core/src/police/roles/reversibility.ts"
  - "packages/core/src/police/roles/noise-control.ts"
  - "packages/core/src/police/roles/adopter-neutrality.ts"
  - "packages/core/src/police/__tests__/role-registry.spec.ts"
  - "packages/core/src/police/__tests__/suppression-keys.spec.ts"
  - "packages/core/src/police/__tests__/dedup.spec.ts"
  - "packages/core/src/police/__tests__/quality.spec.ts"
  - "packages/core/src/police/__tests__/polymorph.spec.ts"
  - "scripts/validate-police-family.ts"
  - "scripts/validate-police-atomic-map.ts"
  - "docs/reports/police-family-atomic-map.md"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-police-family.ts"
  - "node --strip-types scripts/validate-police-atomic-map.ts"
  - "node --strip-types packages/core/src/police/__tests__/role-registry.spec.ts"
  - "node --strip-types packages/core/src/police/__tests__/suppression-keys.spec.ts"
  - "node --strip-types packages/core/src/police/__tests__/dedup.spec.ts"
  - "node --strip-types packages/core/src/police/__tests__/quality.spec.ts"
  - "node --strip-types packages/core/src/police/__tests__/polymorph.spec.ts"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if any police role report changes its schema or if family aggregation result changes."
atomizationImpact:
  ownerAtomOrMap: "atm.police-family-atomic-map"
  mapUpdates:
    - "docs/reports/police-family-atomic-map.md"
outOfScope:
  - "Changing PoliceFinding or PoliceFamilyReport schemas"
  - "Adding new police roles in the same card"
  - "Modifying scripts/validate-police-family.ts beyond updating the new module paths"
  - "Touching packages/core/src/police/family.ts callers outside the file itself"
nonGoals:
  - "Do not collapse roles that look similar — each role has distinct suppression semantics."
  - "Do not weaken the shared SharedGateReport contract."
completed_at: "2026-07-10T02:02:22.070Z"
completed_by_agent: "cursor-composer-rft0006"
closedAt: "2026-07-10T02:02:22.070Z"
closedByActor: "cursor-composer-rft0006"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T02-02-22-006Z-close-bca463b15aeb"
lastTransitionAt: "2026-07-10T02:02:22.070Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f1fcd2bba650f7fdc0c3a3a902dd4b0bec2052e3"
---

# TASK-RFT-0006 - police/family.ts role split

## Goal

Reduce `packages/core/src/police/family.ts` (1,803 lines as of 2026-06-20, still oversized even after adjacent broker/police work shifted around it) into a per-role split behind a registry Facade.

## Atom/Map Extraction Pattern

Use the `atm-atom-map-refactor` skill (`Strategy Map` per role + shared `Result Contract Object`). Per casebook RFT-0006 forward case:

1. **`packages/core/src/police/types.ts`** — moves all interface declarations: `EvidenceRef`, `PoliceFinding`, `PoliceFamilyReport`, `PoliceFamilyGateReport`, every `Police*Input`/`Police*Report`/`*Gate*` interface (30+). Pure type-only module — no runtime code.
2. **`packages/core/src/police/suppression-keys.ts`** — owns `buildPolymorphSuppressionKey`, `buildRollbackSuppressionKey`, and the suppression-key shape they share.
3. **`packages/core/src/police/roles/<role>.ts`** — one file per police role (13 total): dedup, demand, quality, map-integration, atomization, decomposition, evolution, polymorph, rollback, evidence-integrity, reversibility, noise-control, adopter-neutrality.
4. **`packages/core/src/police/family.ts`** — Facade exposing `runPoliceFamily` that loads the role registry and aggregates each role's report into a single `PoliceFamilyReport`.

## Required Behavior

- All consumers in `packages/core` and `packages/cli` continue to import the same symbols from `packages/core/src/police/family.ts` and from `packages/core/src/police/index.ts`.
- `runPoliceFamily` output is byte-identical (same `PoliceFinding[]` order, same suppression keys, same `SharedGateReport` fields).
- `family.ts` after the split must be under 500 lines.
- Atomic-map report enumerates each of the 13 roles, its module path, and pre/post line counts.

## Testing Requirements

- `role-registry.spec.ts`:
  - one case asserting all 13 roles are registered;
  - one case asserting registry order is deterministic;
  - one case asserting `runPoliceFamily` on an empty fixture returns an empty findings array (no spurious findings).
- `suppression-keys.spec.ts`:
  - one polymorph key round-trip case;
  - one rollback key round-trip case;
  - one case asserting that two inputs that differ only by case produce different keys.
- `dedup.spec.ts`:
  - one positive case (dup detected, finding emitted);
  - one negative case (no dup, no finding);
  - one threshold-boundary case.
- `quality.spec.ts`:
  - one passing baseline case;
  - one regression case;
  - one suppressed-noise case.
- `polymorph.spec.ts`:
  - one under-threshold case (no finding);
  - one over-threshold case (finding emitted);
  - one suppression key applies-correctly case.
- For the remaining 9 roles, focused specs are **not required** in this card, but each role's Strategy implementation must be self-tested through `scripts/validate-police-family.ts` (which is updated to import the new role paths).

Add `scripts/validate-police-atomic-map.ts` asserting:

- 13 role files exist under `roles/`;
- `family.ts` line count is below 500;
- registry contains exactly 13 roles;
- every interface previously exported from `family.ts` is now exported from `types.ts` and re-exported from `family.ts`.

## Validation

```powershell
npm run typecheck
node --strip-types scripts/validate-police-family.ts
node --strip-types scripts/validate-police-atomic-map.ts
node --strip-types packages/core/src/police/__tests__/role-registry.spec.ts
node --strip-types packages/core/src/police/__tests__/suppression-keys.spec.ts
node --strip-types packages/core/src/police/__tests__/dedup.spec.ts
node --strip-types packages/core/src/police/__tests__/quality.spec.ts
node --strip-types packages/core/src/police/__tests__/polymorph.spec.ts
npm run validate:git-head-evidence
git diff --check
```

## Closing

Use `taskflow open --write` / `taskflow close --write`.
