---
task_id: TASK-RFT-0105
title: Extract bounded semantic modules from closure-packet schema implementation
status: planned
owner: atm-core
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-RFT-0034 is closed in the target ledger
    - closure-packet schema implementation is measured for physical lines and maximum line width before editing
  softRelations:
    - ATM-BUG-2026-07-15-197
  changedPublicSeams:
    - closure-packet schema facade exports remain behavior-compatible
  causalImpactEdges:
    - closure-packet-semantic-modules
  parallelFrontierInputs: []
  validatorReferences:
    - closure-packet-schema-extraction
  phaseOwner: null
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/framework-development/closure-packet-schema.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/**/*.ts
  - tests/cli/closure-packet-schema-extraction.test.ts
deliverables:
  - packages/cli/src/commands/framework-development/closure-packet-schema.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/**/*.ts
  - tests/cli/closure-packet-schema-extraction.test.ts
validators:
  - node --strip-types tests/cli/closure-packet-schema-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: closure_packet_schema_semantic_module_boundaries_0105
    targetGroupId: null
    semanticKey: closure_packet_schema_semantic_module_boundaries
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [closure-packet-semantic-modules]
    expectedRedPredicate: closure-packet schema implementation contains an oversized physical line and lacks bounded semantic module boundaries
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: closure-packet-schema-extraction
    resourceKey: null
requiredTestCaseIds:
  - closure_packet_schema_semantic_module_boundaries_0105
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.closure-packet-schema
  mapUpdates: []
  extractionCandidates:
    - atom: atm.closure-packet-schema-validation
      pattern: Policy Object
      source: packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
      disposition: extract
      inlineReason: null
    - atom: atm.closure-packet-schema-evidence
      pattern: Result Contract Object
      source: packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
      disposition: follow-up-card
      inlineReason: null
---

# TASK-RFT-0105 - Extract bounded semantic modules from closure-packet schema implementation

## Acceptance

- Extract at least one complete semantic closure-packet schema family into
  readable modules, keeping every touched source and test module at or below
  600 physical lines and no individual line above 1000 characters.
- Preserve all existing facade exports and closure-packet behavior; add a
  deterministic red-to-green extraction-boundary receipt.

## Boundaries

- Do not change release artifacts, npm publication, backlog projections, or
  unrelated framework-development behavior.
- Do not delete, restore, stage, or absorb foreign residue.
- Do not reopen TASK-RFT-0034 history.
