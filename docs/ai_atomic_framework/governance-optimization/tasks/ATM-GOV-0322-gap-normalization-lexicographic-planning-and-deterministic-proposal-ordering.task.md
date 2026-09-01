---
task_id: ATM-GOV-0322
title: Gap normalization, lexicographic planning and deterministic proposal ordering
status: planned
owner: unassigned
priority: P1
depends_on: [ATM-GOV-0318, ATM-GOV-0288, ATM-GOV-0306]
causalGraph:
  causalDependencies: [ATM-GOV-0318, ATM-GOV-0288, ATM-GOV-0306]
  startConditions: ["0318 freshness, 0288 denominator, and 0306 mutation lineage are fresh and sealed"]
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams: [atm.gapNormalization.v1, atm.lexicographicProposalPlan.v1]
  causalImpactEdges: ["duplicate/ambiguous gaps -> deterministic normalization", "proposal ordering -> monotonic frontier reduction"]
  parallelFrontierInputs: [ATM-GOV-0318 freshness, ATM-GOV-0288 coverage ratchet, ATM-GOV-0306 mutation lineage]
  validatorReferences: [node --strip-types tests/cli/plan4-gap-normalization.test.ts, node --strip-types tests/cli/plan4-proposal-ordering.test.ts]
  phaseOwner: Plan4-generation-loop
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths: [packages/core/src/evidence, schemas/evidence, tests/cli/plan4-gap-normalization.test.ts, tests/cli/plan4-proposal-ordering.test.ts, tests/catalog/groups/test_group_plan4_gap_planning.shard.json]
deliverables: [gap normalization adapter, lexicographic proposal planner, deterministic ordering receipt, focused tests, catalog shard]
validators: [node --strip-types tests/cli/plan4-gap-normalization.test.ts, node --strip-types tests/cli/plan4-proposal-ordering.test.ts, npm run typecheck, npm run validate:cli, npm run validate:git-head-evidence]
errorCodes: [ATM_GAP_NORMALIZATION_AMBIGUOUS, ATM_PROPOSAL_ORDER_NOT_DETERMINISTIC]
testContributions:
  - caseId: test_task_atm_gov_0322_gap_normalization_4b9e2c71
    targetGroupId: test_group_plan4_gap_planning
    semanticKey: plan4_gap_normalization
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: ["duplicate/ambiguous gaps -> deterministic normalization"]
    responsibility: task-required
  - caseId: test_task_atm_gov_0322_proposal_order_7d1f5a83
    targetGroupId: test_group_plan4_gap_planning
    semanticKey: plan4_lexicographic_proposal_ordering
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: ["proposal ordering -> monotonic frontier reduction"]
    responsibility: task-required
requiredTestCaseIds: [test_task_atm_gov_0322_gap_normalization_4b9e2c71, test_task_atm_gov_0322_proposal_order_7d1f5a83]
evidence:
  required: command-backed
  realness: fresh-sealed-and-replayable
rollback:
  strategy: disable-proposal-planner-and-preserve-existing-frontier
  notes: Retain normalized gap observations while reverting planner publication.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates: [atomic_workbench/atomization-coverage/path-to-atom-map.json]
createdByCommand: atm plan card create
---

# ATM-GOV-0322 Gap normalization, lexicographic planning and deterministic proposal ordering

## Intent

Normalize equivalent gaps and produce deterministic lexicographic proposals
without allowing a writer to reorder, duplicate, or enlarge the gap frontier.

## Acceptance

- [ ] Equivalent gaps normalize to one stable identity and ambiguous gaps fail closed.
- [ ] Proposal order is deterministic across replay and independent of actor/date/path.
- [ ] Accepted proposals monotonically reduce the sealed gap frontier.
- [ ] Evidence includes rollback, provenance, and deep-module review.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T15:49:03.976Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0322-gap-normalization-lexicographic-planning-and-deterministic-proposal-ordering.task.md","contentDigest":"sha256:3104077deef666e442626e185f4ae88220913d0160eb77770fb66656e57fc007"} -->
