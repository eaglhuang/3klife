---
task_id: ATM-GOV-0294
title: Causal neighborhood compiler and factor combination generator
status: done
owner: unassigned
priority: P0
milestone: ATM-GOV-PLAN4-R1
amendment_epoch: 1
depends_on:
  - ATM-GOV-0280
  - ATM-GOV-0293
causalGraph:
  causalDependencies:
    - ATM-GOV-0280
    - ATM-GOV-0293
  startConditions:
    - ATM-GOV-0280 is done and exposes causal graph/test coverage gap inputs.
    - ATM-GOV-0293 is done and exposes stable fault fingerprints and family candidates.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - ATM-GOV-0305 cumulative regression family store
  changedPublicSeams:
    - atm.causalNeighborhood.v1
    - atm.factorCombinationPlan.v1
    - atm.regressionCaseExpansion.v1
  causalImpactEdges:
    - fault fingerprint -> causal neighborhood lookup
    - adjacent public seams -> candidate factor dimensions
    - factor constraints -> bounded combination set
    - excluded combinations -> explicit non-claim reasons
  parallelFrontierInputs:
    - ATM-GOV-0280 coverage gap evidence
    - ATM-GOV-0293 fault fingerprint and family match result
  validatorReferences:
    - node --strip-types tests/cli/plan4-causal-neighborhood-compiler.test.ts
    - node --strip-types tests/cli/plan4-factor-combination-generator.test.ts
    - npm run typecheck
  phaseOwner: plan4-causal-neighborhood
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/causal-neighborhood.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/causal-neighborhood.schema.json
  - tests/catalog/groups/test_group_plan4_causal_neighborhood.shard.json
  - tests/cli/plan4-causal-neighborhood-compiler.test.ts
  - tests/cli/plan4-factor-combination-generator.test.ts
deliverables:
  - packages/core/src/evidence/causal-neighborhood.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/causal-neighborhood.schema.json
  - tests/catalog/groups/test_group_plan4_causal_neighborhood.shard.json
  - tests/cli/plan4-causal-neighborhood-compiler.test.ts
  - tests/cli/plan4-factor-combination-generator.test.ts
validators:
  - node --strip-types tests/cli/plan4-causal-neighborhood-compiler.test.ts
  - node --strip-types tests/cli/plan4-factor-combination-generator.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_atm_gov_0294_causal_neighborhood_from_fingerprint_23b6ac8e
    targetGroupId: test_group_plan4_causal_neighborhood
    semanticKey: plan4_causal_neighborhood_from_fingerprint
    coversAcceptance:
      - ACC-1
      - ACC-2
    coversImpactEdges:
      - fault fingerprint -> causal neighborhood lookup
      - adjacent public seams -> candidate factor dimensions
    expectedRedPredicate: Compiler only records the observed counterexample and omits adjacent seams sharing the same causal mechanism.
    responsibility: task-required
    contractEdge: plan4-causal-neighborhood-compiler
  - caseId: test_atm_gov_0294_bounded_factor_combination_plan_f9c70518
    targetGroupId: test_group_plan4_causal_neighborhood
    semanticKey: plan4_bounded_factor_combination_plan
    coversAcceptance:
      - ACC-3
      - ACC-4
      - ACC-5
    coversImpactEdges:
      - factor constraints -> bounded combination set
      - excluded combinations -> explicit non-claim reasons
    expectedRedPredicate: Generator explodes into unbounded Cartesian products or silently drops excluded combinations.
    responsibility: task-required
    contractEdge: plan4-factor-combination-generator
requiredTestCaseIds:
  - test_atm_gov_0294_causal_neighborhood_from_fingerprint_23b6ac8e
  - test_atm_gov_0294_bounded_factor_combination_plan_f9c70518
tddMode: required
evidence:
  required: command-backed-neighborhood-and-factor-generation
rollback:
  strategy: revert-commit-and-disable-plan4-factor-expansion
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.causal-neighborhood-compiler
      pattern: Policy Object
      source: packages/core/src/evidence/causal-neighborhood.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-08T18:42:56.435Z"
completed_by_agent: "codex-captain-2026-08-09"
closedAt: "2026-08-08T18:42:56.435Z"
closedByActor: "codex-captain-2026-08-09"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-08T18-42-56-435Z-close-34a83d26bc2e"
lastTransitionAt: "2026-08-08T18:42:56.435Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d417b2e4f32d291db8352e7d880517eaebb7ce5a"
---

# ATM-GOV-0294 Causal neighborhood compiler and factor combination generator

## Intent

Compile a confirmed family match into the nearby seams and factor combinations
that should be tested next. This is the "if one pipe leaks, test the connected
joints with the same pressure pattern" layer.

## Acceptance

- [ ] ACC-1: compiler derives causal neighborhood from fingerprint, public
      seam, impact edges, validator refs, and changed files.
- [ ] ACC-2: adjacent factors sharing the same root mechanism are included as
      candidate regression cases.
- [ ] ACC-3: factor combinations are bounded by declared constraints and
      deterministic ordering.
- [ ] ACC-4: excluded factors record explicit non-claim reasons.
- [ ] ACC-5: tests cover expansion, bounding, ordering, and exclusion evidence.

## Non-goals

- Do not decide family identity; `ATM-GOV-0293` owns matching.
- Do not store revisions or select runtime families; `ATM-GOV-0305` owns those.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-30T21:14:00.000Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0294-causal-neighborhood-compiler-and-factor-combination-generator.task.md"} -->
