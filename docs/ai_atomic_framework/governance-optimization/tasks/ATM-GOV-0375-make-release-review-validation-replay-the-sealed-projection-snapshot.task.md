---
task_id: ATM-GOV-0375
title: Make release-review validation replay the sealed projection snapshot
status: planned
owner: codex-captain-recovery
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - Release-review validation is stale solely because it regenerates a new timestamp instead of replaying its sealed projection snapshot.
  softRelations: [ATM-GOV-0374]
  changedPublicSeams: [atm.fourPlanIndependentReleaseReview.v1]
  causalImpactEdges: [release-review-determinism, independent-release-verdict-freshness]
  parallelFrontierInputs: [completion-projection, runbook-source, observed-remote-head]
  validatorReferences: [runbook-release-authority-review]
  phaseOwner: wave-10-independent-final-certification
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/review-runbook-release-authority.ts
  - tests/cli/runbook-release-authority-review.test.ts
  - docs/reports/reviews/plan-3x-4x-runbook-release-review.json
deliverables:
  - scripts/review-runbook-release-authority.ts
  - tests/cli/runbook-release-authority-review.test.ts
  - docs/reports/reviews/plan-3x-4x-runbook-release-review.json
validators:
  - node --strip-types tests/cli/runbook-release-authority-review.test.ts
  - node --strip-types scripts/review-runbook-release-authority.ts --mode validate
testContributions:
  - caseId: test_atm_gov_0375_release_review_validate_replays_sealed_timestamp
    targetGroupId: test_group_plan4_final_certification
    semanticKey: release_review_validate_is_time_invariant_for_a_sealed_snapshot
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [release-review-determinism, independent-release-verdict-freshness]
    expectedRedPredicate: a projection written at one timestamp fails validation later despite unchanged declared inputs
    contributionResourceKey: four-plan-release-review-determinism
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.fourPlanIndependentReleaseReview.v1
    resourceKey: four-plan-release-review-determinism
requiredTestCaseIds: [test_atm_gov_0375_release_review_validate_replays_sealed_timestamp]
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the timestamp replay change and report regeneration together; do not relax stale detection for changed inputs.
atomizationImpact:
  ownerAtomOrMap: atm.independent-certification
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - Accepting a changed completion report, runbook, target HEAD, or remote observation without regeneration.
  - Altering runbook row completion semantics.
nonGoals:
  - Making the release verdict proven.
---

# ATM-GOV-0375 Make release-review validation replay the sealed projection snapshot

## Problem

The release reviewer emits `generatedAt` from wall-clock time in both write and
validate modes. Validation therefore compares a new projection to an old file
and deterministically reports it stale even when all declared inputs match.

## Acceptance

- ACC-1 Write mode stamps a projection once; validate mode replays the
  committed projection timestamp only when every declared authority input is
  identical. Any changed input remains stale and requires write mode.
- ACC-2 A focused regression proves delayed validation succeeds after write,
  while an altered input is rejected as stale.

## Implementation boundary

Use the existing release-review projection as the immutable snapshot authority.
Do not exclude changed inputs and do not special-case any task ID or reviewer.
