---
task_id: ATM-GOV-0305
title: Cumulative regression family store and selective routing
status: planned
owner: unassigned
priority: P0
milestone: ATM-GOV-PLAN4-R1
amendment_epoch: 1
depends_on:
  - ATM-GOV-0285
  - ATM-GOV-0293
  - ATM-GOV-0294
causalGraph:
  causalDependencies:
    - ATM-GOV-0285
    - ATM-GOV-0293
    - ATM-GOV-0294
  startConditions:
    - ATM-GOV-0285 is done and exposes validator/test-catalog selection inputs.
    - ATM-GOV-0293 is done and exposes fault fingerprint and semantic family matching.
    - ATM-GOV-0294 is done and exposes causal-neighborhood and factor-combination candidates.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - TASK-SKL-0036 incident-learning intake and backlog skill contract
    - TASK-SKL-0037 skill lifecycle projections
  changedPublicSeams:
    - atm.causalRegressionFamily.v1
    - atm.regressionFamilyRevision.v1
    - atm.regressionFamilyCatalogProjection.v1
    - atm.regressionFamilySelection.v1
  causalImpactEdges:
    - confirmed incident observation -> append-only family revision
    - fault fingerprint -> semantic family lookup or new family proposal
    - causal neighborhood factors -> bounded regression case expansion
    - task impact cone -> selective family routing
    - unknown mapping -> fail-closed mapping repair route
    - recurrence observation -> append-only lineage expansion
  parallelFrontierInputs:
    - ATM-GOV-0285 selector input contract
    - ATM-GOV-0293 fingerprint/family confidence policy
    - ATM-GOV-0294 causal-neighborhood factor compiler
    - TASK-SKL-0036 incidentLearningCandidate schema
  validatorReferences:
    - node --strip-types tests/cli/plan4-regression-family-store.test.ts
    - node --strip-types tests/cli/plan4-regression-family-selector.test.ts
    - node --strip-types tests/cli/plan4-regression-family-recurrence.test.ts
    - npm run typecheck
    - npm run validate:cli
  phaseOwner: plan4-regression-family
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/regression-family.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/causal-regression-family.schema.json
  - packages/cli/src/commands/test-catalog.ts
  - scripts/lib/test-catalog.ts
  - scripts/test-catalog.config.json
  - tests/catalog/groups/test_group_plan4_regression_family.shard.json
  - tests/cli/plan4-regression-family-store.test.ts
  - tests/cli/plan4-regression-family-selector.test.ts
  - tests/cli/plan4-regression-family-recurrence.test.ts
deliverables:
  - packages/core/src/evidence/regression-family.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/causal-regression-family.schema.json
  - tests/catalog/groups/test_group_plan4_regression_family.shard.json
  - tests/cli/plan4-regression-family-store.test.ts
  - tests/cli/plan4-regression-family-selector.test.ts
  - tests/cli/plan4-regression-family-recurrence.test.ts
validators:
  - node --strip-types tests/cli/plan4-regression-family-store.test.ts
  - node --strip-types tests/cli/plan4-regression-family-selector.test.ts
  - node --strip-types tests/cli/plan4-regression-family-recurrence.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_atm_gov_0305_append_only_family_revision_7e3c1a91
    targetGroupId: test_group_plan4_regression_family
    semanticKey: plan4_regression_family_append_only_revision
    coversAcceptance:
      - ACC-1
      - ACC-2
      - ACC-6
      - ACC-8
    coversImpactEdges:
      - confirmed incident observation -> append-only family revision
      - recurrence observation -> append-only lineage expansion
    expectedRedPredicate: A new incident overwrites or mutates a previous family revision instead of appending a new revision.
    responsibility: task-required
    contractEdge: plan4-family-append-only-lineage
  - caseId: test_atm_gov_0305_selective_family_routing_2c8a4d70
    targetGroupId: test_group_plan4_regression_family
    semanticKey: plan4_regression_family_selective_routing
    coversAcceptance:
      - ACC-3
      - ACC-4
      - ACC-5
      - ACC-8
    coversImpactEdges:
      - task impact cone -> selective family routing
      - unknown mapping -> fail-closed mapping repair route
    expectedRedPredicate: Selector runs unrelated family tests, skips related family tests, or treats unknown mapping as unrelated.
    responsibility: task-required
    contractEdge: plan4-family-selective-routing
  - caseId: test_atm_gov_0305_causal_factor_expansion_15bd3f09
    targetGroupId: test_group_plan4_regression_family
    semanticKey: plan4_regression_family_causal_factor_expansion
    coversAcceptance:
      - ACC-2
      - ACC-6
      - ACC-7
      - ACC-8
    coversImpactEdges:
      - causal neighborhood factors -> bounded regression case expansion
      - fault fingerprint -> semantic family lookup or new family proposal
    expectedRedPredicate: Family revision records only the observed counterexample and omits adjacent factor combinations that share the same causal mechanism.
    responsibility: task-required
    contractEdge: plan4-causal-neighborhood-expansion
