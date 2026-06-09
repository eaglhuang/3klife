---
doc_id: doc_cid_0015
task_id: TASK-CID-0015
title: "Broker contract schemas and types"
status: done
started_at: "2026-06-07T11:23:00+08:00"
started_by_agent: "007"
completed_at: "2026-06-07T11:27:00+08:00"
completed_by_agent: "007"
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0014"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "schemas/governance/write-intent.schema.json"
  - "schemas/governance/patch-proposal.schema.json"
  - "schemas/governance/broker-decision.schema.json"
  - "schemas/governance/merge-plan.schema.json"
  - "schemas/governance/break-glass-handoff.schema.json"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/index.ts"
  - "scripts/validate-schemas.ts"
  - "scripts/validate-type-schema-sync.ts"
  - "tests/schema-fixtures/manifest.json"
  - "tests/schema-fixtures/positive/governance-write-intent.json"
  - "tests/schema-fixtures/positive/governance-patch-proposal.json"
  - "tests/schema-fixtures/positive/governance-broker-decision.json"
  - "tests/schema-fixtures/positive/governance-merge-plan.json"
  - "tests/schema-fixtures/positive/governance-break-glass-handoff.json"
  - "tests/schema-fixtures/negative/invalid-write-intent-missing-task-id.json"
  - "tests/schema-fixtures/negative/invalid-patch-proposal-missing-anchor.json"
  - "tests/schema-fixtures/negative/invalid-broker-decision-missing-verdict.json"
  - "tests/schema-fixtures/negative/invalid-merge-plan-overlapping-conflicts.json"
  - "tests/schema-fixtures/negative/invalid-break-glass-handoff-missing-approval.json"
deliverables:
  - "schemas/governance/write-intent.schema.json"
  - "schemas/governance/patch-proposal.schema.json"
  - "schemas/governance/broker-decision.schema.json"
  - "schemas/governance/merge-plan.schema.json"
  - "schemas/governance/break-glass-handoff.schema.json"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/index.ts"
  - "scripts/validate-schemas.ts"
  - "scripts/validate-type-schema-sync.ts"
  - "tests/schema-fixtures/manifest.json"
  - "tests/schema-fixtures/positive/governance-write-intent.json"
  - "tests/schema-fixtures/positive/governance-patch-proposal.json"
  - "tests/schema-fixtures/positive/governance-broker-decision.json"
  - "tests/schema-fixtures/positive/governance-merge-plan.json"
  - "tests/schema-fixtures/positive/governance-break-glass-handoff.json"
  - "tests/schema-fixtures/negative/invalid-write-intent-missing-task-id.json"
  - "tests/schema-fixtures/negative/invalid-patch-proposal-missing-anchor.json"
  - "tests/schema-fixtures/negative/invalid-broker-decision-missing-verdict.json"
  - "tests/schema-fixtures/negative/invalid-merge-plan-overlapping-conflicts.json"
  - "tests/schema-fixtures/negative/invalid-break-glass-handoff-missing-approval.json"
validators:
  - "npm run typecheck"
  - "npm run validate:schemas"
  - "node --strip-types scripts/validate-type-schema-sync.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the schema/type commit and remove any newly introduced broker schema exports."
atomizationImpact:
  ownerAtomOrMap: "atm.write-broker-schema-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "This card births the schema/type layer for brokered writes and must register ownership for the new broker paths."
outOfScope:
  - "Registry runtime or CLI commands"
  - "tasks parallel verdict changes"
  - "proposal composition, steward apply, or Team integration"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
---

# TASK-CID-0015 - Broker contract schemas and types

## Goal

Create the first-class governance schemas and TypeScript types for `WriteIntent.v1`, `PatchProposal.v1`, `BrokerDecision.v1`, `MergePlan.v1`, and `BreakGlassHandoff.v1`.

## Why This Exists

`TASK-CID-0009` ~ `TASK-CID-0012` define these objects in planning prose. This card converts those contracts into schema-validated runtime artifacts so later registry, broker, proposal, steward, and Team flows can share one typed language.

## Acceptance Criteria

- All five broker governance schemas exist under `schemas/governance/`.
- Shared TS types are exported from `packages/core/src/broker/`.
- Existing schema validators and type/schema sync validation know about the new broker contracts.
- `tests/schema-fixtures/manifest.json` plus the broker positive/negative fixture set provide command-backed payload coverage for the new schemas.
- `scripts/validate-type-schema-sync.ts` explicitly reads the broker type source, not only a re-export surface.
- No runtime registry, CLI, or lifecycle mutation logic is implemented in this card.

## Notes

Captain cadence target: one primary `007` implementation wave, then one `005` / `006` closeout wave. Internal sidecars may be used only for schema pattern matching, CLI surface grep, and regression checklist convergence.
