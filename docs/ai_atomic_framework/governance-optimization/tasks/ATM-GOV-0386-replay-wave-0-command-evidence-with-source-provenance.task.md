---
task_id: ATM-GOV-0386
title: Replay Wave 0 freeze receipts with current source provenance
status: done
owner: atm-evidence
priority: P0
causalGraph:
  causalDependencies: [ATM-GOV-0380]
  startConditions: [The original Wave 0 freeze receipts omit sourceCommit because the frozen evidence producer was incomplete.]
  softRelations: [ATM-GOV-0380, ATM-GOV-0381, ATM-GOV-0385]
  changedPublicSeams: [atm.falseGreenEvidenceFreeze.v1]
  causalImpactEdges: [wave-0-current-head-baseline, raw-command-receipt-replay]
  parallelFrontierInputs: [target-head, origin-main-head, planning-head, frozen-runner]
  validatorReferences: [diagnose-plan3-evidence-closure, validate-false-green-evidence-freeze, validate-git-head-evidence, validate-charter]
  phaseOwner: correction-wave-0
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.json
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.md
deliverables:
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.json
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.md
validators:
  - node --strip-types scripts/diagnose-plan3-evidence-closure.ts --output docs/reports/plan-3x-4x-false-green-evidence-freeze.json
  - node --strip-types scripts/validate-false-green-evidence-freeze.ts --file docs/reports/plan-3x-4x-false-green-evidence-freeze.json
  - node --strip-types scripts/validate-git-head-evidence.ts --mode validate
  - node --strip-types scripts/validate-charter.ts --mode validate
testContributions:
  - caseId: test_atm_gov_0386_wave_0_receipt_provenance_replay
    targetGroupId: test_group_plan3x4x_wave_0
    semanticKey: wave_0_current_head_receipt_provenance
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [wave-0-current-head-baseline, raw-command-receipt-replay]
    expectedRedPredicate: missing source provenance, malformed raw receipt, timeout, or non-zero validation remains explicit and cannot certify completion
    contributionResourceKey: false-green-evidence-freeze
    responsibility: task-required
    contractEdge: atm.falseGreenEvidenceFreeze.v1
    resourceKey: false-green-evidence-freeze
requiredTestCaseIds: [test_atm_gov_0386_wave_0_receipt_provenance_replay]
tddMode: reasoned-not-applicable
tddNotApplicableReason: This card replays an existing raw-observation collector and preserves all negative outcomes; it does not change behavior.
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only this current-head freeze replay; never rewrite negative observations as pass.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-integrity
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope: [Declaring a plan complete, modifying rescue worktrees, inferring evidence provenance from a missing field]
nonGoals: [Converting unavailable or negative raw observations into passing evidence]
completed_at: "2026-08-14T12:12:19.621Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T12:12:19.621Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T12-12-19-621Z-close-f2e5df7b0275"
lastTransitionAt: "2026-08-14T12:12:19.621Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1ca19e2db03a7cb7f555dfe3418d894eba2bc703"
---

# ATM-GOV-0386 Replay Wave 0 freeze receipts with current source provenance

## Problem

The original 0380 artifact is a valid negative freeze but its frozen-runner
command receipts predate `atm.commandRunProvenance.v1` and therefore omit the
current source commit. A closed historical task must not be rewritten merely to
fill a producer field.

## Acceptance

- [ ] ACC-1 The two freeze artifacts contain a new current-head raw receipt
  window, retaining non-zero, unavailable, and timeout outcomes as negative
  facts.
- [ ] ACC-2 Task evidence for the replayed Git-head and charter validators is
  command-backed, frozen-runner, fresh, and bound to the executed source commit.
