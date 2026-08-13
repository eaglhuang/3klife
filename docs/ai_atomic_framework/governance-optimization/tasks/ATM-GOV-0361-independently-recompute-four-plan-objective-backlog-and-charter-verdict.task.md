---
task_id: ATM-GOV-0361
title: Independently recompute four-plan objective backlog and charter verdict
status: done
owner: unassigned
priority: P0
depends_on: [ATM-GOV-0360]
causalGraph:
  causalDependencies: [ATM-GOV-0360]
  startConditions:
    - ATM-GOV-0360 has landed the fail-closed certificate contract and compiler.
  softRelations: [ATM-GOV-0332, ATM-GOV-0340, ATM-GOV-0341]
  changedPublicSeams: [atm.fourPlanIndependentReview.v1]
  causalImpactEdges: [raw-objective-evidence-to-independent-review, backlog-census-to-independent-review, charter-verdict-to-independent-review]
  parallelFrontierInputs: [four-objective-replays, backlog-census, waiver-register, charter-verdict]
  validatorReferences: [four-plan-objective-authority-review]
  phaseOwner: wave-10-independent-review-a
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/review-four-plan-objective-authority.ts
  - docs/reports/reviews/plan-3x-4x-objective-authority-review.json
  - tests/cli/four-plan-objective-authority-review.test.ts
deliverables:
  - scripts/review-four-plan-objective-authority.ts
  - docs/reports/reviews/plan-3x-4x-objective-authority-review.json
  - tests/cli/four-plan-objective-authority-review.test.ts
validators:
  - node --strip-types tests/cli/four-plan-objective-authority-review.test.ts
  - node --strip-types scripts/review-four-plan-objective-authority.ts --mode validate
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0361_independent_objective_authority_recompute
    targetGroupId: test_group_plan4_final_certification
    semanticKey: reviewer_a_recomputes_objectives_backlog_and_charter_without_reading_certificate_or_reviewer_b
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [raw-objective-evidence-to-independent-review, backlog-census-to-independent-review, charter-verdict-to-independent-review]
    contributionResourceKey: four-plan-independent-review-a
    responsibility: task-required
    dependencyEdge: ATM-GOV-0360
    contractEdge: atm.fourPlanIndependentReview.v1
    resourceKey: four-plan-independent-review-a
    expectedRedPredicate: missing objective rows or open backlog items can still produce a proven review
requiredTestCaseIds: [test_atm_gov_0361_independent_objective_authority_recompute]
tddMode: required
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert reviewer A as one unit; never retain a report produced by a removed algorithm.
atomizationImpact:
  ownerAtomOrMap: atm.independent-certification
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-13T17:36:18.751Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-13T17:36:18.751Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-13T17-36-18-751Z-close-352c32a0a040"
lastTransitionAt: "2026-08-13T17:36:18.751Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0748dff1d2ad79cd8a780ff99f9e7ffa5b7eef2e"
---

# ATM-GOV-0361 Independently recompute four-plan objective backlog and charter verdict

## Intent

Produce reviewer A from raw objective, backlog and charter authorities. The
reviewer must not read the independent certificate, release-closeback report,
Runbook completion report, or reviewer B output. This preserves algorithm and
input independence rather than merely assigning a different reviewer label.

## Acceptance

- ACC-1 Recompute 17/17, 23/23, 29/29 and 17/17 directly from the four replay files, including row identity, evidence tuple completeness and input digests.
- ACC-2 Recompute backlog `open-like=0`, `unclassified=0`, waiver/deferred state, and current charter verdict from their canonical raw artifacts. Any missing, dirty, malformed, stale or contradictory input produces `not-proven`.
- ACC-3 Emit a byte-stable review with reviewer identity, distinct output path, sorted input paths/digests, observed target SHA, findings, verdict and self-digest. Do not read or write the certificate or reviewer B output.

## Stop rules

- No caller-authored `proven` flag.
- No copy of a digest from the certificate.
- No fallback to task `done`, dashboard labels or prose.
- If any input cannot be independently recomputed, report it and stop with `not-proven`.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T13:21:45.901Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0361-independently-recompute-four-plan-objective-backlog-and-charter-verdict.task.md","contentDigest":"sha256:85f2cad31eedb345b1dc9144863b0290e1319491549496ef170a0eb9caa3d9ff"} -->
