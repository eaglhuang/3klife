---
task_id: ATM-GOV-0387
title: Observe the current Wave 0 freeze artifact independently
status: done
owner: atm-evidence
priority: P0
depends_on: []
causalGraph:
  startConditions: [A current-head Wave 0 freeze artifact with source-provenance receipts exists.]
  softRelations: [ATM-GOV-0380, ATM-GOV-0381, ATM-GOV-0386]
  changedPublicSeams: [atm.falseGreenEvidenceFreeze.v1]
  causalImpactEdges: [independent-wave-0-exit-observation]
  parallelFrontierInputs: [false-green-evidence-freeze]
  validatorReferences: [validate-false-green-evidence-freeze]
  phaseOwner: correction-wave-0
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.json
deliverables:
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.json
validators:
  - node --strip-types scripts/validate-false-green-evidence-freeze.ts --file docs/reports/plan-3x-4x-false-green-evidence-freeze.json
testContributions:
  - caseId: test_atm_gov_0387_wave_0_independent_observer
    targetGroupId: test_group_plan3x4x_wave_0
    semanticKey: wave_0_current_freeze_independent_observer
    coversAcceptance: [ACC-1]
    coversImpactEdges: [independent-wave-0-exit-observation]
    expectedRedPredicate: malformed, stale, missing-provenance, or falsely-complete freeze artifact fails independently
    contributionResourceKey: false-green-evidence-freeze
    responsibility: task-required
    dependencyEdge: ATM-GOV-0386
    contractEdge: atm.falseGreenEvidenceFreeze.v1
    resourceKey: false-green-evidence-freeze
requiredTestCaseIds: [test_atm_gov_0387_wave_0_independent_observer]
tddMode: reasoned-not-applicable
tddNotApplicableReason: This is a read-only independent observation of an existing sealed artifact.
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: discard-observation-receipt
  notes: Never alter the freeze artifact to obtain an observer pass.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-integrity
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope: [Replaying the heavy collector, declaring any plan complete, converting negative observations into pass]
nonGoals: [Replacing the primary Wave 0 evidence receipt]
completed_at: "2026-08-14T12:15:03.362Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T12:15:03.362Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T12-15-03-362Z-close-a5a37bfd0d2c"
lastTransitionAt: "2026-08-14T12:15:03.362Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1ca19e2db03a7cb7f555dfe3418d894eba2bc703"
---

# ATM-GOV-0387 Observe the current Wave 0 freeze artifact independently

## Problem

The current Wave 0 replay (ATM-GOV-0386) can prove its own receipt provenance,
but a Wave exit requires an independent consumer of that artifact. Historical
ATM-GOV-0381 observes an older replay and cannot certify a newer artifact.

## Acceptance

- [ ] ACC-1: A frozen-runner command receipt from this task independently
  validates the current sealed freeze artifact and is bound to its executed
  source commit.
