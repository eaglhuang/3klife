---
task_id: TASK-PRF-0021
title: Restore advisory Dogfood lint health after duplicate import regression
status: planned
owner: owner-authorized-release-steward
priority: P2
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: owner
scopePaths:
  - packages/cli/src/commands/tasks/status-triangulation.ts
  - tests/cli/ci-product-lane-contract.test.ts
  - docs/reports/atm-product-ci-burn-in.md
deliverables:
  - packages/cli/src/commands/tasks/status-triangulation.ts
  - tests/cli/ci-product-lane-contract.test.ts
  - docs/reports/atm-product-ci-burn-in.md
validators:
  - npm run lint
  - npm run typecheck
  - node --strip-types tests/cli/ci-product-lane-contract.test.ts
  - node --strip-types scripts/validate-ci-product-lane.ts --mode validate
  - node --strip-types scripts/validate-ci-product-lane.ts --remote
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0021 Restore advisory Dogfood lint health after duplicate import regression

## Intent

Restore advisory `ATM Dogfood` workflow health after the remote `ci.yml` run
34136912919 failed its lint step on a duplicated import of
`packages/cli/src/commands/tasks/status-triangulation.ts` (line 6,
`no-duplicate-imports`). Keep the Product CI gate and the advisory Dogfood
signal separately classified: this card repairs the lint regression and
records the remote proof, but does not waive the two release-candidate runs
required by TASK-PRF-0017.

## Required Work

- Consolidate the duplicate import declaration without changing runtime
  behavior, exports, or task-routing semantics.
- Add or adjust only the focused contract assertion needed to prevent the
  regression from returning.
- Update the burn-in report with the exact failing run, remediation commit,
  and post-remediation remote result; do not rewrite historical evidence.
- Push or dispatch remote validation only with explicit owner authorization.

## Acceptance

- [ ] `status-triangulation.ts` has one import declaration per source module.
- [ ] Lint and typecheck pass locally.
- [ ] Product CI contract and local validator pass.
- [ ] A post-remediation remote run shows advisory Dogfood lint success (or a
      separately documented, non-lint infrastructure failure).
- [ ] TASK-PRF-0017's release-candidate burn-in count remains independently
      measured; this card cannot close that gate.
- [ ] Diff is limited to the declared paths and governed evidence.

## Rollback

Revert only the import consolidation and its focused regression assertion;
retain the historical run record and do not delete evidence.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T01:27:17.686Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0021-restore-advisory-dogfood-lint-health-after-duplicate-import-regression.task.md","contentDigest":"sha256:9bd3c3a8141567451d6a63b24de13af0df38747b8fa9a35e0a50893cf51c92fc"} -->
