---
task_id: TASK-PRF-0117
title: Reseal the frozen runner from the current committed source
status: done
owner: release-maintenance
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - "The stable frozen runner reports a source-seal mismatch at committed HEAD."
    - "No active runner-sync steward reservation overlaps the release surfaces."
  softRelations: [TASK-PRF-0116, TASK-PRF-0115]
  changedPublicSeams: [frozen-runner-release-consistency]
  causalImpactEdges: [installable-cli-integrity, ci-evidence-closeout-unblocking]
  parallelFrontierInputs: [committed-source-head, runner-sync-queue]
  validatorReferences: [internal-release-sync, sealed-runner-build, frozen-next]
  phaseOwner: release-maintenance
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - atm.mjs
  - packages/cli/dist/**
  - release/atm-onefile/**
  - release/atm-root-drop/**
deliverables:
  - A sealed frozen runner and release manifests generated from the current committed HEAD.
  - A runner-sync receipt that binds the generated release surface to that HEAD.
validators:
  - ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
  - node --strip-types tests/cli/internal-release-sync.test.ts
  - node atm.mjs next --json
testContributions:
  - caseId: test_prf0117_resealed_runner_matches_committed_source_3a1f8c2d
    targetGroupId: null
    semanticKey: frozen_runner_release_consistency
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [installable-cli-integrity, ci-evidence-closeout-unblocking]
    expectedRedPredicate: a runner built from an older or mismatched source seal, or a rebuild that changes source behavior, is rejected by the release-sync validator or diff boundary review
    contributionResourceKey: sealed-runner-release
    responsibility: task-required
    dependencyEdge: committed-source-head
    contractEdge: frozen-runner-release-consistency
    resourceKey: runner-sync
requiredTestCaseIds: [test_prf0117_resealed_runner_matches_committed_source_3a1f8c2d]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: reasoned-not-applicable
tddNotApplicableReason: The task republishes generated artifacts from an already committed source revision; it introduces no source behavior and the existing release-sync test is the fail-closed oracle.
tddExemptions:
  - kind: mechanical
    reason: The intended change is a reproducible build output, not a new product behavior.
methodProfiles: []
evidence:
  required: command-backed-runner-sync-receipt
rollback:
  strategy: revert-commit
  notes: Revert only the generated release-artifact commit and rebuild from the prior committed source; do not alter the source commit or relax source-seal validation.
atomizationImpact:
  ownerAtomOrMap: atm.release-surface-budget-map
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-21T23:51:09.203Z"
completed_by_agent: "codex-gpt-5-4-mini"
closedAt: "2026-09-21T23:51:09.203Z"
closedByActor: "codex-gpt-5-4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-21T23-51-09-203Z-close-170b6637b532"
lastTransitionAt: "2026-09-21T23:51:09.203Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b84f35fca3ddb6fd6a5d2d7e6cb5cc6d765e6c5b"
---

# TASK-PRF-0117 Reseal the frozen runner from the current committed source

## Intent

The source at the current committed HEAD is newer than the sealed runner used
by `node atm.mjs`. Rebuild only the generated release surfaces so the stable
entrypoint, CLI distribution, and release manifests again bind to the same
source seal. This is a delivery-integrity repair: it does not alter CLI
behavior, package boundaries, budgets, npm publication, or governance policy.

## Acceptance

- [ ] **ACC-1:** A release build from the committed HEAD produces the sealed
      runner, CLI distribution, and release manifests without consuming
      uncommitted product source changes.
- [ ] **ACC-2:** The frozen runner no longer reports `ATM_RUNNER_SYNC_REQUIRED`
      after the build, and the existing internal release-sync test passes.
- [ ] **ACC-3:** The committed diff contains only generated release artifacts
      and this task's ATM-managed evidence; no source behavior, npm publish
      configuration, artifact budget, or benchmark surface changes.

## Boundary and rollback

`TASK-PRF-0116` remains a separate CI-evidence card. `TASK-PRF-0115` remains
the future CI-wall-time optimization card. If a release build attempts to
modify any source file, stop and investigate rather than accepting it as a
generated artifact.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-21T16:24:45.205Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0117-reseal-the-frozen-runner-from-the-current-committed-source.task.md","contentDigest":"sha256:6ef68737d64d1d6f0b45b12229aa82626273e66f5776746f4977ad8e6e809a40"} -->
