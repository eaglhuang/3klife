---
task_id: ATM-GOV-0384
title: Bind runbook evidence successors through a provenance graph
status: planned
owner: atm-evidence
priority: P0
depends_on: [ATM-GOV-0381]
causalGraph:
  causalDependencies: [ATM-GOV-0381]
  startConditions: [The completion matrix reports successor receipts separately from their original runbook cards.]
  softRelations: [ATM-GOV-0325, ATM-GOV-0341]
  changedPublicSeams: [atm.runbookEvidenceGraph.v1]
  causalImpactEdges: [successor-replay-attribution, independent-wave-exit-attribution, owner-scoped-receipt-cache]
  parallelFrontierInputs: [planning-task-cards, target-evidence-receipts, runbook-completion-report]
  validatorReferences: [runbook-completion-evidence]
  phaseOwner: correction-wave-0
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/compile-runbook-completion-evidence.ts
  - tests/cli/runbook-completion-evidence.test.ts
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
deliverables:
  - scripts/compile-runbook-completion-evidence.ts
  - tests/cli/runbook-completion-evidence.test.ts
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
validators:
  - node --strip-types tests/cli/runbook-completion-evidence.test.ts
  - node --strip-types scripts/compile-runbook-completion-evidence.ts --mode validate
  - node --strip-types scripts/validate-runbook-completion-evidence.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0384_successor_provenance_graph
    targetGroupId: test_group_plan3x4x_wave_0
    semanticKey: runbook_successor_provenance_graph
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [successor-replay-attribution, independent-wave-exit-attribution, owner-scoped-receipt-cache]
    expectedRedPredicate: unrelated same-wave, ambiguous replay, reused basis, or cross-owner receipt cannot prove a row or exit
    contributionResourceKey: runbook-completion-evidence
    responsibility: task-required
    dependencyEdge: ATM-GOV-0381
    contractEdge: atm.runbookEvidenceGraph.v1
    resourceKey: runbook-completion-evidence
requiredTestCaseIds: [test_atm_gov_0384_successor_provenance_graph]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert graph consumer and report together; never infer missing provenance as pass.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-integrity
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope: [Backfilling a missing command sourceCommit, declaring any plan complete without receipts]
nonGoals: [Treating task status as command-backed evidence]
---

# ATM-GOV-0384 Bind runbook evidence successors through a provenance graph

## Problem

The completion compiler consumed only registered source cards. It could not
distinguish a current artifact replay from an unrelated same-Wave card, and its
Wave-exit calculation removed the very receipts it subsequently required. A
cache key also omitted evidence owner identity.

## Acceptance

- [ ] ACC-1 A replacement receipt is accepted only for one unambiguous card in
  the same runbook/Wave that shares a public seam and declared delivery artifact
  with the primary card.
- [ ] ACC-2 A Wave exit accepts only a downstream same-seam observer and never
  reuses a requirement-basis receipt.
- [ ] ACC-3 Receipt lookup is owner-scoped; a same-text command from another
  card cannot satisfy the requested card.
