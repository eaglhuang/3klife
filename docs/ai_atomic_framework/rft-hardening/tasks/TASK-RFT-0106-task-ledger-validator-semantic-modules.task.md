---
task_id: TASK-RFT-0106
title: Extract bounded semantic modules from task-ledger validator implementation
status: planned
owner: atm-core
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-RFT-0035 is closed in the target ledger
    - task-ledger validator implementation is measured for physical lines and maximum line width before editing
  softRelations:
    - ATM-BUG-2026-07-15-198
  changedPublicSeams:
    - task-ledger validator suite exports remain behavior-compatible
  causalImpactEdges:
    - task-ledger-validator-semantic-modules
  parallelFrontierInputs: []
  validatorReferences:
    - task-ledger-validator-extraction
  phaseOwner: null
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validators/task-ledger/suite-impl.ts
  - scripts/validators/task-ledger/suite-impl/implementation.ts
  - scripts/validators/task-ledger/suite-impl/**/*.ts
  - tests/cli/task-ledger-validator-extraction.test.ts
deliverables:
  - scripts/validators/task-ledger/suite-impl.ts
  - scripts/validators/task-ledger/suite-impl/implementation.ts
  - scripts/validators/task-ledger/suite-impl/**/*.ts
  - tests/cli/task-ledger-validator-extraction.test.ts
validators:
  - node --strip-types tests/cli/task-ledger-validator-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: task_ledger_validator_semantic_module_boundaries_0106
    targetGroupId: null
    semanticKey: task_ledger_validator_semantic_module_boundaries
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [task-ledger-validator-semantic-modules]
    expectedRedPredicate: task-ledger validator implementation contains an oversized physical line and lacks bounded semantic module boundaries
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: task-ledger-validator-extraction
    resourceKey: null
requiredTestCaseIds:
  - task_ledger_validator_semantic_module_boundaries_0106
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
  ownerAtomOrMap: atm.task-ledger-validator
  mapUpdates: []
  extractionCandidates:
    - atom: atm.task-ledger-validator-harness
      pattern: Validator Suite Map
      source: scripts/validators/task-ledger/suite-impl/implementation.ts
      disposition: extract
      inlineReason: null
    - atom: atm.task-ledger-validator-closeout
      pattern: Result Contract Object
      source: scripts/validators/task-ledger/suite-impl/implementation.ts
      disposition: follow-up-card
      inlineReason: null
---

# TASK-RFT-0106 - Extract bounded semantic modules from task-ledger validator implementation

## Acceptance

- Extract at least one complete task-ledger validator family into readable
  modules, keeping every touched source and test module at or below 600
  physical lines and no individual line above 1000 characters.
- Preserve the public suite exports and validator behavior; add a deterministic
  red-to-green extraction-boundary receipt.

## Boundaries

- Do not change release artifacts, npm publication, backlog projections, or
  unrelated validator behavior.
- Do not delete, restore, stage, or absorb foreign residue.
- Do not reopen TASK-RFT-0035 history.
