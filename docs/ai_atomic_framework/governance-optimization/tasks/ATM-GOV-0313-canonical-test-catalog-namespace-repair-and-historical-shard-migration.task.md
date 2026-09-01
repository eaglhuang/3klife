---
task_id: ATM-GOV-0313
title: Canonical test-catalog namespace repair and historical shard migration
status: done
owner: unassigned
priority: P2
depends_on:
  - ATM-GOV-0306
causalGraph:
  causalDependencies:
    - ATM-GOV-0306
  startConditions:
    - ATM-BUG-2026-07-31-012 is recorded as open with a reproducible full-catalog validator failure.
    - The canonical test-case schema and deterministic ID builder remain the authority.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - governance-optimization/plan-3x-4x-objective-evidence-matrix-2026-07-31.md
  changedPublicSeams:
    - atm.testCaseGroup.v1
    - atm.generatedTestCaseCatalog.v1
    - atm.testCaseId.v1
  causalImpactEdges:
    - legacy case id -> canonical schema-valid id with alias lineage
    - full catalog scan -> zero schema diagnostics
    - linked planned task -> governed re-import fidelity
    - migration rollback -> historical evidence preserved and reconcile-required
  parallelFrontierInputs:
    - ATM-GOV-0307/0312 valid catalog contract scaffolds
    - ATM-BUG-2026-07-31-012 failing full-catalog receipt
  validatorReferences:
    - node --strip-types tests/cli/test-case-catalog-shards.test.ts
    - node --strip-types tests/cli/plan4-catalog-contract.test.ts
  phaseOwner: plan4-catalog-contract
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/governance/atm-bug-and-optimization-backlog.md
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-31-012.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-31-013.json
  - packages/cli/src/commands/test-catalog.ts
  - packages/core/src/evidence/test-case-catalog.ts
  - schemas/validators/test-case-group.schema.json
  - tests/cli/commit-attribution-sealed-transaction.test.ts
  - tests/catalog/groups/test_group_commit_attribution.shard.json
  - tests/catalog/groups/test_group_plan4_catalog_contract.shard.json
  - tests/catalog/groups/test_group_plan4_quality_gauntlet.shard.json
  - tests/catalog/groups/test_group_plan4_validator_selection.shard.json
  - tests/catalog/groups/test_group_plan4_mutation_lineage.shard.json
  - tests/catalog/groups/test_group_plan4_obligation_inventory.shard.json
  - tests/catalog/groups/test_group_plan4_coverage_universe.shard.json
  - tests/catalog/groups/test_group_plan4_coverage_semantics.shard.json
  - tests/cli/test-case-catalog-shards.test.ts
  - tests/cli/plan4-catalog-contract.test.ts
  - tests/cli/plan4-quality-gauntlet.test.ts
  - tests/cli/plan4-validator-catalog-selection.test.ts
  - tests/cli/plan4-mutation-adapter.test.ts
  - tests/cli/plan4-mutation-lineage-equivalence.test.ts
  - tests/cli/plan4-obligation-inventory.test.ts
  - tests/cli/plan4-coverage-universe-compiler.test.ts
  - tests/cli/plan4-coverage-semantics.test.ts
deliverables:
  - tests/catalog/groups/test_group_commit_attribution.shard.json
  - tests/catalog/groups/test_group_plan4_catalog_contract.shard.json
  - tests/cli/test-case-catalog-shards.test.ts
  - tests/cli/plan4-catalog-contract.test.ts
validators:
  - node --strip-types tests/cli/test-case-catalog-shards.test.ts
  - node --strip-types tests/cli/plan4-catalog-contract.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:git-head-evidence
errorCodes: []
requiredTestCaseIds:
  - test_task_atm_gov_0313_historical_shard_namespace_migration_8a48480f
  - test_task_atm_gov_0313_complete_catalog_schema_contract_7d958211
testContributions:
  - caseId: test_task_atm_gov_0313_historical_shard_namespace_migration_8a48480f
    targetGroupId: test_group_plan4_catalog_contract
    semanticKey: historical_shard_namespace_migration
    coversAcceptance: [ACC-1, ACC-2, ACC-4]
    coversImpactEdges:
      - legacy case id -> canonical schema-valid id with alias lineage
      - linked task requiredTestCaseId -> governed re-import fidelity
      - linked planned task -> governed re-import fidelity
    expectedRedPredicate: Any catalog shard or planned task card still depends on a caseId outside the test_int_/test_task_ namespaces, or a valid test_task_atm_gov_ identifier was renamed by the migration.
    responsibility: task-required
    contractEdge: catalog-namespace-migration
  - caseId: test_task_atm_gov_0313_complete_catalog_schema_contract_7d958211
    targetGroupId: test_group_plan4_catalog_contract
    semanticKey: complete_catalog_schema_contract
    coversAcceptance: [ACC-3, ACC-5, ACC-6]
    coversImpactEdges:
      - full catalog scan -> zero schema diagnostics
      - canonical id builder -> deterministic no-collision namespace
      - migration rollback -> historical evidence preserved and reconcile-required
    expectedRedPredicate: The full catalog validator can fail while focused new shards appear green, or canonical IDs are non-deterministic.
    responsibility: task-required
    contractEdge: catalog-validator-completeness
