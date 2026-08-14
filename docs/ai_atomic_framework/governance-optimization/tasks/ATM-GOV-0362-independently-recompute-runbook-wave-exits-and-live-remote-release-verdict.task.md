---
task_id: ATM-GOV-0362
title: Independently recompute runbook wave exits and live remote release verdict
status: done
owner: unassigned
priority: P0
depends_on: [ATM-GOV-0360]
causalGraph:
  causalDependencies: [ATM-GOV-0360]
  startConditions:
    - ATM-GOV-0360 has landed the fail-closed certificate contract and compiler.
  softRelations: [ATM-GOV-0359]
  changedPublicSeams: [atm.fourPlanIndependentReview.v1]
  causalImpactEdges: [runbook-evidence-to-independent-review, wave-exits-to-independent-review, live-remote-to-release-review]
  parallelFrontierInputs: [runbook-source, runbook-completion-evidence, live-origin-main, target-head]
  validatorReferences: [runbook-release-authority-review]
  phaseOwner: wave-10-independent-review-b
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/review-runbook-release-authority.ts
  - docs/reports/reviews/plan-3x-4x-runbook-release-review.json
  - tests/cli/runbook-release-authority-review.test.ts
deliverables:
  - scripts/review-runbook-release-authority.ts
  - docs/reports/reviews/plan-3x-4x-runbook-release-review.json
  - tests/cli/runbook-release-authority-review.test.ts
validators:
  - node --strip-types tests/cli/runbook-release-authority-review.test.ts
  - node --strip-types scripts/review-runbook-release-authority.ts --mode validate
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0362_independent_runbook_and_remote_recompute
    targetGroupId: test_group_plan4_final_certification
    semanticKey: reviewer_b_recomputes_112_items_11_exits_and_live_remote_without_reading_certificate_or_reviewer_a
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [runbook-evidence-to-independent-review, wave-exits-to-independent-review, live-remote-to-release-review]
    contributionResourceKey: four-plan-independent-review-b
    responsibility: task-required
    dependencyEdge: ATM-GOV-0360
    contractEdge: atm.fourPlanIndependentReview.v1
    resourceKey: four-plan-independent-review-b
    expectedRedPredicate: stale remote or an unresolved Runbook item can still produce a proven review
requiredTestCaseIds: [test_atm_gov_0362_independent_runbook_and_remote_recompute]
tddMode: required
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert reviewer B as one unit; never retain a report produced by a removed algorithm.
atomizationImpact:
  ownerAtomOrMap: atm.independent-certification
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-14T03:17:24.244Z"
completed_by_agent: "codex-captain-repair"
closedAt: "2026-08-14T03:17:24.244Z"
closedByActor: "codex-captain-repair"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T03-17-24-244Z-close-290693b53703"
lastTransitionAt: "2026-08-14T03:17:24.244Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "58d6c5506b5dbab3f786fa5b8fea4bf1e3782a30"
---

# ATM-GOV-0362 Independently recompute runbook wave exits and live remote release verdict

## Intent

Produce reviewer B from the authoritative Runbook, the item-level evidence
report, Git ancestry and a freshly fetched remote. The reviewer must not read
the independent certificate, release-closeback verdict or reviewer A output.

## Acceptance

- ACC-1 Independently parse exactly 112 checkboxes and 11 Wave exits, match requirement digests and source lines against the completion report, and reject omission, duplication, unknown, deferred, unresolved or caller-authored green state.
- ACC-2 Revalidate every command tuple, durable artifact, source-commit ancestry and per-Wave basis. Shared commands may prove multiple requirements only through the registered task-card validator contract recorded by the report.
- ACC-3 Fetch the configured remote at execution time; emit local HEAD, remote ref/SHA, ancestry/reachability, ahead/behind state and push verdict. Any remote movement after observation, divergence or unpushed required commit produces `not-proven`.

## Stop rules

- No literal remote SHA in source or fixture.
- No reading the certificate or reviewer A output.
- No network failure converted to reachability success.
- Any unresolved/deferred/unknown item keeps the review `not-proven`.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T13:21:47.572Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0362-independently-recompute-runbook-wave-exits-and-live-remote-release-verdict.task.md","contentDigest":"sha256:783bad854733830389afd700a81f0681a5973b1f8e2a7d3a8f3156e8cc58a7ee"} -->