requiredTestCaseIds:
  - test_atm_gov_0305_append_only_family_revision_7e3c1a91
  - test_atm_gov_0305_selective_family_routing_2c8a4d70
  - test_atm_gov_0305_causal_factor_expansion_15bd3f09
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
evidence:
  required: command-backed-family-store-selector-and-recurrence
rollback:
  strategy: revert-commit-and-ignore-plan4-family-catalog-projection
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.causal-regression-family
      pattern: Policy Object + Result Contract
      source: packages/core/src/evidence/regression-family.ts
      disposition: extract
      inlineReason: null
    - atom: atm.regression-family-selector
      pattern: Strategy
      source: packages/core/src/evidence/regression-family.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0305 Cumulative regression family store and selective routing

## Intent

Build the Plan 4.0 cumulative regression-family authority that turns every
confirmed escaped defect into an append-only family revision, a catalog
projection, and a focused selector decision. The module must let ATM keep
learning around the leaking seam without falling back to "run every test every
time" or "only patch the one case that just failed."

First-principles boundary:

- A defect is an observation, not immediately a family verdict.
- A family revision is append-only evidence, not mutable current opinion.
- Selection is a deterministic function over task impact, public seams,
  fingerprint confidence, family coverage, and unknown mappings.
- Unknown relevance must block with a mapping-repair route; it must not be
  silently treated as unrelated or force a run-all tax.
- Skills may collect and forward candidates, but this module owns the durable
  family store, denominator, selection digest, and recurrence revision.

Deep-module interface target:

```ts
observeRegressionFamily(input): RegressionFamilyRevisionResult
selectRegressionFamilies(input): RegressionFamilySelectionResult
projectRegressionFamilyCatalog(input): RegressionFamilyCatalogProjection
```

The implementation should hide schema normalization, lineage digesting,
unknown mapping policy, selector economics, and recurrence bookkeeping behind
these three seams. Callers and skills should consume typed result contracts
only.

## Acceptance

- [ ] ACC-1: `atm.causalRegressionFamily.v1` and
      `atm.regressionFamilyRevision.v1` preserve family id, fingerprint,
      causal neighborhood, factor constraints, generated/required case ids,
      source incident refs, confidence, parent revision, and digest.
- [ ] ACC-2: observing a confirmed incident appends a new family revision;
      it never overwrites existing revisions and it records recurrence
      lineage when the same family leaks again.
- [ ] ACC-3: selector chooses only families inside the task's impact cone,
      including public seams, causal impact edges, changed files, validator
      references, and task-card test ids.
- [ ] ACC-4: unrelated families are omitted with explicit reason codes so
      governance can save time without pretending omitted families were tested.
- [ ] ACC-5: unknown/conflicting family mapping fails closed with an executable
      mapping-repair route; it cannot pass by running zero tests and cannot
      blindly run all historical families.
- [ ] ACC-6: causal-neighborhood expansion includes adjacent factor
      combinations sharing the same root mechanism, so a leak adds more than
      the single observed counterexample.
- [ ] ACC-7: catalog projection emits a stable selection digest and family
      revision digest that `TASK-SKL-0037` skills can reference without
      recomputing policy.
- [ ] ACC-8: validators prove red/green behavior for append-only revision,
      selective routing, unknown mapping fail-closed, recurrence expansion,
      and unrelated-family omission.

## Implementation notes

- Prefer one core policy/result-contract module plus thin CLI/test-catalog
  adapters. Do not duplicate root-cause or family-selection policy in skills.
- Existing `test-case-catalog` surfaces may be extended, but do not create a
  second catalog authority.
- Any schema or catalog projection must be deterministic and digestable.
- The card is a prerequisite for `TASK-SKL-0037`; leave skills read-only until
  this card seals typed family revision and selection contracts.

## Non-goals

- Do not implement mutation testing engines, fuzzers, or full coverage
  economics here.
- Do not enable Plan 4.0 final release gates.
- Do not edit skill templates; `TASK-SKL-0037` owns that projection.
- Do not hard-code incident ids, local paths, actors, or dates in production
  policy.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-30T21:06:17.461Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0305-cumulative-regression-family-store-and-selective-routing.task.md","contentDigest":"sha256:38855d7312537c2a7c7a779d3621e17bc0fd6ba6a20eea58fd7129d38f7fa8b8"} -->
