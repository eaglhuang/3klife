---
task_id: TASK-PRF-0031
title: 建立 Product CI 持續 burn-in 排程與 retention gate
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-PRF-0030
causalGraph:
  causalDependencies: [TASK-PRF-0030]
  startConditions:
    - Product CI burn-in evaluator and fail-closed policy are already available.
    - The scheduled workflow must run on protected main without npm publish permissions.
  softRelations: []
  changedPublicSeams: [product-ci-burn-in-schedule]
  causalImpactEdges:
    - long-term-green-window-is-observable
    - burn-in-evidence-is-retained
  parallelFrontierInputs: [github-actions-scheduler]
  validatorReferences:
    - test_prf_burn_in_schedule_contract_31a7f2c9
  phaseOwner: phase-3-product-ci-burn-in
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .github/workflows/ci.yml
  - scripts/validate-product-ci-burn-in-schedule.ts
  - tests/cli/product-ci-burn-in-schedule.test.ts
  - docs/reports/atm-ci-burn-in-baseline-2026-09-12.md
deliverables:
  - .github/workflows/ci.yml
  - scripts/validate-product-ci-burn-in-schedule.ts
  - tests/cli/product-ci-burn-in-schedule.test.ts
  - docs/reports/atm-ci-burn-in-baseline-2026-09-12.md
validators:
  - node --strip-types tests/cli/product-ci-burn-in-schedule.test.ts
  - node --strip-types scripts/validate-product-ci-burn-in-schedule.ts --mode validate
  - npm run typecheck
  - npm run lint
testContributions:
  - caseId: test_prf_burn_in_schedule_contract_31a7f2c9
    semanticKey: protected_main_burn_in_schedule_is_retained
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [long-term-green-window-is-observable, burn-in-evidence-is-retained]
    expectedRedPredicate: The workflow has no protected-main schedule, can publish packages, or omits the burn-in evaluator contract.
    responsibility: task-required
requiredTestCaseIds:
  - test_prf_burn_in_schedule_contract_31a7f2c9
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Remove only the schedule/retention gate and preserve all prior burn-in reports.
atomizationImpact:
  ownerAtomOrMap: atm.release.product-ci-burn-in-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.release.product-ci-burn-in-schedule-policy
      pattern: Policy Object
      source: scripts/validate-product-ci-burn-in-schedule.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-12T16:56:12.528Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-12T16:56:12.528Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-12T16-56-12-528Z-close-b9730822a965"
lastTransitionAt: "2026-09-12T16:56:12.528Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "08627995ca1b4047171b1613cfa84e2e23aa3ccc"
---

# TASK-PRF-0031 建立 Product CI 持續 burn-in 排程與 retention gate

## Intent

Make long-term Product CI evidence accumulate automatically instead of relying
on incidental pushes. The protected-main workflow must run a low-cost daily
burn-in observation, retain enough run history for the 90-run evaluator, and
fail closed if the schedule loses the Product CI contract or gains release
publishing permissions.

## Acceptance

- [ ] ACC-1: `ci.yml` schedules a daily protected-main burn-in and preserves the existing Product CI job.
- [ ] ACC-2: The schedule has no npm publish, id-token, or contents-write permission and remains independent of ATM Dogfood diagnostics.
- [ ] ACC-3: A deterministic validator/test proves the schedule, retention inputs, and fail-closed evaluator wiring; the burn-in report records the exact command to reproduce it.

## Out of scope

- Declaring the 30-day/90-run policy satisfied before the observed window exists.
- Altering historical run records or treating scheduled runs as external A/B evidence.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-12T16:38:06.466Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0031-product-ci-burn-in-retention-gate.task.md","contentDigest":"sha256:6c0ff3efa2c18dcba938cdf076ccd94f44554dc30651e461b969e1bda6251c8b"} -->
