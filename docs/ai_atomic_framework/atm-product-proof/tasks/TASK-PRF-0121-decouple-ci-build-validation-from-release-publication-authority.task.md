---
task_id: TASK-PRF-0121
title: Decouple CI build validation from release publication authority
status: done
owner: ci-product
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - "TASK-PRF-0066 delivery commit af93da682c34c42a2b1f3ec942421bb74e6a0f28 exists, and its Product CI build step reproduces the missing release-surface claim blocker."
    - "The validation path must not own or mutate a release-surface claim."
  softRelations: [TASK-PRF-0066, TASK-PRF-0115, TASK-PRF-0117]
  changedPublicSeams: [product-ci-build-validation-mode]
  causalImpactEdges: [ci-evidence-closeout, release-publication-safety]
  parallelFrontierInputs: [sealed-build-input-digest, release-publication-admission]
  validatorReferences: [sealed-runner-build, product-ci-lane-contract]
  phaseOwner: ci-product
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/run-sealed-runner-build.ts
  - .github/workflows/ci.yml
  - tests/cli/runner-build-validation-only.test.ts
  - tests/cli/ci-product-lane-contract.test.ts
  - docs/reports/atm-product-ci-burn-in-real-export.md
deliverables:
  - scripts/run-sealed-runner-build.ts
  - .github/workflows/ci.yml
  - tests/cli/runner-build-validation-only.test.ts
  - tests/cli/ci-product-lane-contract.test.ts
  - docs/reports/atm-product-ci-burn-in-real-export.md
validators:
  - node --strip-types tests/cli/runner-build-validation-only.test.ts
  - node --strip-types tests/cli/ci-product-lane-contract.test.ts
  - npm run build -- --validation-only
  - npm run typecheck
  - npm run lint
testContributions:
  - caseId: test_prf0121_validation_only_build_without_publication_claim_8c1a2e4d
    targetGroupId: null
    semanticKey: validation_only_build_without_publication_claim
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [ci-evidence-closeout]
    expectedRedPredicate: Product CI build exits before compilation because no release-surface claim exists, or validation mode writes the live release surface.
    contributionResourceKey: sealed-runner-build
    responsibility: task-required
    dependencyEdge: sealed-build-input-digest
    contractEdge: product-ci-build-validation-mode
    resourceKey: ci-build-validation
  - caseId: test_prf0121_publish_path_remains_claim_gated_6f4b7d91
    targetGroupId: null
    semanticKey: publish_path_remains_claim_gated
    coversAcceptance: [ACC-3]
    coversImpactEdges: [release-publication-safety]
    expectedRedPredicate: A default release build or explicit publication attempt succeeds without exactly one active release-surface claim, or its existing CAS/release-sync guard is bypassed.
    contributionResourceKey: sealed-runner-publication
    responsibility: task-required
    dependencyEdge: release-publication-admission
    contractEdge: release-publication-claim-gate
    resourceKey: release-publication
  - caseId: test_prf0121_product_ci_invokes_validation_mode_2a9e5f70
    targetGroupId: null
    semanticKey: product_ci_invokes_validation_mode
    coversAcceptance: [ACC-1]
    coversImpactEdges: [ci-evidence-closeout]
    expectedRedPredicate: Product CI invokes the publication path and therefore cannot produce build evidence without a release-surface claim.
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: product-ci-build-command
    resourceKey: product-ci
  - caseId: test_prf0121_surface_scope_remains_bounded_4d7c8a12
    targetGroupId: null
    semanticKey: surface_scope_remains_bounded
    coversAcceptance: [ACC-4]
    coversImpactEdges: [ci-evidence-closeout, release-publication-safety]
    expectedRedPredicate: The candidate adds a new ATM command, registry, daemon, long-lived cache, second task store, or npm runtime dependency instead of one bounded build-mode seam.
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: bounded-build-mode-scope
    resourceKey: product-ci
requiredTestCaseIds:
  - test_prf0121_validation_only_build_without_publication_claim_8c1a2e4d
  - test_prf0121_publish_path_remains_claim_gated_6f4b7d91
  - test_prf0121_product_ci_invokes_validation_mode_2a9e5f70
  - test_prf0121_surface_scope_remains_bounded_4d7c8a12
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed-validation-only-build-and-publication-negative-receipts
rollback:
  strategy: revert-commit
  notes: Revert the validation-only flag and Product CI invocation together; leave the formal release workflow and release-surface admission unchanged.
atomizationImpact:
  ownerAtomOrMap: atm.release.builder-coordination
  mapUpdates: []
  extractionCandidates:
    - atom: atm.sealed-runner-build-mode
      pattern: Policy Object
      source: scripts/run-sealed-runner-build.ts
      disposition: inline
      inlineReason: The change is one bounded execution-mode seam in a 537-line builder; extracting a new module would add surface without a second caller.
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-22T04:02:10.738Z"
completed_by_agent: "codex-product-ci-coverage"
closedAt: "2026-09-22T04:02:10.738Z"
closedByActor: "codex-product-ci-coverage"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-22T04-02-10-738Z-close-d9666245a0a8"
lastTransitionAt: "2026-09-22T04:02:10.738Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "cdbcb9e8648f9056944f6b15b75548c671df2c03"
---

# TASK-PRF-0121 Decouple CI build validation from release publication authority

## Intent

Product CI currently calls the sealed runner builder through the same path that
publishes generated release surfaces. That path fails before compilation unless
the actor owns exactly one active release-surface claim, even when CI only needs
to validate reproducibility. This card introduces one explicit validation-only
mode that builds in the existing detached temporary build root, records the
source/build-input/output digest evidence needed by CI, and never syncs or
publishes `release/**` or `packages/cli/dist` into the canonical worktree.

The normal release path remains claim-gated and unchanged. This is a narrow
product-CI unblock, not a new governance service, cache, registry, command, or
runtime package boundary.

## Acceptance

- [ ] **ACC-1:** Product CI invokes the validation-only mode and obtains a
      command-backed successful build receipt without a release-surface claim.
- [ ] **ACC-2:** Validation-only mode builds from the sealed source SHA in a
      temporary output root, verifies the expected output/digest contract, and
      leaves the canonical release surfaces byte-for-byte unchanged.
- [ ] **ACC-3:** The normal publication path still requires exactly one active
      release-surface claim and keeps its existing CAS, runner-sync and
      fail-closed behavior; an explicit publication negative test proves this.
- [ ] **ACC-4:** No new ATM command, registry, daemon, long-lived cache, second
      task store, or npm runtime dependency is introduced. Rollback is one
      revert commit.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T03:35:38.222Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0121-decouple-ci-build-validation-from-release-publication-authority.task.md","contentDigest":"sha256:2a36d2ecaa48ab4d6bb52c4f3e6f4ff4ae9d75dcdbd2a7365cf6d7a8d9ad7cce"} -->
