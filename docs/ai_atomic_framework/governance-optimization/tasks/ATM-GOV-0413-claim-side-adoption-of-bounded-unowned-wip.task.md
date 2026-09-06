---
task_id: ATM-GOV-0413
title: Add an explicit bounded claim-side adoption route for unowned WIP
status: planned
owner: atm-git-governance
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - ATM-BUG-2026-08-13-006 remains reproducible as a claim-admission gap.
    - Foreign active-claim and retained-WIP rejection remains fail-closed.
  softRelations:
    - ATM-BUG-2026-08-13-006
  changedPublicSeams:
    - tasks claim option parsing
    - canonical claim dirty-WIP admission
    - claim transition evidence
  causalImpactEdges:
    - bounded-unowned-wip-adoption
    - foreign-wip-rejection-preserved
    - claim-transition-rollback
  parallelFrontierInputs: []
  validatorReferences:
    - claim-foreign-unstaged-wip
    - claim-orchestrator
  phaseOwner: null
related_plan: governance-optimization/follow-ups/ATM-GOV-0413-claim-side-adoption-of-bounded-unowned-wip.plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/task-option-parsers/misc-claim-options.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
  - tests/cli/claim-foreign-unstaged-wip.test.ts
  - tests/cli/claim-adopt-unowned-wip.test.ts
deliverables:
  - packages/cli/src/commands/tasks/task-option-parsers/misc-claim-options.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
  - tests/cli/claim-foreign-unstaged-wip.test.ts
  - tests/cli/claim-adopt-unowned-wip.test.ts
validators:
  - node --strip-types tests/cli/claim-foreign-unstaged-wip.test.ts
  - node --strip-types tests/cli/claim-adopt-unowned-wip.test.ts
  - node --strip-types tests/cli/claim-orchestrator.spec.ts
  - npm run typecheck
testContributions:
  - caseId: test_claim_bounded_unowned_wip_adoption_0413_7b8f2d1a
    targetGroupId: null
    semanticKey: bounded_unowned_wip_adoption
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [bounded-unowned-wip-adoption, claim-transition-rollback]
    expectedRedPredicate: explicit adoption is required for unowned in-scope WIP and failed transitions leave no ownership residue
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: claim-adoption-contract
    resourceKey: null
  - caseId: test_claim_foreign_wip_rejection_preserved_0413_2d6e9a44
    targetGroupId: null
    semanticKey: foreign_wip_rejection_preserved
    coversAcceptance: [ACC-3]
    coversImpactEdges: [foreign-wip-rejection-preserved]
    expectedRedPredicate: adoption cannot admit foreign-owned, retained-owned, mixed, or out-of-scope dirty paths
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: claim-admission-contract
    resourceKey: null
requiredTestCaseIds:
  - test_claim_bounded_unowned_wip_adoption_0413_7b8f2d1a
  - test_claim_foreign_wip_rejection_preserved_0413_2d6e9a44
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
  notes: Revert the single target commit and preserve the original fail-closed claim gate.
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates:
    - atomic_workbench/maps/atm-cli-command-router-map.json
  extractionCandidates:
    - atom: atm.claim-dirty-wip-admission
      pattern: Policy Object
      source: packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
      disposition: inline
      inlineReason: The canonical helper already owns this policy and the change is a bounded option contract.
errorCodes:
  - code: ATM_CLAIM_FOREIGN_UNSTAGED_WIP
    disposition: reuse
    category: claim-admission
    trigger: A claim still intersects foreign, retained-owned, mixed, or out-of-scope dirty WIP.
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs tasks status --task <task-id> --json
    sourceOwner: packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
    registryOwnerTask: ATM-GOV-0413
    tests:
      - tests/cli/claim-foreign-unstaged-wip.test.ts
      - tests/cli/claim-adopt-unowned-wip.test.ts
