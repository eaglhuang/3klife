---
task_id: TASK-PRF-0116
title: Reconcile current Product CI failure dispositions from raw lifecycle evidence
status: done
owner: release-evidence
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - "The external 2026-09-21 CI receipt reports three eligible unknown-failure observations."
    - "Each proposed disposition must bind raw failed job logs, a later successful Product CI run, and a concrete repair commit."
  softRelations: [TASK-PRF-0055, TASK-PRF-0115]
  changedPublicSeams: [product_ci_failure_lifecycle_evidence]
  causalImpactEdges: [sustained-green-ci-claim, ci_repair_cost_measurement]
  parallelFrontierInputs: [external-ci-attempt-receipt]
  validatorReferences: [ci-burn-in-evidence-collector, product-ci-burn-in]
  phaseOwner: release-evidence
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/product-ci-failure-dispositions.json
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - tests/cli/product-ci-burn-in.test.ts
deliverables:
  - docs/reports/product-ci-failure-dispositions.json
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - tests/cli/product-ci-burn-in.test.ts
validators:
  - node --strip-types tests/cli/ci-burn-in-evidence-collector.test.ts
  - node --strip-types tests/cli/product-ci-burn-in.test.ts
  - node --strip-types scripts/collect-ci-burn-in-evidence.ts --input <external-ci-attempts.json> --scope-config scripts/product-ci-burn-in-workflow-scope.json --output <external-receipt.json>
  - node --strip-types scripts/measure-product-ci-burn-in.ts --input <external-receipt.json> --report-only
testContributions:
  - caseId: test_prf0116_current_failure_lifecycle_65f4be02
    targetGroupId: null
    semanticKey: current_ci_failure_disposition
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [sustained-green-ci-claim, ci_repair_cost_measurement]
    expectedRedPredicate: a failed eligible Product CI run is classified as repaired without a later successful run and concrete repair provenance, or a missing disposition becomes green by omission
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: external-ci-attempt-receipt
    contractEdge: product_ci_failure_lifecycle_evidence
    resourceKey: failure-disposition
requiredTestCaseIds: [test_prf0116_current_failure_lifecycle_65f4be02]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: reasoned-not-applicable
tddNotApplicableReason: This is a bounded reconciliation of immutable external run facts; the existing collector tests provide the executable fail-closed oracle and no implementation behavior is introduced.
tddExemptions:
  - kind: docs
    reason: The only intended product change is three evidence disposition records bound to external URLs and later green runs.
methodProfiles: []
evidence:
  required: external-current-ci-lifecycle-receipt
rollback:
  strategy: revert-commit
  notes: Revert only newly added dispositions; retain external raw export and collector receipt.
atomizationImpact:
  ownerAtomOrMap: atm.external-proof-map
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-22T01:23:29.814Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-22T01:23:29.814Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-22T01-23-29-814Z-close-d704df45464e"
lastTransitionAt: "2026-09-22T01:23:29.814Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "691ded246050407a5ddf0bb673e87092748e1c54"
---

# TASK-PRF-0116 Reconcile current Product CI failure dispositions from raw lifecycle evidence

## Intent

The current external collector receipt retains three eligible failures as
`unknown-failure`, correctly rejecting any sustained-green claim. Read-only
inspection proves each has a concrete root cause, a repair commit and a later
successful Product CI run. This card records those three immutable links in the
existing disposition data so the evaluator can distinguish repaired failures
from unexplained failures without removing any observation. It does not change
the 30-day/90-run policy, reduce any denominator, edit raw CI evidence, or
declare the reliability proof met.

## Acceptance

- [ ] ACC-1: Each added disposition names an eligible failed run, specific
      failure class and root cause, repair commit and a later successful,
      eligible Product CI run; IDs, SHA and job links are independently
      reproducible from the external receipt and GitHub logs.
- [ ] ACC-2: Recollecting the same external export produces no unexplained
      failure for a disposition only when its repair chain is valid. Any
      missing, non-later or non-successful repair remains fail-closed.
- [ ] ACC-3: The report still rejects long-term reliability if calendar days
      or eligible-run thresholds are insufficient. No failure is removed,
      excluded retroactively or counted as a rerun.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-21T15:58:07.551Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0116-reconcile-current-product-ci-failure-dispositions-from-raw-lifecycle-evidence.task.md","contentDigest":"sha256:85cae546b78ca5a1773ca006a50ca5246720de4042bd6496ad168de37f8f1ee5"} -->
