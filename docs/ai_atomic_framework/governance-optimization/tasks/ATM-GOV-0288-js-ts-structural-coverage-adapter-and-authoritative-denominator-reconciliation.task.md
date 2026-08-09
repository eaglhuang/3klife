---
task_id: ATM-GOV-0288
title: JS/TS structural coverage adapter and authoritative denominator reconciliation
status: planned
owner: unassigned
priority: P2
depends_on:
  - ATM-GOV-0279
  - ATM-GOV-0285
causalGraph:
  causalDependencies:
    - ATM-GOV-0279
    - ATM-GOV-0285
  startConditions:
    - ATM-GOV-0279 and ATM-GOV-0285 are done/released.
    - The adapter has a pinned source inventory and deterministic fixture baseline.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams:
    - packages/core/src/evidence/structural-coverage.ts
    - packages/core/src/evidence/index.ts
  causalImpactEdges:
    - from: ATM-GOV-0288
      to: ATM-GOV-0289
      relation: authoritative-denominator
    - from: ATM-GOV-0288
      to: ATM-GOV-0316
      relation: structural-quality-proof
  parallelFrontierInputs:
    - packages/core/src/evidence/index.ts
  validatorReferences:
    - node --strip-types tests/cli/plan4-structural-coverage.test.ts
    - node --strip-types tests/cli/plan4-denominator-reconciliation.test.ts
  phaseOwner: plan4-structural-quality
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/structural-coverage.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/structural-coverage.schema.json
  - tests/catalog/groups/test_group_plan4_structural_coverage.shard.json
  - tests/cli/plan4-structural-coverage.test.ts
  - tests/cli/plan4-denominator-reconciliation.test.ts
deliverables:
  - packages/core/src/evidence/structural-coverage.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/structural-coverage.schema.json
  - tests/catalog/groups/test_group_plan4_structural_coverage.shard.json
  - tests/cli/plan4-structural-coverage.test.ts
  - tests/cli/plan4-denominator-reconciliation.test.ts
validators:
  - node --strip-types tests/cli/plan4-structural-coverage.test.ts
  - node --strip-types tests/cli/plan4-denominator-reconciliation.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed adapter output, schema validation, and bundle-vs-tree proof
rollback:
  strategy: revert-commit-and-remove-generated-receipts
atomizationImpact:
  ownerAtomOrMap: atom-core-evidence
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.structural-coverage-adapter
      pattern: Policy Object
      source: packages/core/src/evidence/structural-coverage.ts
      disposition: extract
      inlineReason: null
errorCodes: []
requiredTestCaseIds:
  - test_task_atm_gov_0288_structural_coverage_6e4b2a91
  - test_task_atm_gov_0288_denominator_reconciliation_3c7f8d20
testContributions:
  - caseId: test_task_atm_gov_0288_structural_coverage_6e4b2a91
    targetGroupId: test_group_plan4_structural_coverage
    semanticKey: plan4_structural_coverage
    coversAcceptance: [ACC-1, ACC-2, ACC-5]
    coversImpactEdges: ["from=ATM-GOV-0288; relation=authoritative-denominator; to=ATM-GOV-0289"]
    responsibility: task-required
  - caseId: test_task_atm_gov_0288_denominator_reconciliation_3c7f8d20
    targetGroupId: test_group_plan4_structural_coverage
    semanticKey: plan4_denominator_reconciliation
    coversAcceptance: [ACC-3, ACC-4, ACC-5]
    coversImpactEdges: ["from=ATM-GOV-0288; relation=structural-quality-proof; to=ATM-GOV-0316"]
    responsibility: task-required
createdByCommand: atm plan card create
---

# ATM-GOV-0288 JS/TS structural coverage adapter and authoritative denominator reconciliation

## Intent

Create a deterministic JS/TS structural-coverage adapter whose denominator is
compiled from the canonical obligation inventory, not from tool-reported files.
Reconcile source, changed, impacted, repository, and unreachable exclusions so
the same sealed inventory yields the same coverage certificate across runners.

## Acceptance

- [ ] ACC-1: adapter emits canonical obligation IDs, denominator digest, source
  inventory digest, and explicit reachable/unreachable exclusions.
- [ ] ACC-2: changed/impacted/repository views are projections of one authority;
  no view may silently add or drop obligations.
- [ ] ACC-3: denominator drift, duplicate IDs, unsupported syntax, and missing
  inventory inputs fail closed with repair commands.
- [ ] ACC-4: replaying the same sealed inventory is byte-stable and its proof can
  be consumed by ATM-GOV-0289 and ATM-GOV-0316.
- [ ] ACC-5: focused tests cover baseline reconciliation, drift, exclusions,
  deterministic replay, and schema-invalid output.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T15:55:23.588Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0288-js-ts-structural-coverage-adapter-and-authoritative-denominator-reconciliation.task.md","contentDigest":"sha256:ff0a7061cb009084662663e61f364ba936dc3838aba3eaeb6a3733bcc2ad39b8"} -->
