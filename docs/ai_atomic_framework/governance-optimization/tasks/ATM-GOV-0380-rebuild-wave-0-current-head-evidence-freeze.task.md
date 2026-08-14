---
task_id: ATM-GOV-0380
title: Rebuild Wave 0 current-head evidence freeze
status: done
owner: codex-captain-recovery
priority: P0
depends_on: [ATM-GOV-0379]
causalGraph:
  causalDependencies: [ATM-GOV-0379]
  startConditions:
    - Canonical projection freshness validates after its semantic planning closeback.
  softRelations: [ATM-GOV-0325]
  changedPublicSeams: [atm.falseGreenEvidenceFreeze.v1]
  causalImpactEdges: [wave-0-current-head-baseline, raw-command-receipt-replay]
  parallelFrontierInputs: [target-head, origin-main-head, planning-head, worktree-registry]
  validatorReferences: [diagnose-plan3-evidence-closure, validate-git-head-evidence, validate-charter]
  phaseOwner: correction-wave-0
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.json
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.md
deliverables:
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.json
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.md
validators:
  - node --strip-types scripts/validate-git-head-evidence.ts --mode validate
  - node --strip-types scripts/validate-charter.ts --mode validate
testContributions:
  - caseId: test_atm_gov_0380_wave_0_current_head_freeze
    targetGroupId: test_group_plan3x4x_wave_0
    semanticKey: current_head_false_green_evidence_freeze
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [wave-0-current-head-baseline, raw-command-receipt-replay]
    expectedRedPredicate: unavailable inputs, timeout, non-zero command receipts, or incomplete rescue evidence remain explicit negative facts
    contributionResourceKey: false-green-evidence-freeze
    responsibility: task-required
    dependencyEdge: ATM-GOV-0379
    contractEdge: atm.falseGreenEvidenceFreeze.v1
    resourceKey: false-green-evidence-freeze
requiredTestCaseIds: [test_atm_gov_0380_wave_0_current_head_freeze]
tddMode: reasoned-not-applicable
tddNotApplicableReason: The task regenerates a sealed observation artifact from existing validators; it introduces no behavior change.
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only the refreshed freeze artifact; never rewrite negative observations as pass.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-integrity
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - Declaring any plan complete.
  - Deleting, pruning, resetting, rebasing, or modifying rescue worktrees.
nonGoals:
  - Converting unavailable historical evidence into a passing observation.
completed_at: "2026-08-14T08:17:26.148Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T08:17:26.148Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T08-17-26-148Z-close-45c26c6e54ea"
lastTransitionAt: "2026-08-14T08:17:26.148Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1ca19e2db03a7cb7f555dfe3418d894eba2bc703"
---

# ATM-GOV-0380 Rebuild Wave 0 current-head evidence freeze

## Problem

The former Wave 0 receipts predate the current authoritative target and planning
snapshots. This task replays the frozen observation collector at current HEAD,
retaining raw command outputs, exit status, timeout state, source availability,
and rescue-worktree availability. Negative or unavailable observations remain
explicit `remain-open` evidence.

## Acceptance

- ACC-1 The freeze JSON and Markdown record one current-head raw receipt window
  with planning, target, origin, runner, worktree, and rescue observations.
- ACC-2 The task evidence contains fresh command receipts for the Git-head
  evidence validator and charter validator. The collector's raw
  command receipts live in the generated freeze artifact; a successor verifier
  consumes that sealed artifact without re-running its heavy command window.
  The task does not promote the four-plan verdict.
