---
task_id: TASK-PRF-0093
title: Close the runtime evidence boundary negative-test coverage gap
status: planned
owner: atm-evidence
priority: P1
depends_on: [TASK-PRF-0092]
causalGraph:
  causalDependencies: [TASK-PRF-0092]
  startConditions:
    - TASK-PRF-0092 remains governed-done and is not reopened.
    - The existing runtime boundary implementation and migration baseline are retained.
    - Negative fixtures must disable global and local Git excludes.
  softRelations: [TASK-PRF-0070, TASK-PRF-0091]
  changedPublicSeams: [runtime-evidence-boundary-test-contract]
  causalImpactEdges:
    - all-runtime-ledger-classes-proven-ignored
    - validator-missing-rule-fails-closed
    - validator-tracked-runtime-path-fails-closed
  parallelFrontierInputs: [repository-ignore-rule, validator-negative-controls, migration-baseline]
  validatorReferences:
    - test_prf_all_runtime_ledger_classes_ignored_1c9e6a44
    - test_prf_validator_missing_rule_fails_closed_2d7f1b80
    - test_prf_validator_tracked_runtime_path_fails_closed_3f8a2c91
  phaseOwner: phase-3-evidence-ledger-completion
planning_repo_root: C:/Users/User/3KLife
planning_repo_is_external_to_target: true
source_plan_path: docs/ai_atomic_framework/atm-product-proof/atm-product-proof-plan.md
source_task_card_path: docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0093-close-runtime-evidence-boundary-test-coverage-gap.task.md
target_repo_root: C:/Users/User/AI-Atomic-Framework
target_import_method: node atm.mjs tasks import --from <this-card> --dry-run --json
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - tests/cli/runtime-evidence-git-boundary.test.ts
  - tests/cli/evidence-ledger-migration.test.ts
deliverables:
  - tests/cli/runtime-evidence-git-boundary.test.ts
  - tests/cli/evidence-ledger-migration.test.ts
validators:
  - node --strip-types tests/cli/runtime-evidence-git-boundary.test.ts
  - node --strip-types tests/cli/evidence-ledger-migration.test.ts
  - node --strip-types scripts/validate-evidence-ledger-boundary.ts
  - npm run typecheck
testContributions:
  - caseId: test_prf_all_runtime_ledger_classes_ignored_1c9e6a44
    targetGroupId: null
    semanticKey: all_runtime_ledger_classes_ignored
    coversAcceptance: [ACC-1]
    coversImpactEdges: [all-runtime-ledger-classes-proven-ignored]
    expectedRedPredicate: A clean fixture reports any bundle, record, or work-item index path as untracked or attributes the ignore to a local/global exclude.
    contributionResourceKey: runtime-boundary-tests
    responsibility: task-required
    dependencyEdge: runtime-ledger-classes-to-repository-ignore
    contractEdge: portable-runtime-boundary
    resourceKey: clean-clone-fixture
  - caseId: test_prf_validator_missing_rule_fails_closed_2d7f1b80
    targetGroupId: null
    semanticKey: validator_missing_rule_negative_control
    coversAcceptance: [ACC-2]
    coversImpactEdges: [validator-missing-rule-fails-closed]
    expectedRedPredicate: The full boundary validator succeeds when a fixture has no repository-owned runtime-ledger ignore rule.
    contributionResourceKey: evidence-boundary-validator
    responsibility: task-required
    dependencyEdge: missing-ignore-rule-to-validator-refusal
    contractEdge: fail-closed-runtime-boundary
    resourceKey: missing-rule-fixture
  - caseId: test_prf_validator_tracked_runtime_path_fails_closed_3f8a2c91
    targetGroupId: null
    semanticKey: validator_tracked_runtime_negative_control
    coversAcceptance: [ACC-3]
    coversImpactEdges: [validator-tracked-runtime-path-fails-closed]
    expectedRedPredicate: The full boundary validator succeeds after a runtime-ledger file is forcibly tracked.
    contributionResourceKey: evidence-boundary-validator
    responsibility: task-required
    dependencyEdge: tracked-runtime-path-to-validator-refusal
    contractEdge: fail-closed-runtime-boundary
    resourceKey: tracked-runtime-fixture
  - caseId: test_prf_migration_regression_retained_6a9d31e2
    targetGroupId: null
    semanticKey: migration_regression_retained
    coversAcceptance: [ACC-4]
    coversImpactEdges: [all-runtime-ledger-classes-proven-ignored]
    expectedRedPredicate: Existing migration, checkpoint, legacy-read, or baseline assertions regress without a failing required test.
    contributionResourceKey: migration-regression
    responsibility: task-required
    dependencyEdge: prior-boundary-contract-to-regression-suite
    contractEdge: non-destructive-migration-boundary
    resourceKey: migration-fixture
requiredTestCaseIds:
  - test_prf_all_runtime_ledger_classes_ignored_1c9e6a44
  - test_prf_validator_missing_rule_fails_closed_2d7f1b80
  - test_prf_validator_tracked_runtime_path_fails_closed_3f8a2c91
  - test_prf_migration_regression_retained_6a9d31e2
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
  notes: Revert the two test-only changes as one governed unit; keep TASK-PRF-0092 implementation, baseline, and all legacy evidence intact.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-ledger-map
  mapUpdates: []
  newScriptsAllowed: false
  extractionCandidates: []
errorCodes: []
---

# TASK-PRF-0093 Close the runtime evidence boundary negative-test coverage gap

## Intent

Strengthen the evidence contract left by TASK-PRF-0092 without reopening or
altering that completed card. The tests must cover every runtime ledger class
and must prove the full validator refuses both missing repository policy and a
tracked runtime payload.

## Acceptance

- [ ] ACC-1: A clean fixture with global and local Git excludes disabled proves
  `.atm/runtime/evidence-ledger/bundles/`, `records/`, and `work-items/` are
  ignored by the checked-in `.gitignore`, while runtime reads remain available.
- [ ] ACC-2: A fixture with the repository-owned runtime rule removed causes
  the full `validateEvidenceLedgerBoundary` call to fail closed.
- [ ] ACC-3: A fixture with a runtime-ledger file forcibly tracked causes the
  full `validateEvidenceLedgerBoundary` call to fail closed.
- [ ] ACC-4: Existing migration, checkpoint, legacy-read, and non-destructive
  baseline assertions continue to pass unchanged.

## Out of scope

- Reopening or changing TASK-PRF-0092.
- Changing runtime storage, durable allowlists, history, package artifacts,
  npm publishing, or task/event authority.

## Stop rule

Stop if any class relies on `.git/info/exclude`, if either negative fixture
passes the full validator, or if legacy evidence is modified.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create (follow-up coverage gap)","createdAt":"2026-09-14T13:52:00.000Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0093-close-runtime-evidence-boundary-test-coverage-gap.task.md","contentDigest":"sha256:pending-dry-run"} -->
