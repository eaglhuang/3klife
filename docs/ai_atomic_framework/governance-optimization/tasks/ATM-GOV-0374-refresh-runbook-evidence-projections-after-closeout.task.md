---
task_id: ATM-GOV-0374
title: Refresh runbook evidence projections after canonical closeout changes
status: done
owner: codex-captain-recovery
priority: P0
depends_on: [ATM-GOV-0359, ATM-GOV-0360, ATM-GOV-0362]
causalGraph:
  causalDependencies: [ATM-GOV-0359, ATM-GOV-0360, ATM-GOV-0362]
  startConditions:
    - A canonical closeout changes evidence or task state after the prior runbook and release projections were written.
  changedPublicSeams: [atm.runbookCompletionEvidence.v1, atm.runbookReleaseAuthorityReview.v1]
  causalImpactEdges: [canonical-closeout-to-runbook-projection, canonical-closeout-to-remote-release-review]
  parallelFrontierInputs: [runbook-source, current-target-head, origin-main, closed-task-evidence]
  validatorReferences: [compile-runbook-completion-evidence, validate-runbook-completion-evidence, review-runbook-release-authority]
  phaseOwner: wave-10-independent-final-certification
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
  - docs/reports/reviews/plan-3x-4x-runbook-release-review.json
deliverables:
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
  - docs/reports/reviews/plan-3x-4x-runbook-release-review.json
validators:
  - node --strip-types scripts/compile-runbook-completion-evidence.ts --mode validate
  - node --strip-types scripts/validate-runbook-completion-evidence.ts
  - node --strip-types scripts/review-runbook-release-authority.ts --json
  - node --strip-types tests/cli/runbook-completion-evidence.test.ts
  - node --strip-types tests/cli/runbook-release-authority-review.test.ts
testContributions:
  - caseId: test_atm_gov_0374_projections_observe_current_closeout_state
    targetGroupId: test_group_plan4_final_certification
    semanticKey: projection_refresh_preserves_fail_closed_not_complete_verdict
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [canonical-closeout-to-runbook-projection, canonical-closeout-to-remote-release-review]
    expectedRedPredicate: a closeout changes canonical evidence while an old projection remains accepted as current
    contributionResourceKey: four-plan-runbook-projection-refresh
    responsibility: task-required
    dependencyEdge: ATM-GOV-0360
    contractEdge: atm.runbookCompletionEvidence.v1
    resourceKey: four-plan-runbook-projection-refresh
requiredTestCaseIds: [test_atm_gov_0374_projections_observe_current_closeout_state]
tddMode: reasoned-not-applicable
tddNotApplicableReason: This card regenerates existing observer outputs only; it does not change verifier behavior, and both existing verifier tests are required acceptance evidence.
tddExemptions:
  - kind: docs
    reason: Generated evidence projection refresh with existing executable assertions.
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only the two generated projections; never alter source verifiers or downgrade a non-proven row to complete.
atomizationImpact:
  ownerAtomOrMap: atm.independent-certification
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runbook-completion-evidence-projection
      pattern: Generated projection artifact
      source: docs/reports/plan-3x-4x-runbook-completion-evidence.json
      disposition: inline
      inlineReason: Generated observer output, not an implementation module; extraction would create a second authority instead of reducing interface complexity.
errorCodes: []
outOfScope:
  - Changing compiler, validator, or reviewer semantics.
  - Editing the 112 runbook checklist rows.
  - Treating a not-complete result as a task failure or overriding it to green.
nonGoals:
  - Creating reviewer receipts or release authorization.
completed_at: "2026-08-14T07:06:17.271Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T07:06:17.271Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T07-06-17-271Z-close-e042a0fbe382"
lastTransitionAt: "2026-08-14T07:06:17.271Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d42f09a2b99791b89c5bd5b4e13aa0cff7f440bc"
---

# ATM-GOV-0374 Refresh runbook evidence projections after canonical closeout changes

## Problem

ATM-GOV-0360 legitimately changed canonical closeout evidence after the prior
runbook-completion and release-authority projections had been written. A stale
projection is neither a valid proof of completion nor a reason to reopen the
historical implementation cards that built the observers.

## Acceptance

- ACC-1 Regenerate both named projections from the current target HEAD and
  `origin/main`; each records the observed inputs and remains fail-closed.
- ACC-2 Re-run both existing verifier tests and commands. The card may close
  only if the generated projections validate; `not-complete` is the expected
  result until every underlying runbook row, Wave exit, independent reviewer,
  and remote release condition is genuinely proven.

## Implementation boundary

This card owns projection freshness only. It must not change the parser,
validator, release reviewer, task status, source runbook, or certificate logic.
