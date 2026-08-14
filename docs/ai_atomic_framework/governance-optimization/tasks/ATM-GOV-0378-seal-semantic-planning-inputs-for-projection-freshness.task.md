---
task_id: ATM-GOV-0378
title: Seal semantic planning inputs for projection freshness
status: done
owner: codex-captain-recovery
priority: P0
depends_on: [ATM-GOV-0377]
causalGraph:
  causalDependencies: [ATM-GOV-0377]
  startConditions:
    - Planning closeback changes only lifecycle fields or durable task events after a projection publication.
  softRelations: [ATM-GOV-0376]
  changedPublicSeams: [atm.runbookCompletionEvidence.v1, atm.planningSemanticSnapshot.v1]
  causalImpactEdges: [planning-closeback-snapshot-parity, semantic-contract-freshness]
  parallelFrontierInputs: [runbook-source, task-card-semantic-contracts, planning-closeback-receipts]
  validatorReferences: [compile-runbook-completion-evidence, runbook-completion-evidence]
  phaseOwner: wave-10-independent-final-certification
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
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
testContributions:
  - caseId: test_atm_gov_0378_semantic_planning_snapshot_ignores_lifecycle_closeback
    targetGroupId: test_group_plan4_final_certification
    semanticKey: planning_lifecycle_only_closeback_does_not_stale_projection
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [planning-closeback-snapshot-parity, semantic-contract-freshness]
    expectedRedPredicate: a planning task card lifecycle-only status update invalidates an otherwise sealed projection
    contributionResourceKey: runbook-planning-semantic-snapshot
    responsibility: task-required
    dependencyEdge: ATM-GOV-0377
    contractEdge: atm.planningSemanticSnapshot.v1
    resourceKey: runbook-planning-semantic-snapshot
requiredTestCaseIds: [test_atm_gov_0378_semantic_planning_snapshot_ignores_lifecycle_closeback]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert semantic snapshot contract and projection together; never treat a semantic task-card change as lifecycle-only.
atomizationImpact:
  ownerAtomOrMap: atm.runbook-completion-evidence-projection
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runbook-planning-semantic-snapshot
      pattern: Planning authority semantic snapshot
      source: scripts/compile-runbook-completion-evidence.ts
      disposition: inline
      inlineReason: The compact snapshot is a private projection compiler seam; a separate module is unnecessary until another consumer needs it.
errorCodes: []
outOfScope:
  - Ignoring changes to runbook requirements, validators, acceptance, dependencies, scope, deliverables, or task-card contract fields.
  - Changing the four-plan verdict.
nonGoals:
  - Treating arbitrary planning HEAD changes as safe without semantic comparison.
completed_at: "2026-08-14T07:44:00.114Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T07:44:00.114Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T07-44-00-114Z-close-25763b5550e1"
lastTransitionAt: "2026-08-14T07:44:00.114Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "59e162d23a50d4b1997be170fd9a983a804961d1"
---

# ATM-GOV-0378 Seal semantic planning inputs for projection freshness

## Problem

Planning closeback changes task lifecycle status and appends durable receipts.
Those are not changes to the runbook requirements or validator contracts, but
the compiler currently serializes the full planning HEAD and full task-card
byte digest. A normal closeback therefore makes an otherwise valid projection
stale indefinitely.

## Acceptance

- ACC-1 The projection seals a canonical semantic planning snapshot containing
  the runbook source and each discovered task-card contract. Lifecycle-only
  status/closeback changes do not stale it; any requirement, validator,
  acceptance, dependency, scope, deliverable, or contract change does.
- ACC-2 A focused positive/negative test proves both cases and the regenerated
  output remains `not-complete` until real runbook evidence is complete.