evidence:
  required: command-backed
  realness: fresh-sealed
rollback:
  strategy: revert-commit-and-preserve-alias-lineage
  notes: Revert the migration while retaining an explicit alias map and the pre-migration sealed catalog receipt; do not rewrite historical evidence.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-test-catalog
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.test-case-catalog-contract
      pattern: Policy Object
      source: packages/cli/src/commands/test-catalog.ts
      disposition: follow-up-card
      inlineReason: null
createdByCommand: atm plan card create
---

# ATM-GOV-0313 Canonical test-catalog namespace repair and historical shard migration

## Intent

Repair the catalog contract exposed by `ATM-BUG-2026-07-31-012`: migrate every
identifier outside the canonical `test_int_` / `test_task_` namespaces to a
deterministic schema-valid identifier, preserve explicit alias/lineage
information, and make the complete repository catalog validator authoritative.
Historical evidence must remain immutable; planned task cards must be
re-imported through ATM rather than edited in the target ledger.

### Corrected defect scope (Claude-007, full-catalog enumeration)

`ATM-BUG-2026-07-31-012` and the first draft of this card both stated the
defect as "three `test_atm_gov_` case ids". A complete scan of all 23 cases in
`tests/catalog/groups/**` against the schema pattern
`^(test_int_|test_task_)[A-Za-z0-9_.:-]+$` disproves that on both sides. The
authoritative offender set is exactly these five:

| Shard | Invalid caseId |
| --- | --- |
| `test_group_commit_attribution` | `test_broker_apply_admission_before_ref_update` |
| `test_group_commit_attribution` | `test_sealed_commit_dual_lane_prepare_and_broker_finalization` |
| `test_group_commit_attribution` | `test_governed_commit_seal_source_and_provenance_gates` |
| `test_group_plan4_coverage_semantics` | `test_atm_gov_0277_model_relative_certificate_vocabulary_0d0fd68c` |
| `test_group_plan4_obligation_inventory` | `test_atm_gov_0279_obligation_inventory_drift_detector_5c7f6251` |

Two consequences bind this card:

1. `test_task_atm_gov_*` identifiers are **schema-valid** and MUST NOT be
   migrated. Six such cases exist, and they are referenced by the
   `requiredTestCaseIds` of already-closed cards (0277, 0279, 0280, 0284, 0285,
   0306). Renaming them would invalidate sealed closure evidence to repair a
   defect that does not exist. This card's own required case ids are in that
   same valid namespace.
2. The `test_broker_` / `test_sealed_` / `test_governed_` family is part of the
   defect and was absent from the original diagnosis.

Root cause of the miscount: the shard validator asserts per shard and aborts on
the first failure, so only `test_group_commit_attribution` was ever reported.
ACC-3's full-catalog aggregation requirement is what prevents a recurrence.

## Acceptance

- [ ] ACC-1: Every catalog shard validates against the canonical schema and no
      catalog entry uses a caseId outside the `test_int_` / `test_task_`
      namespaces. Exactly the five identifiers listed under "Corrected defect
      scope" are migrated; the six valid `test_task_atm_gov_*` identifiers are
      left byte-identical, and the regression asserts they were not renamed.
- [ ] ACC-2: Each migrated identifier is deterministic, collision-free, and
      retains an explicit alias/lineage record for historical references.
- [ ] ACC-3: Full-catalog validation passes, not merely the two new 0307/0312
      shards; the regression fails if any shard is omitted from the scan.
- [ ] ACC-4: Every still-planned card that consumes a migrated case id is
      updated by dry-run then governed import, with frontmatter fidelity proof.
- [ ] ACC-5: Focused regression covers legacy-id rejection, canonical-id
      generation, alias resolution, and a negative control for silent omission.
- [ ] ACC-6: Rollback preserves historical sealed evidence and leaves the
      catalog in an explicit reconcile-required state rather than false green.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T14:29:00.799Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0313-canonical-test-catalog-namespace-repair-and-historical-shard-migration.task.md","contentDigest":"sha256:47af61f5474dee73cd386c241137c6a6a561297d3c8123b1cafa1e21daf4be37"} -->
