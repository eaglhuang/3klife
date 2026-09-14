---
task_id: TASK-PRF-0064
title: Scope CI burn-in evidence to the product workflow
status: done
owner: product-ci-evidence-steward
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-PRF-0059 external export remains preserved outside Git with a digest
    - TASK-PRF-0063 replay contract is available on the target source baseline
  softRelations:
    - TASK-PRF-0059
    - TASK-PRF-0063
  changedPublicSeams:
    - ci-burn-in-evidence-contract
    - product-ci-burn-in-report
  causalImpactEdges:
    - workflow-scope-to-eligible-count
    - excluded-reason-to-replayability
  parallelFrontierInputs:
    - TASK-PRF-0059-external-export
  validatorReferences:
    - test_prf0064_exact_product_workflow_scope_7c1a2d4e
    - test_prf0064_ambiguous_workflow_fails_closed_91d4e7b2
    - test_prf0064_product_job_conclusion_is_authoritative_6a4f91c0
    - test_prf0064_replay_scope_receipt_c43e8a19
  phaseOwner: atm-product-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - scripts/product-ci-burn-in-workflow-scope.json
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
  - docs/reports/atm-product-ci-lifecycle-evidence.md
  - docs/reports/atm-product-ci-burn-in-real-export.md
deliverables:
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - scripts/product-ci-burn-in-workflow-scope.json
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
  - docs/reports/atm-product-ci-lifecycle-evidence.md
  - docs/reports/atm-product-ci-burn-in-real-export.md
validators:
  - node --strip-types tests/cli/ci-burn-in-evidence-collector.test.ts
  - node --strip-types tests/cli/product-proof-evidence-boundary.test.ts
  - node --strip-types scripts/collect-ci-burn-in-evidence.ts --input C:/Users/User/atm-benchmark-sink/TASK-PRF-0059/github-attempt-export.json --scope-config scripts/product-ci-burn-in-workflow-scope.json --output C:/Users/User/atm-benchmark-sink/TASK-PRF-0064/scoped-lifecycle-receipt.json
  - node --strip-types scripts/measure-product-ci-burn-in.ts --input C:/Users/User/atm-benchmark-sink/TASK-PRF-0064/scoped-lifecycle-receipt.json --report-only
testContributions:
  - caseId: test_prf0064_exact_product_workflow_scope_7c1a2d4e
    targetGroupId: null
    semanticKey: exact_product_workflow_is_eligible
    coversAcceptance: [ACC-1]
    coversImpactEdges: [workflow-scope-to-eligible-count]
    expectedRedPredicate: an exact in-scope product workflow is retained as eligible and uses its product-job conclusion
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: ci-workflow-scope-contract
    resourceKey: null
  - caseId: test_prf0064_ambiguous_workflow_fails_closed_91d4e7b2
    targetGroupId: null
    semanticKey: ambiguous_workflow_identity_is_excluded
    coversAcceptance: [ACC-2]
    coversImpactEdges: [workflow-scope-to-eligible-count]
    expectedRedPredicate: missing or out-of-scope workflow identity cannot enter the eligible denominator
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: ci-workflow-scope-contract
    resourceKey: null
  - caseId: test_prf0064_product_job_conclusion_is_authoritative_6a4f91c0
    targetGroupId: null
    semanticKey: product_job_conclusion_is_separate_from_workflow_conclusion
    coversAcceptance: [ACC-2]
    coversImpactEdges: [workflow-scope-to-eligible-count]
    expectedRedPredicate: dogfood-only workflow failure does not become a product-CI failure while product workflow provenance is retained
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: ci-workflow-scope-contract
    resourceKey: null
  - caseId: test_prf0064_replay_scope_receipt_c43e8a19
    targetGroupId: null
    semanticKey: scoped_receipt_replays_with_exclusion_reasons
    coversAcceptance: [ACC-3]
    coversImpactEdges: [excluded-reason-to-replayability]
    expectedRedPredicate: replay reports scoped counts and exclusion reasons without changing the negative verdict
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: ci-lifecycle-receipt-contract
    resourceKey: null
  - caseId: test_prf0064_tampered_scope_fails_closed_2e8b6d41
    targetGroupId: null
    semanticKey: tampered_scope_policy_is_rejected
    coversAcceptance: [ACC-4]
    coversImpactEdges: [excluded-reason-to-replayability]
    expectedRedPredicate: malformed or digest-mismatched scope policy is rejected before a receipt is emitted
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: ci-workflow-scope-contract
    resourceKey: null
