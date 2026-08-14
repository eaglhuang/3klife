---
task_id: ATM-GOV-0381
title: Verify sealed Wave 0 freeze artifact
status: planned
owner: codex-captain-recovery
priority: P0
depends_on: [ATM-GOV-0380]
causalGraph:
  causalDependencies: [ATM-GOV-0380]
  startConditions:
    - A current-head Wave 0 freeze artifact exists and is governedly committed.
  softRelations: [ATM-GOV-0325]
  changedPublicSeams: [atm.falseGreenEvidenceFreeze.v1]
  causalImpactEdges: [sealed-freeze-artifact-verification, wave-0-evidence-consumption]
  parallelFrontierInputs: [false-green-evidence-freeze]
  validatorReferences: [validate-false-green-evidence-freeze]
  phaseOwner: correction-wave-0
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-false-green-evidence-freeze.ts
  - tests/cli/validate-false-green-evidence-freeze.test.ts
deliverables:
  - scripts/validate-false-green-evidence-freeze.ts
  - tests/cli/validate-false-green-evidence-freeze.test.ts
validators:
  - node --strip-types tests/cli/validate-false-green-evidence-freeze.test.ts
  - node --strip-types scripts/validate-false-green-evidence-freeze.ts --mode validate
testContributions:
  - caseId: test_atm_gov_0381_sealed_freeze_artifact_verifier
    targetGroupId: test_group_plan3x4x_wave_0
    semanticKey: sealed_false_green_freeze_artifact
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [sealed-freeze-artifact-verification, wave-0-evidence-consumption]
    expectedRedPredicate: malformed receipts, missing required observations, digest mismatch, or a non-remain-open verdict fail validation
    contributionResourceKey: false-green-evidence-freeze
    responsibility: task-required
    dependencyEdge: ATM-GOV-0380
    contractEdge: atm.falseGreenEvidenceFreeze.v1
    resourceKey: false-green-evidence-freeze
requiredTestCaseIds: [test_atm_gov_0381_sealed_freeze_artifact_verifier]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only the verifier; retain the raw freeze artifact and its negative facts.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-integrity
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - Re-running the heavy freeze collector.
  - Reclassifying remain-open, unavailable, timeout, or non-zero observations as pass.
nonGoals:
  - Declaring Wave 0 or the four plans complete.
---

# ATM-GOV-0381 Verify sealed Wave 0 freeze artifact

## Problem

The raw Wave 0 collector is intentionally expensive because it records a full
baseline window. Completion evidence must consume that sealed observation
without rerunning it. A small verifier provides the deep public seam: one fast
command validates artifact shape, required observation coverage, receipt
digests, and fail-closed `remain-open` semantics.

## Acceptance

- ACC-1 Malformed, missing, digest-inconsistent, or semantically promoted
  artifacts fail with actionable diagnostics.
- ACC-2 The committed Wave 0 artifact validates quickly and yields independent,
  command-backed evidence for the Wave 0 completion mapping without rerunning
  the collector.
