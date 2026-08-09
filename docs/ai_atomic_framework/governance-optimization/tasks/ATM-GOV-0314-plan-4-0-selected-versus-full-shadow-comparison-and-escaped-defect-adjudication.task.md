---
task_id: ATM-GOV-0314
title: Plan 4.0 selected-versus-full shadow comparison and escaped-defect adjudication
status: planned
owner: unassigned
priority: P1
depends_on: [ATM-GOV-0294, ATM-GOV-0305, ATM-GOV-0312, TASK-SKL-0037]
causalGraph:
  causalDependencies: [ATM-GOV-0294, ATM-GOV-0305, ATM-GOV-0312, TASK-SKL-0037]
  startConditions: ["0294/0305/0312/TASK-SKL-0037 are done with fresh evidence"]
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams:
    - atm.shadowComparison.v1
  causalImpactEdges:
    - selected-versus-full divergence -> selector policy epoch invalidation
  parallelFrontierInputs:
    - ATM-GOV-0312 objective certificate
  validatorReferences:
    - node --strip-types tests/cli/plan4-shadow-comparison.test.ts
  phaseOwner: Plan4-shadow-adjudication
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence
  - packages/cli/src/commands
  - schemas/evidence
  - tests/catalog/groups/test_group_plan4_shadow_comparison.shard.json
  - tests/cli/plan4-shadow-comparison.test.ts
deliverables:
  - selected-versus-full shadow receipt with selected/skipped/false-block/escaped/latency/cache/unknown dimensions
  - selector policy-epoch invalidation and legacy-authority comparison evidence
  - adversarial escaped-defect fixture and fail-closed adjudication
validators:
  - node --strip-types tests/cli/plan4-shadow-comparison.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:git-head-evidence
testContributions:
  - caseId: test_task_atm_gov_0314_shadow_comparison_2a6f9d41
    targetGroupId: test_group_plan4_shadow_comparison
    semanticKey: plan4_selected_full_shadow_comparison
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: ["selected-versus-full divergence -> selector policy epoch invalidation"]
    expectedRedPredicate: selected/full divergence is hidden or escaped defects are treated as pass
    responsibility: task-required
  - caseId: test_task_atm_gov_0314_shadow_adjudication_7c1b4e92
    targetGroupId: test_group_plan4_shadow_comparison
    semanticKey: plan4_escaped_defect_adjudication
    coversAcceptance: [ACC-3, ACC-4, ACC-5]
    coversImpactEdges: ["selected-versus-full divergence -> selector policy epoch invalidation"]
    expectedRedPredicate: escaped related defect does not invalidate policy epoch
    responsibility: task-required
requiredTestCaseIds:
  - test_task_atm_gov_0314_shadow_comparison_2a6f9d41
  - test_task_atm_gov_0314_shadow_adjudication_7c1b4e92
evidence:
  required: command-backed
  realness: fresh-sealed-and-real-dogfood
rollback:
  strategy: disable-selector-epoch-and-revert-shadow-policy
  notes: Preserve the legacy authority and sealed observations while reverting the selected-policy publication.
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0314 Plan 4.0 selected-versus-full shadow comparison and escaped-defect adjudication

## Intent

Produce a replayable shadow comparison for the same sealed candidate under the
legacy authority and the Plan 4.0 selected/broad policy. The receipt must make
all selected, skipped, false-blocked, escaped, latency, cache, and unknown
cases explicit; an escaped related defect invalidates the selector policy
epoch and cannot be hidden by a compensating score.

## Acceptance

- [ ] Shadow receipt records selected/skipped/false-block/escaped/latency/cache/unknown dimensions.
- [ ] Legacy authority remains independently executable and its result is preserved.
- [ ] Any escaped related defect invalidates the selector policy epoch and fails closed.
- [ ] Focused test covers clean parity, false block, escaped defect, cache invalidation, and unknown data.
- [ ] Fresh sealed evidence includes delivery, runner provenance, rollback, and deep-module review.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T15:03:21.138Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0314-plan-4-0-selected-versus-full-shadow-comparison-and-escaped-defect-adjudication.task.md","contentDigest":"sha256:24c98bfb6f54354d57c3ee9d7a986b73e2362729205e7ac22284c9fcdf2e23be"} -->
