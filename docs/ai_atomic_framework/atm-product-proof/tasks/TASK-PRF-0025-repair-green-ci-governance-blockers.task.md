---
task_id: TASK-PRF-0025
title: Repair remaining green CI governance blockers
status: done
owner: owner-authorized-ci-steward
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
closure_authority: target_repo
scopePaths:
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-module-boundaries.ts
  - scripts/render-agent-matrix.ts
  - scripts/validate-multi-agent-confidence.ts
  - scripts/validate-task-ledger-governance.ts
  - scripts/validators/task-ledger/suite-impl/implementation.ts
  - docs/reports/atm-product-ci-burn-in.md
  - docs/multi-agent-compatibility-matrix.md
deliverables:
  - generalized module-boundary contract that accepts the runtime build seam without weakening unrelated checks
  - regenerated and validated multi-agent compatibility matrix with one canonical source
  - repaired task-ledger governance fixtures/logic with command-backed regression evidence
  - CI evidence showing Validate Standard passes with no new performance regressions
validators:
  - node --strip-types scripts/validate-module-boundaries.ts --mode validate
  - node --strip-types scripts/validate-multi-agent-confidence.ts --mode validate
  - node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
  - npm run validate:standard
  - npm run typecheck
  - npm run lint
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-11T18:14:32.547Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-11T18:14:32.547Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-11T18-14-32-547Z-close-64e456fd99d0"
lastTransitionAt: "2026-09-11T18:14:32.547Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e3442d498218f377685d833761e7e10a156d4b3c"
---

# TASK-PRF-0025 Repair remaining green CI governance blockers

## Intent

The first green-CI repair exposed three independent failures in Product CI run
34621572064. This card removes the underlying contract drift rather than
silencing the validator: the runtime builder's `.mjs` seam must be represented
as an explicit, bounded module-boundary rule; the multi-agent matrix must be
generated from one canonical source; and task-ledger governance must validate
the current ledger schema and fixtures. Existing unrelated WIP remains out of
scope.

## Acceptance

- [ ] The `.mjs` runtime build seam is accepted only through a documented,
  bounded rule and unrelated `.mjs` imports still fail closed.
- [ ] Rendered multi-agent matrix and validator output have matching digests.
- [ ] Task-ledger governance validator passes on clean and negative fixtures.
- [ ] `npm run validate:standard`, typecheck, and lint pass locally and in CI.
- [ ] No validator is disabled or converted from blocking to advisory merely to
  obtain green CI.
- [ ] Rollback is a governed revert of the scoped source/fixture changes,
  followed by the same validator suite.

## Evidence and rollback

Record each focused validator, the full standard-suite result, and the repaired
CI run SHA. If any generalized rule broadens beyond the observed failure,
revert the scoped commit and restore the prior validator behavior before
re-running the suite.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T16:47:32.978Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0025-repair-green-ci-governance-blockers.task.md","contentDigest":"sha256:a3cfd91408753af0a1e8576d7a91b9c3d336e6ade7795dc2ce97b3db9a9ebd57"} -->