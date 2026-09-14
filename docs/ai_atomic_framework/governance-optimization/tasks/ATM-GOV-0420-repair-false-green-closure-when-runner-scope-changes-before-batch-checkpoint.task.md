---
task_id: ATM-GOV-0420
title: Repair false-green closure when runner scope changes before batch checkpoint
status: done
owner: atm-governance-captain
priority: P0
depends_on: []
causalGraph:
  causalDependencies:
    - TASK-PRF-0050 reproduces a valid candidate delivery that cannot reach batch checkpoint because the frozen runner seal is computed against a different source snapshot.
  startConditions:
    - The PRF-0050 candidate receipt, runner-sync receipt, and stale-runner checkpoint output remain available as read-only evidence.
  softRelations:
    - ATM-GOV-0345 is historical context only; its closure packet must not be treated as proof that this defect is fixed.
    - TASK-PRF-0050 remains independently provenance-preserving.
  changedPublicSeams:
    - atm.runnerSourceImpact.v1
    - atm.batchCheckpointCandidateSeal.v1
    - atm.closureDeliveryProvenance.v1
  causalImpactEdges:
    - dirty-runner-scope-change -> checkpoint-admission
    - checkpoint-admission -> close-before-commit-deadlock
    - closure-packet -> delivery-commit-file-coverage
  parallelFrontierInputs:
    - immutable candidate source snapshot (index or equivalent governed snapshot)
    - runner-sync broker receipt when publication is actually required
    - task delivery commit and its declared file set
  validatorReferences:
    - test_atm_gov_0420_runner_scope_impact_classification
    - test_atm_gov_0420_checkpoint_candidate_snapshot
    - test_atm_gov_0420_closure_delivery_file_coverage
    - validate:cli
  phaseOwner: Wave 3 governance recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/batch/implementation.ts
  - packages/cli/src/commands/batch/runner-recovery-forwarding.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
  - scripts/AtmCore/runner-build-scope.json
  - tests/cli/batch-checkpoint-runner-sync-recovery.test.ts
  - tests/cli/batch-checkpoint-candidate-snapshot.test.ts
  - tests/cli/closure-delivery-file-coverage.test.ts
  - tests/cli/frozen-runner-validation-foreign-state.test.ts
deliverables:
  - packages/cli/src/commands/batch/implementation.ts
  - packages/cli/src/commands/batch/runner-recovery-forwarding.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
  - scripts/AtmCore/runner-build-scope.json
  - tests/cli/batch-checkpoint-runner-sync-recovery.test.ts
  - tests/cli/batch-checkpoint-candidate-snapshot.test.ts
  - tests/cli/closure-delivery-file-coverage.test.ts
  - tests/cli/frozen-runner-validation-foreign-state.test.ts
validators:
  - node --strip-types tests/cli/batch-checkpoint-runner-sync-recovery.test.ts
  - node --strip-types tests/cli/batch-checkpoint-candidate-snapshot.test.ts
  - node --strip-types tests/cli/closure-delivery-file-coverage.test.ts
  - node --strip-types tests/cli/frozen-runner-validation-foreign-state.test.ts
  - npm run typecheck
  - npm run validate:cli
  - ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
testContributions:
  - caseId: test_atm_gov_0420_runner_scope_impact_classification
    targetGroupId: null
    semanticKey: runner_scope_impact_is_data_driven
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [dirty-runner-scope-change -> checkpoint-admission]
    expectedRedPredicate: a non-runtime package-script change is treated as runner-affecting and blocks checkpoint, or a runtime source change is incorrectly allowed without a fresh runner.
    contributionResourceKey: runner-source-impact
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.runnerSourceImpact.v1
    resourceKey: runner-source-impact
  - caseId: test_atm_gov_0420_checkpoint_candidate_snapshot
    targetGroupId: null
    semanticKey: checkpoint_has_non_circular_candidate_seal
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [checkpoint-admission -> close-before-commit-deadlock]
    expectedRedPredicate: a valid staged candidate requires a frozen runner built from an unreachable clean HEAD, so checkpoint deadlocks or accepts an unbound runner.
    contributionResourceKey: batch-checkpoint-candidate-seal
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.batchCheckpointCandidateSeal.v1
    resourceKey: batch-checkpoint-candidate-seal
  - caseId: test_atm_gov_0420_closure_delivery_file_coverage
    targetGroupId: null
    semanticKey: closure_packet_matches_delivery_commit
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: [closure-packet -> delivery-commit-file-coverage]
    expectedRedPredicate: a task closes with a successful ledger and evidence packet although the delivery commit does not contain the files required by the card acceptance contract.
    contributionResourceKey: closure-delivery-provenance
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.closureDeliveryProvenance.v1
    resourceKey: closure-delivery-provenance
  - caseId: test_atm_gov_0420_frozen_runner_and_foreign_state
    targetGroupId: null
    semanticKey: frozen_runner_validation_preserves_foreign_state
    coversAcceptance: [ACC-7]
    coversImpactEdges: [checkpoint-admission -> close-before-commit-deadlock]
    expectedRedPredicate: a sealed runner validation or checkpoint attempt changes foreign staged entries or passes without a matching frozen-runner receipt.
    contributionResourceKey: frozen-runner-validation
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.batchCheckpointCandidateSeal.v1
    resourceKey: frozen-runner-validation
