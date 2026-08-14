---
task_id: ATM-GOV-0383
title: Rebase the runbook completion dashboard to current sealed HEAD
status: done
owner: unassigned
priority: P0
depends_on: [ATM-GOV-0381, ATM-GOV-0382]
causalGraph:
  causalDependencies: [ATM-GOV-0381, ATM-GOV-0382]
  startConditions:
    - The current frozen runner includes the sealed Wave 0 verifier and staged-snapshot evidence admission repair.
    - The canonical completion report reports stale authority at the current target HEAD.
  softRelations: [ATM-GOV-0332, ATM-GOV-0376, ATM-GOV-0379]
  changedPublicSeams: [atm.runbookCompletionEvidence.v1]
  causalImpactEdges: [dashboard-freshness, false-green-verdict-fidelity]
  parallelFrontierInputs: [runbook-source, planning-head, target-head, origin-main, task-card-validator-contracts]
  validatorReferences: [runbook-completion-evidence]
  phaseOwner: correction-wave-5
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
  - scripts/compile-runbook-completion-evidence.ts
  - scripts/validate-runbook-completion-evidence.ts
  - tests/cli/runbook-completion-evidence.test.ts
deliverables:
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
validators:
  - node --strip-types scripts/compile-runbook-completion-evidence.ts --mode validate
  - node --strip-types scripts/validate-runbook-completion-evidence.ts
  - node --strip-types tests/cli/runbook-completion-evidence.test.ts
testContributions:
  - caseId: test_atm_gov_0383_current_head_dashboard_rebase
    targetGroupId: test_group_plan3x4x_wave_5
    semanticKey: current_head_runbook_dashboard_rebase
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [dashboard-freshness, false-green-verdict-fidelity]
    expectedRedPredicate: a stale canonical report or a report that changes unresolved rows to proven without command-backed evidence fails validation
    contributionResourceKey: runbook-completion-evidence
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.runbookCompletionEvidence.v1
    resourceKey: runbook-completion-evidence
requiredTestCaseIds: [test_atm_gov_0383_current_head_dashboard_rebase]
tddMode: not-applicable
tddNotApplicableReason: This card regenerates a data projection with existing executable validator coverage; it introduces no new behavior.
tddExemptions: []
methodProfiles: [data-projection]
evidence:
  required: command-backed
rollback:
  strategy: regenerate-from-sealed-inputs
  notes: The report must be regenerated from the current runbook and repository facts; never edit row states by hand.
atomizationImpact:
  ownerAtomOrMap: atm.runbook-completion-evidence
  mapUpdates: []
  extractionCandidates:
    - path: docs/reports/plan-3x-4x-runbook-completion-evidence.json
      disposition: inline
      inlineReason: This is one generated, schema-validated authority projection. Splitting it into manually maintained shards would create a second completion authority and weaken atomic regeneration.
errorCodes: []
outOfScope:
  - Changing runbook requirement wording, row status, or Wave exit rules to force completion.
  - Declaring the four plans complete.
nonGoals:
  - Repairing any unresolved requirement discovered by the regenerated report.
completed_at: "2026-08-14T09:06:02.254Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T09:06:02.254Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T09-06-02-254Z-close-13da5070980a"
lastTransitionAt: "2026-08-14T09:06:02.254Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "5db860f60669d9183979a202268eaa3a6156ffb9"
---

# ATM-GOV-0383 Rebase the runbook completion dashboard to current sealed HEAD

## Problem

The canonical `atm.runbookCompletionEvidence.v1` artifact was valid for an
earlier sealed target HEAD, but Wave 0 repair deliveries changed the target
without a corresponding dashboard rebase. The compiler correctly rejects the
artifact as stale. A stale dashboard is neither evidence of success nor a
reason to reinterpret a requirement.

## Acceptance

- ACC-1 Run the compiler in `--mode write` once against the current sealed
  planning and target heads; the emitted report has exactly 112 rows and 11
  Wave exits and records their current authority digests.
- ACC-2 Both validator commands accept the committed report. If any requirement
  lacks fresh command-backed evidence, it remains unresolved and the overall
  verdict remains `not-complete`.
- ACC-3 The focused regression proves the report remains a derived projection:
  stale authority or a caller-authored green row is rejected.
