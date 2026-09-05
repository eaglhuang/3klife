---
task_id: ATM-GOV-0412
title: Enforce runner compatibility digest before governed writes
status: planned
owner: atm-git-governance
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - Existing ATM-BUG-2026-08-14-009 source repair and frozen publication remain valid.
  softRelations:
    - ATM-BUG-2026-08-14-009
  changedPublicSeams:
    - governed task-scoped commit admission
    - runner-sync compatibility evidence
  causalImpactEdges:
    - runner-compatibility-before-write
    - owned-recover-push-timeout
  parallelFrontierInputs: []
  validatorReferences:
    - runner-publication-disposition-gate
    - runner-sync-framework-temp-hotfix
  phaseOwner: null
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - packages/cli/src/commands/git-governance/record-only-block-lifecycle-bridge.ts
  - tests/cli/runner-compatibility-digest-precondition.test.ts
  - tests/cli/recover-push-fail-timeout.test.ts
deliverables:
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - packages/cli/src/commands/git-governance/record-only-block-lifecycle-bridge.ts
  - tests/cli/runner-compatibility-digest-precondition.test.ts
  - tests/cli/recover-push-fail-timeout.test.ts
validators:
  - node --strip-types tests/cli/runner-compatibility-digest-precondition.test.ts
  - node --strip-types tests/cli/recover-push-fail-timeout.test.ts
  - node --strip-types tests/cli/runner-publication-disposition-gate.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_runner_compatibility_digest_precondition_6d5e9a41
    targetGroupId: null
    semanticKey: runner_compatibility_digest_precondition
    coversAcceptance: [ACC-1]
    coversImpactEdges: [runner-compatibility-before-write]
    expectedRedPredicate: a frozen runner with a mismatched public transaction contract is rejected before staging or commit
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: runner-compatibility-contract
    resourceKey: null
  - caseId: test_recover_push_owned_timeout_8b3f2c10
    targetGroupId: null
    semanticKey: recover_push_owned_timeout
    coversAcceptance: [ACC-2]
    coversImpactEdges: [owned-recover-push-timeout]
    expectedRedPredicate: a recover-push failure stops owned child processes and emits a durable bounded timeout receipt
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: recover-push-timeout-contract
    resourceKey: null
requiredTestCaseIds:
  - test_runner_compatibility_digest_precondition_6d5e9a41
  - test_recover_push_owned_timeout_8b3f2c10
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
  notes: Revert the compatibility admission and focused regressions together; preserve the prior published runner and timeout boundary.
atomizationImpact:
  ownerAtomOrMap: atm-release-build
  mapUpdates:
    - atomic_workbench/maps/atm-release-build/map.spec.json
  extractionCandidates:
    - atom: atm.runner-sync-admission
      pattern: Policy Object
      source: packages/cli/src/commands/framework-development/runner-sync-admission.ts
      disposition: inline
      inlineReason: Existing runner-sync admission seam is below the extraction threshold and already owns the compatibility decision.
errorCodes: []
