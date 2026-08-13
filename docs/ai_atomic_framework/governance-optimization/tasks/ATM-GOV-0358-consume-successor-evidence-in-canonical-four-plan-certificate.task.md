---
task_id: ATM-GOV-0358
title: Consume successor evidence in canonical four-plan certificate
status: done
owner: codex-gpt-5.4-mini
priority: P0
depends_on: [ATM-GOV-0341, ATM-GOV-0317]
causalGraph:
  causalDependencies: [ATM-GOV-0341, ATM-GOV-0317]
  startConditions:
    - The four plan replay reports, backlog disposition waiver register, release closeback, and independent certificate are proven and committed.
  changedPublicSeams: [atm.fourPlanCertificate.v1]
  causalImpactEdges: [successor-proof-to-canonical-certificate]
  parallelFrontierInputs: [objective-replays, backlog-census, release-closeback, independent-certificate]
  validatorReferences: [plan4-final-certification, validate-four-plan-objectives, four-plan-independent-certificate]
  phaseOwner: wave-10-independent-final-certification
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - governance-optimization/plan-3x-4x-objective-audit-2026-07-31.json
  - governance-optimization/plan-3x-4x-objective-evidence-matrix-2026-07-31.md
  - tests/cli/plan4-final-certification.test.ts
deliverables:
  - governance-optimization/plan-3x-4x-objective-audit-2026-07-31.json
  - governance-optimization/plan-3x-4x-objective-evidence-matrix-2026-07-31.md
  - tests/cli/plan4-final-certification.test.ts
validators:
  - node --strip-types tests/cli/plan4-final-certification.test.ts
  - node --strip-types scripts/validate-four-plan-objectives.ts --mode validate
  - node --strip-types tests/cli/four-plan-independent-certificate.test.ts
testContributions:
  - caseId: test_atm_gov_0358_successor_proof_consumption
    targetGroupId: test_group_plan4_final_certification
    semanticKey: canonical_certificate_consumes_proven_successor_evidence
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [successor-proof-to-canonical-certificate]
    expectedRedPredicate: successor reports are proven but the canonical certificate remains not-certified or accepts stale and missing evidence
    contributionResourceKey: four-plan-certificate
    responsibility: task-required
    dependencyEdge: ATM-GOV-0341
    contractEdge: atm.fourPlanCertificate.v1
    resourceKey: four-plan-certificate
requiredTestCaseIds: [test_atm_gov_0358_successor_proof_consumption]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert to fail-closed not-certified and retain legacy authority if any successor proof is stale, absent, contradictory, or no longer remote-reachable.
atomizationImpact:
  ownerAtomOrMap: atm.independent-certification
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - Regenerating the frozen runner
  - Re-running broad full-suite validation already proven by ATM-GOV-0341
nonGoals:
  - Converting open backlog items into silent passes
  - Hard-coding a current commit SHA as the only acceptable release provenance
---

# ATM-GOV-0358 Consume successor evidence in canonical four-plan certificate

## Problem

ATM-GOV-0317 correctly replaced an unconditional false-green certificate with a
fail-closed contract, but it closed while still describing all successor evidence
as missing. ATM-GOV-0333 through ATM-GOV-0341 subsequently produced and validated
the four objective replays, authorized backlog disposition, release provenance,
and independent certificate. The canonical certificate never consumed them, so
its `done` state contradicts its own acceptance contract.

## Acceptance

- ACC-1 Every plan row is derived from its current replay report and is `proven`
  only when the exact denominator is verified with no unresolved or unknown row.
- ACC-2 Backlog, release, and independent-review controls reference their
  machine-readable reports and fail closed on missing, contradictory, stale, or
  unreachable evidence; authorized deferred backlog is not confused with silence.
- ACC-3 The canonical certificate becomes `proven`, retires legacy authority
  reversibly, and its focused test independently recomputes that decision from
  the referenced reports instead of trusting caller-authored status labels.

## Implementation boundary

This is a certificate-integration correction. Reuse the existing report schemas
and validators; do not add a task-ID exception, duplicate certificate compiler,
or broad validation loop.

## Closeback

- Target delivery commit: `e0d5e0e76d55550cde76d4cecee5b3d5f3ca6a71`
- Target governance closeback commit: `4a2a2a401758198d6319b552519cb0d0e1d7a99f`
- Live ledger: `done`; claim: `released`
- Verified objective denominators: Plan 3.0 `17/17`, Plan 3.1 `23/23`, Plan 3.2 `29/29`, Plan 4.0 `17/17`
- Required focused validators and repository gates are recorded green in `.atm/history/evidence/ATM-GOV-0358.json`.
