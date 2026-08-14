---
task_id: ATM-GOV-0379
title: Rebase canonical projection after semantic snapshot delivery
status: planned
owner: codex-captain-recovery
priority: P0
depends_on: [ATM-GOV-0378]
causalGraph:
  causalDependencies: [ATM-GOV-0378]
  startConditions:
    - The semantic planning-snapshot producer is committed and the preceding projection is correctly stale only because it predates that delivery.
  softRelations: [ATM-GOV-0376, ATM-GOV-0377]
  changedPublicSeams: [atm.runbookCompletionEvidence.v1]
  causalImpactEdges: [post-semantic-snapshot-delivery-projection-rebase, semantic-snapshot-convergence]
  parallelFrontierInputs: [source-delivery-head, sealed-semantic-planning-snapshot]
  validatorReferences: [compile-runbook-completion-evidence]
  phaseOwner: wave-10-independent-final-certification
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
deliverables:
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
validators:
  - node --strip-types scripts/compile-runbook-completion-evidence.ts --mode validate
testContributions:
  - caseId: test_atm_gov_0379_post_semantic_snapshot_projection_rebase
    targetGroupId: test_group_plan4_final_certification
    semanticKey: canonical_projection_observes_committed_semantic_snapshot_producer
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [post-semantic-snapshot-delivery-projection-rebase, semantic-snapshot-convergence]
    expectedRedPredicate: a canonical projection whose observed head predates the semantic-snapshot producer delivery fails freshness validation
    contributionResourceKey: runbook-projection-publication-bundle
    responsibility: task-required
    dependencyEdge: ATM-GOV-0378
    contractEdge: atm.planningSemanticSnapshot.v1
    resourceKey: runbook-projection-publication-bundle
requiredTestCaseIds: [test_atm_gov_0379_post_semantic_snapshot_projection_rebase]
tddMode: reasoned-not-applicable
tddNotApplicableReason: This task publishes an already-tested projection from the committed semantic-snapshot producer head; it adds no executable behavior.
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only the regenerated projection; never treat source delivery as a publication-only freshness exception.
atomizationImpact:
  ownerAtomOrMap: atm.runbook-completion-evidence-projection
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runbook-completion-evidence-projection
      pattern: Generated canonical projection
      source: docs/reports/plan-3x-4x-runbook-completion-evidence.json
      disposition: inline
      inlineReason: The report is a sealed generated projection, not an implementation module; extraction would create a competing publication authority.
errorCodes: []
outOfScope:
  - Changing source, test, certificate, row, Wave exit, or release verdict.
  - Treating source delivery as a publication-only delta.
nonGoals:
  - Making the four-plan verdict proven.
---

# ATM-GOV-0379 Rebase canonical projection after semantic snapshot delivery

## Problem

`ATM-GOV-0378` correctly changes the projection compiler's authority model.
The projection published before that source delivery must therefore become stale:
its observed target head predates the producer delivery.  This card performs the
one bounded, projection-only rebase from the committed producer head.  It does
not relax freshness or reinterpret source delivery as publication residue.

## Acceptance

- ACC-1 The regenerated projection observes the committed `ATM-GOV-0378`
  producer head and `compile-runbook-completion-evidence --mode validate`
  succeeds after governed publication and closeback.
- ACC-2 The projection remains `not-complete`; no requirement, Wave exit,
  certificate dimension, or release conclusion is promoted.
