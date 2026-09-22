---
task_id: TASK-PRF-0122
title: Make CI failure dispositions replayable across scope-policy changes
status: done
owner: release-evidence
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - "The current 734-attempt Product CI export contains eligible failures or retries whose historical dispositions are rejected after scope filtering."
    - "The unchanged external export and current workflow-scope policy are available for replay."
  softRelations: [TASK-PRF-0116, TASK-PRF-0121]
  changedPublicSeams: [product_ci_failure_lifecycle_evidence]
  causalImpactEdges: [sustained-green-ci-claim, ci_repair_cost_measurement]
  parallelFrontierInputs: [external-ci-attempt-receipt, product-ci-workflow-scope-policy]
  validatorReferences: [ci-burn-in-evidence-collector, product-ci-burn-in]
  phaseOwner: release-evidence
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/collect-ci-burn-in-evidence.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
deliverables:
  - scripts/collect-ci-burn-in-evidence.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
validators:
  - node --strip-types tests/cli/ci-burn-in-evidence-collector.test.ts
  - node --strip-types tests/cli/product-ci-burn-in.test.ts
  - node --strip-types scripts/collect-ci-burn-in-evidence.ts --input <external-ci-attempts.json> --scope-config scripts/product-ci-burn-in-workflow-scope.json --output <external-receipt.json>
  - node --strip-types scripts/measure-product-ci-burn-in.ts --input <external-receipt.json> --report-only
testContributions:
  - caseId: test_prf0122_excluded_disposition_replay_4c31e2a1
    targetGroupId: null
    semanticKey: excluded_failure_disposition_replay
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [sustained-green-ci-claim, ci_repair_cost_measurement]
    expectedRedPredicate: a disposition for a scope-excluded run aborts collection instead of remaining visible as excluded provenance
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: product-ci-workflow-scope-policy
    contractEdge: product_ci_failure_lifecycle_evidence
    resourceKey: failure-disposition
requiredTestCaseIds:
  - test_prf0122_excluded_disposition_replay_4c31e2a1
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only the collector behavior and focused regression case; retain raw exports and prior receipts.
atomizationImpact:
  ownerAtomOrMap: atm.external-proof-map
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-22T13:05:22.352Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-22T13:05:22.352Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-22T13-05-22-352Z-close-3627a37ffdfe"
lastTransitionAt: "2026-09-22T13:05:22.352Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "85d8a6248db8e1cfd29e07dc621b44065d0cc42d"
---

# TASK-PRF-0122 Make CI failure dispositions replayable across scope-policy changes

## Intent

The current collector correctly excludes runs that lack required Product CI
step coverage, but `applyFailureDispositions` still assumes every historical
disposition targets an eligible run. When a disposition points to a run that is
now excluded by the current workflow-scope policy, the collector aborts with
`failureDisposition-<runId>-not-an-eligible-run` and prevents replay of the
current burn-in receipt. This card preserves that historical fact as excluded
provenance without changing the eligibility policy or hiding any observation.

The card is a focused evidence-contract repair. It does not change the Product
CI workflow, required-step set, 30-day/90-run thresholds, raw GitHub export,
npm release path, benchmark protocol, or any ATM command surface.

## Acceptance

- [ ] **ACC-1 — Excluded provenance:** a disposition whose failed run is
      scope-excluded is retained with its run id, failure class, root cause and
      exclusion reason, but does not mutate the eligible lifecycle or invalidate
      the receipt.
- [ ] **ACC-2 — Eligible fail-closed behavior:** an eligible failed run still
      requires a specific failure class, root cause and a later eligible
      successful repair; missing, non-later or ineligible repairs remain
      rejected.
- [ ] **ACC-3 — Honest burn-in verdict:** replaying the current external export
      produces a structurally evaluable receipt with excluded counts/reasons,
      first-attempt and retry provenance, and an incomplete/unexplained verdict
      whenever the 30-day/90-run thresholds or lifecycle evidence are not met.
- [ ] **ACC-4 — No product-scope expansion:** no workflow, threshold, raw
      export, npm release, benchmark, or new ATM command changes; the focused
      collector regression and existing product-ci evaluator tests pass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T12:19:26.221Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0122-make-ci-failure-dispositions-replayable-across-scope-policy-changes.task.md","contentDigest":"sha256:cc5631bbe4008e007a10ecf4bbe46a72852b84ed9ace245199d6dab564760969"} -->
