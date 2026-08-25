---
task_id: TASK-PRF-0003
title: Separate required product CI and enforce protected main
status: planned
owner: atm-ci
priority: P0
series: PRF
series_reason: Closest approved family because this task creates externally meaningful ATM product proof.
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - Current red CI failures and skipped downstream jobs are captured as baseline evidence.
    - The current frozen runner can execute the declared product-CI validation commands.
  softRelations: [TASK-PRF-0002, TASK-PRF-0004]
  changedPublicSeams: [required-product-ci, advisory-dogfood-ci, protected-main-status]
  causalImpactEdges:
    - product-checks-run-even-when-dogfood-is-red
    - skipped-required-check-is-not-green
    - main-requires-current-product-status
  parallelFrontierInputs: [latest-ci-failure-envelope, standard-validator-inventory]
  validatorReferences:
    - test_prf_ci_lane_separation_6f1a82cd
    - test_prf_required_check_completion_d98b220e
    - test_prf_protected_main_contract_25a6714b
  phaseOwner: phase-1-product-ci
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .github/workflows/ci.yml
  - scripts/run-validators.ts
  - scripts/validate-ci-product-lane.ts
  - tests/cli/ci-product-lane-contract.test.ts
  - docs/reports/atm-product-ci-burn-in.md
deliverables:
  - .github/workflows/ci.yml
  - scripts/validate-ci-product-lane.ts
  - tests/cli/ci-product-lane-contract.test.ts
  - docs/reports/atm-product-ci-burn-in.md
validators:
  - node --strip-types tests/cli/ci-product-lane-contract.test.ts
  - node --strip-types scripts/validate-ci-product-lane.ts
  - npm run validate:standard
testContributions:
  - caseId: test_prf_ci_lane_separation_6f1a82cd
    targetGroupId: null
    semanticKey: required_product_ci_lane
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [product-checks-run-even-when-dogfood-is-red]
    expectedRedPredicate: Dogfood or doctor failure prevents required product checks from executing.
    contributionResourceKey: .github/workflows/ci.yml
    responsibility: task-required
    dependencyEdge: ci-job-dependency-graph
    contractEdge: required-product-ci
    resourceKey: github-actions
  - caseId: test_prf_required_check_completion_d98b220e
    targetGroupId: null
    semanticKey: required_check_completion
    coversAcceptance: [ACC-3]
    coversImpactEdges: [skipped-required-check-is-not-green]
    expectedRedPredicate: A required product step can be skipped while aggregate status remains successful.
    contributionResourceKey: ci-product-summary
    responsibility: task-required
    dependencyEdge: product-step-to-required-status
    contractEdge: required-product-ci
    resourceKey: github-actions
  - caseId: test_prf_protected_main_contract_25a6714b
    targetGroupId: null
    semanticKey: protected_main_required_status
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [main-requires-current-product-status]
    expectedRedPredicate: Main accepts delivery without current required product status or compact evidence fields.
    contributionResourceKey: protected-main-contract
    responsibility: task-required
    dependencyEdge: branch-rule-to-product-status
    contractEdge: protected-main-status
    resourceKey: github-ruleset
requiredTestCaseIds:
  - test_prf_ci_lane_separation_6f1a82cd
  - test_prf_required_check_completion_d98b220e
  - test_prf_protected_main_contract_25a6714b
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert workflow and ruleset changes together; retain the last known working required-status name.
atomizationImpact:
  ownerAtomOrMap: atm.ci-release-map
  mapUpdates: [atomic_workbench/maps/atm-ci-release-map.json]
  newScriptsAllowed: true
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0003 Separate required product CI and enforce protected main

## Intent

Make CI attest the installable product independently of advisory ATM dogfood and
enforce that signal at the main-branch boundary.

`TASK-PRF-0002` is a validation and compose input, not a claim prerequisite:
both cards may start and develop concurrently. Its compatibility-matrix result
is checked when the two deliveries compose and again during acceptance; a
failed matrix blocks that join rather than freezing this product-CI lane.

## Acceptance

- [ ] ACC-1: Required product CI runs install, typecheck, lint, focused tests, package smoke and clean-install smoke.
- [ ] ACC-2: Dogfood diagnostics remain visible but cannot prevent product checks from producing their own verdict.
- [ ] ACC-3: A skipped required product check is failed or incomplete, never green.
- [ ] ACC-4: Main requires the named product status through a verified ruleset or equivalent protected-branch control.
- [ ] ACC-5: Ten consecutive protected-main runs are green, including two clean release-candidate runs, with command-backed compact evidence.

## Out of scope

- npm credential ownership or public registry publication.
- Suppressing current Doctor or integration drift through waivers.

## Stop rule

Stop if branch enforcement cannot be inspected independently or a required
product step remains conditionally skipped. Advisory receipts do not count as
the ten-run burn-in.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-20T14:42:27.559Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0003-separate-required-product-ci-and-enforce-protected-main.task.md","contentDigest":"sha256:4a160055b400c59d439c875e57a31817ceb589452362789ff822d0f4341b0669"} -->