requiredTestCaseIds:
  - test_prf0064_exact_product_workflow_scope_7c1a2d4e
  - test_prf0064_ambiguous_workflow_fails_closed_91d4e7b2
  - test_prf0064_product_job_conclusion_is_authoritative_6a4f91c0
  - test_prf0064_replay_scope_receipt_c43e8a19
  - test_prf0064_tampered_scope_fails_closed_2e8b6d41
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - tdd-oracle-fidelity
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.product-ci-burn-in-evidence
  mapUpdates:
    - docs/reports/atm-product-ci-lifecycle-evidence.md
    - docs/reports/atm-product-ci-burn-in-real-export.md
  extractionCandidates:
    - atom: atm.ci-burn-in-workflow-scope-policy
      pattern: Policy Object
      source: scripts/product-ci-burn-in-workflow-scope.json
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T07:54:57.443Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T07:54:57.443Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T07-54-57-443Z-close-95a86465ebc7"
lastTransitionAt: "2026-09-14T07:54:57.443Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "69cf8d3305c9132c1b8e0820846e26de91380a29"
---

# TASK-PRF-0064 Scope CI burn-in evidence to the product workflow

## Intent

0059's first external export is structurally valid but semantically over-broad:
all 800 attempts are marked eligible even though 170 belong to the generic
`ci` workflow and 9 belong to a release-candidate workflow. The collector
currently defaults missing `eligible` to true and therefore lets unrelated
workflow failures change a product burn-in claim. It also uses the
workflow-level conclusion even though each product workflow attempt carries a
separate `productCi.conclusion`; 618 of the 621 standard product jobs
succeeded while 448 overall workflow attempts failed because of isolated
`atm-dogfood` jobs. This card repairs that boundary without rewriting the
historical export or hiding any failure.

The implementation must use an explicit, digestable scope policy rather than a
scattered workflow-name check. The policy must state the exact in-scope
workflow identity and the treatment of release-candidate runs. An attempt with
missing, ambiguous, or out-of-scope workflow identity is excluded with a
machine-readable reason; it is never silently counted. For an in-scope workflow
the product-job conclusion is authoritative for burn-in, while the workflow
conclusion remains separate provenance. Explicit exclusions in the source
remain preserved and must also retain their reason. The evaluator
must consume the scoped receipt, expose eligible and excluded counts and
reasons, and keep `semanticVerdict: reject` whenever scoped failures or
unresolved repairs remain.

## Acceptance

- [ ] ACC-1: A versioned scope policy explicitly identifies the product CI
      workflow(s) and the release-candidate treatment; the collector applies
      it deterministically and records the policy digest.
- [ ] ACC-2: Generic `ci`, unknown, missing, and ambiguous workflow identities
      are excluded with non-empty machine-readable reasons; they cannot enter
      the eligible denominator or satisfy the 30-day/90-run gate. For retained
      workflows, product-job and workflow-level conclusions remain distinct and
      only the product-job conclusion drives burn-in.
- [ ] ACC-3: Replaying the unchanged 0059 export produces a canonical receipt
      and report with scoped count, excluded count/reasons, failure-class
      distribution, calendar window, and semantic verdict. The existing
      negative result remains negative when scoped failures or unresolved
      repairs remain.
- [ ] ACC-4: Focused tests cover exact in-scope, out-of-scope, missing identity,
      explicit exclusion, and tampered scope-policy cases; malformed or
      digest-mismatched scope input fails closed.

The card explicitly does not authorize CI permission changes, threshold
changes, npm publication, GitHub push, or rewriting TASK-PRF-0059 provenance.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T06:55:20.501Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0064-scope-ci-burn-in-evidence-to-the-product-workflow.task.md","contentDigest":"sha256:f29c45767f9749691441a1adf4bb1e92a3dadce7997d7c39f038defdfa0239b4"} -->
