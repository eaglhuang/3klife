---
task_id: TASK-PRF-0128
title: Make four-plan report review tests concurrency-safe
status: planned
owner: atm-product-proof
priority: P2
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - Implementation checkout is GitHub-main SHA 2205ffa767b8adf4b0d70cb2371865169610bd1c or a descendant and contains both writer and reader tests.
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges:
    - concurrent-cli-reader-does-not-observe-mutating-charter-report
  parallelFrontierInputs: []
  validatorReferences:
    - test_task_prf_0128_charter_write_isolated_5a9e3d62
  phaseOwner: null
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - tests/cli/four-plan-charter-current-verdict.test.ts
deliverables:
  - tests/cli/four-plan-charter-current-verdict.test.ts
validators:
  - node --strip-types tests/cli/four-plan-charter-current-verdict.test.ts
  - node --strip-types tests/cli/four-plan-objective-authority-review.test.ts
  - node --strip-types scripts/run-cli-test-sweep.ts
testContributions:
  - caseId: test_task_prf_0128_charter_write_isolated_5a9e3d62
    targetGroupId: null
    semanticKey: charter_verdict_refresh_uses_private_test_output
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [concurrent-cli-reader-does-not-observe-mutating-charter-report]
    expectedRedPredicate: "The charter-verdict test refreshes the canonical tracked JSON in place, changing its mtime during a test run."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: cli-test-private-output
    resourceKey: charter-current-verdict-report
requiredTestCaseIds:
  - test_task_prf_0128_charter_write_isolated_5a9e3d62
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - tdd-oracle-fidelity
evidence:
  required: red-green-focused-tests-cli-sweep-and-canonical-report-unchanged
rollback:
  strategy: revert-commit
  notes: Revert only the charter test isolation change; do not alter the report or CI concurrency configuration.
atomizationImpact:
  ownerAtomOrMap: atom-cli-router
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0128 Make four-plan report review tests concurrency-safe

## Intent

The 2026-09-26 Product CI run failed in the CLI test sweep at the same source
SHA that passed on adjacent scheduled runs. The charter-verdict test refreshes a
tracked JSON report in write mode while a concurrent authority-review test
reads related inputs. This is a plausible race, not a proven explanation of the
historical failure. Remove the test-owned shared-file write using the validator's
existing `--input` option; do not add production behavior or serialization.

## Acceptance

- [ ] ACC-1: Refresh and validation run against a temporary copy of the report;
      the test cleans its temporary directory in `finally`.
- [ ] ACC-2: The canonical report's bytes and high-resolution modification time
      are unchanged across the test, including on failure paths.
- [ ] ACC-3: Both focused tests pass individually and the configured concurrent
      CLI test sweep passes without changing concurrency or adding a gate.

## Scope and method

Only `tests/cli/four-plan-charter-current-verdict.test.ts` may change. First add
an assertion that exposes the current tracked-file write, then route write and
validate through a unique absolute temporary `--input` path. Do not change the
validator, the reader test, the report, sweep scheduling, or production code.

The expected product effect is zero tracked report mutations from this test and
removal of one shared-write/read race opportunity. Record the sweep result, but
do not claim this proves the cause of the historical CI failure unless a
reproduction establishes that link.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-29T02:10:30.364Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0128-make-four-plan-report-review-tests-concurrency-safe.task.md","contentDigest":"sha256:deae61069f880f9bb0b000f2b4155ee938e332a1c6068163181b1fb2ef6943fd"} -->
