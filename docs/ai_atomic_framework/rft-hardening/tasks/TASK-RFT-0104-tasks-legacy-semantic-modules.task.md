---
task_id: TASK-RFT-0104
title: Extract bounded semantic modules from tasks legacy implementation
status: done
owner: atm-core
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-RFT-0033 is closed in the target ledger
    - tasks legacy implementation is measured for physical lines and maximum line width before editing
  softRelations:
    - ATM-BUG-2026-07-15-196
  changedPublicSeams:
    - tasks legacy facade exports remain behavior-compatible
  causalImpactEdges:
    - tasks-legacy-semantic-modules
  parallelFrontierInputs: []
  validatorReferences:
    - tasks-legacy-impl-extraction
  phaseOwner: null
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/legacy-impl.ts
  - packages/cli/src/commands/tasks/legacy/implementation.ts
  - packages/cli/src/commands/tasks/legacy/**/*.ts
  - tests/cli/tasks-legacy-impl-extraction.test.ts
deliverables:
  - packages/cli/src/commands/tasks/legacy-impl.ts
  - packages/cli/src/commands/tasks/legacy/implementation.ts
  - packages/cli/src/commands/tasks/legacy/**/*.ts
  - tests/cli/tasks-legacy-impl-extraction.test.ts
validators:
  - node --strip-types tests/cli/tasks-legacy-impl-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: tasks_legacy_semantic_module_boundaries_0104
    targetGroupId: null
    semanticKey: tasks_legacy_semantic_module_boundaries
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [tasks-legacy-semantic-modules]
    expectedRedPredicate: the legacy implementation contains an oversized physical line and lacks a bounded semantic module boundary
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: tasks-legacy-impl-extraction
    resourceKey: null
requiredTestCaseIds:
  - tasks_legacy_semantic_module_boundaries_0104
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
  ownerAtomOrMap: atm.tasks-legacy
  mapUpdates: []
  extractionCandidates:
    - atom: atm.tasks-legacy-parallel-advisor
      pattern: Strategy Map
      source: packages/cli/src/commands/tasks/legacy/implementation.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-09-06T16:09:52.105Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-06T16:09:52.105Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-06T16-09-52-105Z-close-2ba421847384"
lastTransitionAt: "2026-09-06T16:09:52.105Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "463745d226c950858fd07c42eb8fbce73e0cd366"
---

# TASK-RFT-0104 - Extract bounded semantic modules from tasks legacy implementation

## Acceptance

- Extract at least one complete semantic command family from the compressed
  implementation into readable modules, keeping every touched source and test
  module at or below 600 physical lines and no individual line above 1000
  characters.
- Preserve all existing facade exports and task lifecycle behavior; strengthen
  the extraction regression test so a compressed oversized line cannot pass by
  merely reducing the physical line count.

## Boundaries

- Do not change release artifacts, npm publication, backlog projections, or
  unrelated task command behavior.
- Do not delete, restore, stage, or absorb foreign residue.
- Do not reopen TASK-RFT-0033 history.
