---
task_id: ATM-GOV-0377
title: Rebase canonical projection after source delivery
status: done
owner: codex-captain-recovery
priority: P0
depends_on: [ATM-GOV-0376]
causalGraph:
  causalDependencies: [ATM-GOV-0376]
  startConditions:
    - The publication-bundle producer source is committed after the prior canonical projection snapshot.
  softRelations: [ATM-GOV-0374, ATM-GOV-0375]
  changedPublicSeams: [atm.runbookCompletionEvidence.v1]
  causalImpactEdges: [post-delivery-projection-rebase, publication-snapshot-convergence]
  parallelFrontierInputs: [source-delivery-head, sealed-publication-bundle]
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
  - caseId: test_atm_gov_0377_post_delivery_projection_rebase
    targetGroupId: test_group_plan4_final_certification
    semanticKey: canonical_projection_observes_committed_producer_head
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [post-delivery-projection-rebase, publication-snapshot-convergence]
    expectedRedPredicate: a canonical projection whose observed head predates its source delivery fails freshness validation
    contributionResourceKey: runbook-projection-publication-bundle
    responsibility: task-required
    dependencyEdge: ATM-GOV-0376
    contractEdge: atm.sealedProjectionPublicationBundle.v1
    resourceKey: runbook-projection-publication-bundle
requiredTestCaseIds: [test_atm_gov_0377_post_delivery_projection_rebase]
tddMode: not-applicable
tddNotApplicableReason: This task publishes an already-tested projection from the committed producer head; it adds no executable behavior.
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only the regenerated projection; never convert a source delta into a freshness exception.
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
completed_at: "2026-08-14T07:33:36.312Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T07:33:36.312Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T07-33-36-312Z-close-06f98d3ea711"
lastTransitionAt: "2026-08-14T07:33:36.312Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "48eaddec79f106f2dcad3192edc036547004a81c"
---

# ATM-GOV-0377 Rebase canonical projection after source delivery

## Problem

The 0376 producer source commit legitimately changes source and tests, so a
projection generated before that commit must fail freshness validation. The
correct convergence step is a new projection-only publication that observes the
committed producer head. Its later closeback changes only durable receipts,
which the sealed publication bundle already admits.

## Acceptance

- ACC-1 The regenerated projection observes the committed 0376 producer head
  and `compile-runbook-completion-evidence --mode validate` succeeds after its
  governed projection-only publication and closeback.
- ACC-2 The resulting projection remains `not-complete`; no requirement,
  Wave exit, certificate dimension, or release conclusion is promoted.
