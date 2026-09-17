---
task_id: TASK-PRF-0066
title: Make Product CI coverage match the burn-in claim
status: planned
owner: release-runtime-steward
priority: P1
depends_on: [TASK-PRF-0064]
causalGraph:
  causalDependencies: [TASK-PRF-0064]
  startConditions:
    - "The scoped burn-in evaluator counts Product CI jobs, but the current product lane does not run the repository build or the full npm test suite."
    - "The existing 0059 export is historical negative evidence and must remain non-eligible; only post-change exports may accumulate toward the 30-day/90-run gate."
  softRelations: [TASK-PRF-0059, TASK-PRF-0063]
  changedPublicSeams: [product_ci_required_step_coverage, protected_main_burn_in]
  causalImpactEdges: [ci_burn_in_validity, product_delivery_reliability]
  parallelFrontierInputs: [workflow_contract, step_coverage_receipt, historical_negative_replay]
  validatorReferences: [test_prf_product_ci_required_steps, test_prf_burnin_step_coverage, test_prf_historical_negative_preserved]
  phaseOwner: ci
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .github/workflows/ci.yml
  - scripts/product-ci-burn-in-workflow-scope.json
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/ci-product-lane-contract.test.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - docs/reports/atm-product-ci-burn-in-real-export.md
deliverables:
  - .github/workflows/ci.yml
  - scripts/product-ci-burn-in-workflow-scope.json
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/ci-product-lane-contract.test.ts
  - tests/cli/ci-burn-in-evidence-collector.test.ts
  - docs/reports/atm-product-ci-burn-in-real-export.md
validators:
  - npm run typecheck
  - npm run lint
  - npm run build
  - npm test
  - node --strip-types tests/cli/ci-product-lane-contract.test.ts
  - node --strip-types tests/cli/ci-burn-in-evidence-collector.test.ts
  - node --strip-types scripts/collect-ci-burn-in-evidence.ts --input C:/Users/User/atm-benchmark-sink/TASK-PRF-0059/github-attempt-export.json --scope-config scripts/product-ci-burn-in-workflow-scope.json --output C:/Users/User/atm-benchmark-sink/TASK-PRF-0066/scoped-lifecycle-receipt.json
  - node --strip-types scripts/measure-product-ci-burn-in.ts --input C:/Users/User/atm-benchmark-sink/TASK-PRF-0066/scoped-lifecycle-receipt.json --report-only
testContributions:
  - caseId: test_prf_product_ci_required_steps
    targetGroupId: null
    semanticKey: product_ci_required_step_contract
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [ci_burn_in_validity]
    expectedRedPredicate: "Product CI can be green while npm run build or npm test is absent, skipped, or only represented by ATM Dogfood."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: product_ci_required_step_coverage
    resourceKey: ci-workflow
  - caseId: test_prf_burnin_step_coverage
    targetGroupId: null
    semanticKey: burnin_step_coverage_provenance
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [ci_burn_in_validity]
    expectedRedPredicate: "A receipt with an overall Product CI success but missing required-step evidence is counted as eligible green burn-in."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: protected_main_burn_in
    resourceKey: step-coverage-receipt
  - caseId: test_prf_historical_negative_preserved
    targetGroupId: null
    semanticKey: historical_negative_replay
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: [product_delivery_reliability]
    expectedRedPredicate: "The unchanged 0059 export is retroactively promoted to long-term-green or loses its missing-step provenance."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0064
    contractEdge: protected_main_burn_in
    resourceKey: historical-export
requiredTestCaseIds: [test_prf_product_ci_required_steps, test_prf_burnin_step_coverage, test_prf_historical_negative_preserved]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: protected-main-product-ci-step-coverage-and-negative-replay
rollback:
  strategy: revert-commit-preserve-external-receipts
  notes: "保留既有 0059/0064 原始匯出與負結果；只回滾 workflow、coverage contract、collector/evaluator 與報告變更。"
atomizationImpact:
  ownerAtomOrMap: atm.product-ci-burn-in
  mapUpdates: []
  extractionCandidates:
    - atom: atm.product-ci-step-coverage-policy
      pattern: Policy Object
      source: scripts/product-ci-burn-in-workflow-scope.json
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0066 Make Product CI coverage match the burn-in claim

## Intent

The current burn-in scope is now workflow-identity-safe, but its Product CI
job contract is still weaker than the product objective. `.github/workflows/ci.yml`
currently runs clean install, typecheck, narrow lint, focused product checks,
package smoke, and packing, yet omits `npm run build` and the full `npm test`.
This creates a false-completeness risk: ninety green job conclusions would not
prove build and test reliability.

This follow-up adds the missing required steps and makes step coverage part of
the evidence contract. A Product CI job is eligible for burn-in only when all
required steps are present, executed, and successful. The unchanged 0059
export must continue to replay as negative because it lacks this provenance;
historical data must never be silently upgraded.

## Acceptance

- [ ] ACC-1: The required Product CI job executes `npm ci`, `npm run build`,
      `npm run typecheck`, the declared lint gate, `npm test`, package smoke,
      `npm pack --workspaces --dry-run`, and clean-install validation. A missing
      or skipped required step fails the job and is visible in the receipt.
- [ ] ACC-2: The Product CI contract test statically asserts the complete
      required command set and keeps Product CI independent from ATM Dogfood.
- [ ] ACC-3: The collector records required-step identities, conclusions and
      execution status for each retained Product CI run. Missing or ambiguous
      step coverage is excluded or reported inconclusive, never eligible green.
- [ ] ACC-4: The evaluator requires complete successful step coverage before a
      run contributes to the 30-day/90-run burn-in count, while preserving
      workflow conclusion and exclusion reasons as provenance.
- [ ] ACC-5: Replaying the unchanged 0059 export remains negative and
      reproducible; no historical run is promoted because of the new contract.
- [ ] ACC-6: typecheck, lint, build, full test, focused contract tests, and the
      collector/evaluator replay pass. Raw exports remain outside Git and the
      report records digests plus an executable replay command.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T08:15:32.311Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0066-make-product-ci-coverage-match-the-burn-in-claim.task.md","contentDigest":"sha256:698888cf9c07691949bb456b7ce52e67ac9f2e9f72cadec33b8a76d0f3319cc4"} -->