requiredTestCaseIds:
  - test_atm_gov_0420_runner_scope_impact_classification
  - test_atm_gov_0420_checkpoint_candidate_snapshot
  - test_atm_gov_0420_closure_delivery_file_coverage
  - test_atm_gov_0420_frozen_runner_and_foreign_state
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
  - contract-migration
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert candidate-seal and closure-provenance changes together; rebuild the frozen runner from reverted committed HEAD and preserve PRF-0050 failure evidence.
errorCodes:
  - code: ATM_RUNNER_STALE_WRITE_REFUSED
    disposition: reuse
    category: runner-freshness
    trigger: a behavior-dependent write observes a runner source seal that does not match the governed candidate snapshot
    retryable: true
    requiresHumanApproval: false
    recovery: ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
    sourceOwner: packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
    registryOwnerTask: existing
    tests: [test_atm_gov_0420_checkpoint_candidate_snapshot]
  - code: ATM_RUNNER_SYNC_REQUIRED
    disposition: reuse
    category: runner-freshness
    trigger: a frozen runner must be rebuilt before behavior-dependent governed actions
    retryable: true
    requiresHumanApproval: false
    recovery: ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
    sourceOwner: packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
    registryOwnerTask: existing
    tests: [test_atm_gov_0420_runner_scope_impact_classification]
atomizationImpact:
  ownerAtomOrMap: atm.runner-source-impact-and-checkpoint-admission
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runner-source-impact-policy
      pattern: Policy Object
      source: packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
      disposition: extract
      inlineReason: null
    - atom: atm.batch-checkpoint-candidate-seal
      pattern: Adapter/Port
      source: packages/cli/src/commands/batch/implementation.ts
      disposition: extract
      inlineReason: null
    - atom: atm.closure-delivery-provenance
      pattern: Result Contract Object
      source: packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
      disposition: extract
      inlineReason: null
createdByCommand: atm plan card create
completed_at: "2026-09-14T00:30:05.973Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-14T00:30:05.973Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T00-30-05-973Z-close-233fa292fbf0"
lastTransitionAt: "2026-09-14T00:30:05.973Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "080e3d69b84aff94ae9c56857ed378562c1b2e02"
---

# ATM-GOV-0420 Repair false-green closure when runner scope changes before batch checkpoint

## Intent

Repair the general circularity exposed by TASK-PRF-0050: batch checkpoint
must decide runner freshness against one immutable, attributable candidate
snapshot, while closure evidence must prove that the delivery commit contains
the files whose acceptance was evaluated. A task ledger transition, runner
receipt, or emergency commit flag alone is never product-delivery proof.

The repair must distinguish a change that can affect the published runner from
an npm-script, test, report, or governance-only change that cannot. When a
runner-affecting change is present, the normal path must offer a bounded
candidate-seal/publication continuation rather than requiring an unreachable
post-commit state before the pre-commit checkpoint. The existing stale-runner
error remains fail-closed for an unbound or altered candidate.

## Acceptance

- [ ] ACC-1: Runner-impact classification is data-driven from the declared runner build scope; it does not hard-code PRF-0050, a task id, or one file name.
- [ ] ACC-2: A non-runtime package-script/report/test change cannot create a false runner-stale blocker, while an actual runner-affecting source change remains fail-closed until its candidate seal is verified.
- [ ] ACC-3: Checkpoint consumes one immutable candidate source snapshot and records its digest, source availability, actor/lane, and runner relationship in command-backed evidence.
- [ ] ACC-4: A runner-affecting candidate has a non-circular governed continuation: either the runner is sealed from that candidate before checkpoint, or a receipt-bound continuation can complete publication/close without reopening or reclaiming the task. No emergency bypass is required for the normal path.
- [ ] ACC-5: Closure provenance verifies that the actual delivery commit contains the declared task deliverables and rejects the historical false-green shape where only unrelated files were committed.
- [ ] ACC-6: Focused tests reproduce the PRF-0050 red predicate and then pass on the same candidate lineage; no raw Git mutation, task-specific allowlist, or `ATM-Emergency` evidence is accepted as completion.
- [ ] ACC-7: `validate:cli`, typecheck, and frozen-runner validation pass after a governed sealed build; foreign staged state and unrelated WIP remain byte-identical.

## Implementation boundary

This card is a governance repair, not a new package bundler or benchmark card.
It must not change npm publish policy, the external A/B protocol, the hidden
oracle, or the PRF-0050 candidate evidence. Any required change to those areas
is a separate successor card.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T17:58:02.528Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0420-repair-false-green-closure-when-runner-scope-changes-before-batch-checkpoint.task.md","contentDigest":"sha256:34d7c48c43aff188b602931398131103b4eae94fbd1b35c0884c56364a9d539e"} -->
