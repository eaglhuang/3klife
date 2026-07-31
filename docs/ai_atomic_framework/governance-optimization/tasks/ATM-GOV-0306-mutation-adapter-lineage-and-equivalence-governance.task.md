---
task_id: ATM-GOV-0306
title: Mutation adapter, lineage, and equivalence governance
status: done
owner: unassigned
priority: P0
milestone: ATM-GOV-PLAN4-R1
amendment_epoch: 1
depends_on:
  - ATM-GOV-0285
causalGraph:
  causalDependencies:
    - ATM-GOV-0285
  startConditions:
    - ATM-GOV-0285 is done and exposes validator/test-catalog selection and resumable probe scheduling.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - ATM-GOV-0293 fault fingerprint and semantic family matching policy
  changedPublicSeams:
    - atm.mutationAdapter.v1
    - atm.mutationLineage.v1
    - atm.mutationEquivalenceGovernance.v1
  causalImpactEdges:
    - selected probe schedule -> mutation adapter execution window
    - mutant observation -> replayable lineage record
    - killed/survived outcome -> lower/upper score bounds
    - survivor classification -> equivalent vs non-equivalent evidence for family matching
    - unsupported/inconclusive adapter result -> fail-closed gate
  parallelFrontierInputs:
    - ATM-GOV-0285 selector and resumable probe schedule contracts
    - Plan 4.0 StrykerJS / in-process mutation adapter architecture
  validatorReferences:
    - node --strip-types tests/cli/plan4-mutation-adapter.test.ts
    - node --strip-types tests/cli/plan4-mutation-lineage-equivalence.test.ts
    - npm run typecheck
  phaseOwner: plan4-mutation-lineage
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/mutation-lineage.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/mutation-lineage.schema.json
  - tests/catalog/groups/test_group_plan4_mutation_lineage.shard.json
  - tests/cli/plan4-mutation-adapter.test.ts
  - tests/cli/plan4-mutation-lineage-equivalence.test.ts
deliverables:
  - packages/core/src/evidence/mutation-lineage.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/mutation-lineage.schema.json
  - tests/catalog/groups/test_group_plan4_mutation_lineage.shard.json
  - tests/cli/plan4-mutation-adapter.test.ts
  - tests/cli/plan4-mutation-lineage-equivalence.test.ts
validators:
  - node --strip-types tests/cli/plan4-mutation-adapter.test.ts
  - node --strip-types tests/cli/plan4-mutation-lineage-equivalence.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_atm_gov_0306_replayable_mutation_lineage_7c2e91a4
    targetGroupId: test_group_plan4_mutation_lineage
    semanticKey: plan4_replayable_mutation_lineage
    coversAcceptance:
      - ACC-1
      - ACC-2
      - ACC-6
    coversImpactEdges:
      - selected probe schedule -> mutation adapter execution window
      - mutant observation -> replayable lineage record
      - killed/survived outcome -> lower/upper score bounds
    expectedRedPredicate: Mutation observations omit mutant id, seed/digest, or lower/upper bounds, or are not replayable.
    responsibility: task-required
    contractEdge: plan4-mutation-lineage
  - caseId: test_atm_gov_0306_equivalence_and_fail_closed_adapter_9b18d0e3
    targetGroupId: test_group_plan4_mutation_lineage
    semanticKey: plan4_mutation_equivalence_fail_closed
    coversAcceptance:
      - ACC-3
      - ACC-4
      - ACC-5
      - ACC-6
    coversImpactEdges:
      - survivor classification -> equivalent vs non-equivalent evidence for family matching
      - unsupported/inconclusive adapter result -> fail-closed gate
    expectedRedPredicate: Equivalent survivors are treated as non-equivalent, unsupported adapters return pass, or lineage becomes the sole close authority for ATM-GOV-0293.
    responsibility: task-required
    contractEdge: plan4-mutation-equivalence
requiredTestCaseIds:
  - test_atm_gov_0306_replayable_mutation_lineage_7c2e91a4
  - test_atm_gov_0306_equivalence_and_fail_closed_adapter_9b18d0e3
tddMode: required
evidence:
  required: command-backed-mutation-lineage-and-equivalence-gate
rollback:
  strategy: revert-commit-and-disable-plan4-mutation-lineage-adapter
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.mutation-lineage-policy
      pattern: Policy Object
      source: packages/core/src/evidence/mutation-lineage.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-07-31T13:50:25.765Z"
completed_by_agent: "cursor-0306"
closedAt: "2026-07-31T13:50:25.765Z"
closedByActor: "cursor-0306"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-31T13-50-25-765Z-close-27bec557bc2a"
lastTransitionAt: "2026-07-31T13:50:25.765Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b31579017dac0efa66985d0ed5425434c3aa69a6"
---

# ATM-GOV-0306 Mutation adapter, lineage, and equivalence governance

## Intent

Provide the Plan 4.0 mutation adapter and replayable lineage contract that
classifies killed versus surviving mutants, records lower/upper score bounds,
and distinguishes equivalent from non-equivalent survivors. This card replaces
the never-authored `ATM-GOV-0292` slot and feeds `ATM-GOV-0293` with mutation
evidence that can strengthen or weaken family-match confidence without becoming
the sole authority.

## Acceptance

- [ ] ACC-1: a pinned deterministic mutation adapter (StrykerJS or an in-process
      fixture adapter) executes only inside an ATM-GOV-0285-selected probe window.
- [ ] ACC-2: every observation writes a replayable lineage record with mutant id,
      killed/survived outcome, lower/upper score bounds, and seed/digest identity.
- [ ] ACC-3: equivalence governance classifies survivors as equivalent or
      non-equivalent; raw tool pass never directly authorizes close.
- [ ] ACC-4: unsupported or inconclusive adapter results fail closed and must not
      return pass.
- [ ] ACC-5: lineage outputs are consumable by ATM-GOV-0293 as
      survivor/equivalence evidence that may strengthen or weaken confidence, but
      must not be the sole matching authority.
- [ ] ACC-6: focused tests cover killed, survived, equivalent, unsupported, and
      replay-from-digest paths.

## Non-goals

- Do not implement fault fingerprint / family matching; `ATM-GOV-0293` owns that.
- Do not store cumulative family revisions; `ATM-GOV-0305` owns that.
- Do not invent a second test catalog; selection remains under `ATM-GOV-0285`.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T12:44:15.047Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0306-mutation-adapter-lineage-and-equivalence-governance.task.md","contentDigest":"sha256:1469471073904c0789235d7ea0bf3b30f39f088dcf97cd96c1be2ea82cafae0c"} -->
