---
task_id: TASK-PRF-0014
title: Reverify protected-main Product CI after clean-install delivery
status: done
owner: atm-release
priority: P0
depends_on: [TASK-PRF-0009, TASK-PRF-0013]
causalGraph:
  causalDependencies: [TASK-PRF-0009, TASK-PRF-0013]
  startConditions:
    - Owner-authorized delivery of the reviewed local commits to protected main is available.
    - The Product CI workflow and clean-install smoke are present at the delivered SHA.
    - GitHub Actions read access can retrieve complete logs and conclusions.
  softRelations: [TASK-PRF-0008]
  changedPublicSeams: [protected-main-product-ci-evidence]
  causalImpactEdges:
    - required-product-lane-is-green
    - clean-install-smoke-runs-remotely
    - consecutive-green-run-count-is-real
  parallelFrontierInputs:
    - delivered-sha
    - github-run-identifiers
    - branch-protection-or-ruleset-evidence
  validatorReferences:
    - test_prf_remote_product_ci_observation_2f8a1d4c
    - test_prf_consecutive_green_run_gate_7c2e9b41
  phaseOwner: phase-1-remote-ci-verification
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/atm-product-ci-burn-in.md
deliverables:
  - docs/reports/atm-product-ci-burn-in.md
validators:
  - node --strip-types tests/cli/ci-product-lane-contract.test.ts
  - npm run validate:ci-product-lane
  - node --strip-types scripts/validate-ci-product-lane.ts --remote
testContributions:
  - caseId: test_prf_remote_product_ci_observation_2f8a1d4c
    targetGroupId: null
    semanticKey: remote_product_ci_observation
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [required-product-lane-is-green, clean-install-smoke-runs-remotely]
    expectedRedPredicate: A protected-main Product CI run is absent, red, stale, or does not execute the required clean-install smoke.
    contributionResourceKey: github-product-ci-runs
    responsibility: task-required
    dependencyEdge: delivered-sha-to-remote-run
    contractEdge: protected-main-product-ci-evidence
    resourceKey: github-actions
  - caseId: test_prf_consecutive_green_run_gate_7c2e9b41
    targetGroupId: null
    semanticKey: consecutive_green_run_gate
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [consecutive-green-run-count-is-real]
    expectedRedPredicate: The burn-in report claims green or protected enforcement without the required consecutive run IDs and branch-rule evidence.
    contributionResourceKey: ci-burn-in-report
    responsibility: task-required
    dependencyEdge: remote-run-to-burn-in-report
    contractEdge: protected-main-product-ci-evidence
    resourceKey: release-gate
requiredTestCaseIds:
  - test_prf_remote_product_ci_observation_2f8a1d4c
  - test_prf_consecutive_green_run_gate_7c2e9b41
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: reasoned-not-applicable
tddNotApplicableReason: This card records externally executed CI observations and branch-rule evidence; it changes no product behavior, so command-backed remote receipts are the direct oracle.
methodProfiles: [evidence-only-verification]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only the burn-in report update; never rewrite or delete remote run history.
atomizationImpact:
  ownerAtomOrMap: atm.release-build-map
  mapUpdates: []
  newScriptsAllowed: false
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-10T23:57:23.775Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-10T23:57:23.775Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-10T23-57-23-775Z-close-3b7d516b1c67"
lastTransitionAt: "2026-09-10T23:57:23.775Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e3442d498218f377685d833761e7e10a156d4b3c"
---

# TASK-PRF-0014 Reverify protected-main Product CI after clean-install delivery

## Intent

Re-establish whether the protected-main Product CI lane is genuinely green
after the clean-install delivery. This card is observation-only: it cannot
push, publish npm, waive a failed required check, or infer remote green status
from a local run.

## Acceptance

- [ ] ACC-1: The delivered SHA and complete GitHub Actions run IDs are recorded.
- [ ] ACC-2: The required Product CI lane is green and its logs show the clean-install smoke executed against the delivered SHA.
- [ ] ACC-3: The report proves the declared consecutive-green count from distinct protected-main runs, or remains explicitly red/inconclusive with the first failing command.
- [ ] ACC-4: Branch protection/ruleset evidence binds the Product CI check as required; a sandbox or advisory workflow cannot satisfy this criterion.

## Stop rule

If owner-authorized delivery, GitHub logs, or branch-rule evidence is absent,
the task remains planned or inconclusive. A local green `npm run lint` or
`npm run validate:ci-product-lane` is useful preflight evidence but is not a
remote protected-main result.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-10T23:52:49.345Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0014-reverify-protected-main-product-ci-after-clean-install-delivery.task.md","contentDigest":"sha256:20dbf6f70dacbe1acd8ccbbc9fe09f42188b7e8d5a491da2beca55bbfeda9484"} -->
