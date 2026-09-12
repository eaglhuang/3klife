---
task_id: TASK-PRF-0033
title: Fail-closed timeout and diagnostics for Standard Dogfood CI
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-PRF-0031
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-PRF-0031 is released and daily Product CI retention remains enabled
  softRelations:
    - TASK-PRF-0032 baseline boundary
  changedPublicSeams:
    - product-ci-dogfood-timeout-contract
  causalImpactEdges:
    - dogfood-timeout-to-burn-in-observation
  parallelFrontierInputs:
    - protected-main-ci-workflow
  validatorReferences:
    - tests/cli/standard-validator-timeout.test.ts
  phaseOwner: atm-release
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .github/workflows/ci.yml
  - tests/cli/standard-validator-timeout.test.ts
  - docs/reports/atm-ci-burn-in-baseline-2026-09-12.md
deliverables:
  - .github/workflows/ci.yml
  - tests/cli/standard-validator-timeout.test.ts
  - docs/reports/atm-ci-burn-in-baseline-2026-09-12.md
validators:
  - node --strip-types tests/cli/standard-validator-timeout.test.ts
  - npm run typecheck
  - npm run lint
  - npm run validate:standard
testContributions:
  - caseId: test_standard_validator_timeout_diagnostic_2c9e7f1a
    targetGroupId: null
    semanticKey: standard_validator_timeout_diagnostic
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [dogfood-timeout-to-burn-in-observation]
    expectedRedPredicate: timeout emits active validator and progress diagnostics and exits non-zero
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: product-ci-dogfood-timeout-contract
    resourceKey: null
requiredTestCaseIds:
  - test_standard_validator_timeout_diagnostic_2c9e7f1a
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
atomizationImpact:
  ownerAtomOrMap: atm.validator-runner-map
  mapUpdates:
    - atomic_workbench/maps/atm-validator-runner-map.json
  extractionCandidates:
    - atom: atm.validator-timeout-policy
      pattern: Policy Object
      source: scripts/run-validators/implementation.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-12T18:23:57.898Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-12T18:23:57.898Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-12T18-23-57-898Z-close-85d5b274bab0"
lastTransitionAt: "2026-09-12T18:23:57.898Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b060525e68860da4a037c91ddccc09b42c7657a0"
---

# TASK-PRF-0033 Fail-closed timeout and diagnostics for Standard Dogfood CI

## Intent

TBD.

## Acceptance

- [ ] ACC-1: ATM Dogfood has a bounded job-level timeout; timeout is a non-green observation and is never silently excluded from burn-in.
  - [ ] ACC-2: Validate Standard retains progress heartbeat output and the stable `ATM_VALIDATOR_TIMEOUT` diagnostic for validator-level timeouts; the workflow step timeout produces a bounded non-green result.
- [ ] ACC-3: Focused regression test proves timeout classification is distinct from ordinary validator failure; Product CI behavior and burn-in thresholds remain unchanged.

## Evidence and rollback

Run the required focused test and static validators, then execute the full
standard validator once. Capture the remote protected-main run URL and the
timeout/active-validator evidence in the report. Revert the delivery commit to
remove the timeout contract if it causes an unintended regression.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-12T17:39:17.236Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0033-fail-closed-timeout-and-diagnostics-for-standard-dogfood-ci.task.md","contentDigest":"sha256:509b031e99259b1b0bb0cb5a2f32b3de9bb4cee7fdbbd3d40ec8d005072ba340"} -->
