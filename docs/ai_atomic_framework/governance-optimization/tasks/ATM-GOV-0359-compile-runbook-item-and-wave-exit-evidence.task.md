---
task_id: ATM-GOV-0359
title: Compile complete runbook item and wave-exit evidence
status: done
owner: codex-gpt-5.4-mini
priority: P0
depends_on: [ATM-GOV-0358]
causalGraph:
  causalDependencies: [ATM-GOV-0358]
  startConditions:
    - The canonical objective certificate is proven, but the runbook checklist has no item-level command-backed coverage authority.
  changedPublicSeams: [atm.runbookCompletionEvidence.v1, atm.waveExitVerdict.v1]
  causalImpactEdges: [runbook-items-to-final-certificate, wave-exits-to-final-certificate]
  parallelFrontierInputs: [runbook-source, target-receipts, current-remote-provenance]
  validatorReferences: [validate-runbook-completion-evidence]
  phaseOwner: wave-10-independent-final-certification
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/compile-runbook-completion-evidence.ts
  - scripts/validate-runbook-completion-evidence.ts
  - tests/cli/runbook-completion-evidence.test.ts
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
deliverables:
  - scripts/compile-runbook-completion-evidence.ts
  - scripts/validate-runbook-completion-evidence.ts
  - tests/cli/runbook-completion-evidence.test.ts
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
validators:
  - node --strip-types tests/cli/runbook-completion-evidence.test.ts
  - node --strip-types scripts/validate-runbook-completion-evidence.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0359_runbook_items_are_command_bound
    targetGroupId: test_group_plan4_final_certification
    semanticKey: every_runbook_checkbox_and_wave_exit_is_fail_closed_and_evidence_bound
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [runbook-items-to-final-certificate, wave-exits-to-final-certificate]
    expectedRedPredicate: a certificate can be proven while one or more runbook checklist items have no command-backed evidence
    contributionResourceKey: four-plan-runbook-completion
    responsibility: task-required
    dependencyEdge: ATM-GOV-0358
    contractEdge: atm.runbookCompletionEvidence.v1
    resourceKey: four-plan-runbook-completion
requiredTestCaseIds: [test_atm_gov_0359_runbook_items_are_command_bound]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the compiler and keep the formal verdict NOT COMPLETE if any item-level evidence cannot be reconstructed.
atomizationImpact:
  ownerAtomOrMap: atm.independent-certification
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - Marking an item complete from prose, task status, or unchecked Markdown alone
  - Deleting rescue worktrees
nonGoals:
  - Treating authorized deferred work as silently complete
completed_at: "2026-08-14T04:28:25.560Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T04:28:25.560Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T04-28-25-560Z-close-7ec1bdaa4384"
lastTransitionAt: "2026-08-14T04:28:25.560Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f5a95e3c98088c91a0d3070e0ac8bfe63a400a69"
---

# ATM-GOV-0359 Compile complete runbook item and wave-exit evidence

## Problem

The objective certificate proves 86 objective rows, but the authoritative
runbook contains 112 unchecked work items and independent Wave exit conditions.
No current compiler maps those requirements to command-backed evidence, so a
`proven` certificate can still be a false green.

## Acceptance

- ACC-1 Parse the authoritative planning-repository runbook and emit exactly one stable row for every checkbox, including source line, Wave/section, requirement digest, status, evidence tuples, and diagnostics.
- ACC-2 Emit an independent verdict for every Wave exit condition. Missing, stale, contradictory, unavailable, deferred, unknown, or non-command-backed evidence must remain non-proven and keep the overall verdict `not-complete`.
- ACC-3 The validator recomputes source coverage and evidence digests independently; it rejects count drift, duplicate/omitted rows, caller-authored green labels, pending digests, stale remote provenance, and any overall `complete` verdict with a non-proven row.

## Implementation boundary

Build one pure parser/reducer with filesystem and Git observers at the edge.
Do not hard-code task IDs as completion rules and do not edit the 112 checkboxes
until the generated report proves every corresponding row.
