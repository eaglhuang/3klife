---
task_id: ATM-GOV-0370
title: Bind runner publication outputs to producer authority before taskflow close bundling
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions: ["A taskflow close dry-run includes runner publication outputs not owned by the closing task."]
  softRelations: [ATM-GOV-0362, ATM-GOV-0363]
  changedPublicSeams: [atm.runnerPublicationOutputAuthority.v1]
  causalImpactEdges: [own-runner-output-enters-own-close-bundle, foreign-runner-output-is-preserved-and-excluded, close-diagnostic-shares-producer-snapshot]
  parallelFrontierInputs: [runner-publication-receipt, framework-temp-lock, taskflow-close-bundle]
  validatorReferences: [taskflow-close-runner-output-ownership]
  phaseOwner: wave-3-governance-substrate-recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/current-task-close-evidence.ts
  - packages/cli/src/commands/framework-development/framework-temp-publication-capability.ts
  - packages/cli/src/commands/taskflow/__tests__/runner-publication-bundle-authority.spec.ts
deliverables:
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/current-task-close-evidence.ts
  - packages/cli/src/commands/framework-development/framework-temp-publication-capability.ts
  - packages/cli/src/commands/taskflow/__tests__/runner-publication-bundle-authority.spec.ts
validators:
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/runner-publication-bundle-authority.spec.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0370_own_runner_output_is_bound_to_producer
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: own_runner_publication_output_is_accepted_from_canonical_producer_snapshot
    coversAcceptance: [ACC-1]
    coversImpactEdges: [own-runner-output-enters-own-close-bundle]
    expectedRedPredicate: own runner output cannot be attributed consistently across publication and close bundle consumers
    contributionResourceKey: runner-publication-output-authority
    responsibility: task-required
    dependencyEdge: ATM-GOV-0369
    contractEdge: atm.runnerPublicationOutputAuthority.v1
    resourceKey: taskflow-close-runner-output-ownership
  - caseId: test_atm_gov_0370_foreign_runner_output_excluded
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: foreign_runner_publication_output_never_enters_consumer_close_bundle
    coversAcceptance: [ACC-2, ACC-3]
    coversImpactEdges: [foreign-runner-output-is-preserved-and-excluded, close-diagnostic-shares-producer-snapshot]
    expectedRedPredicate: foreign producer runner artifacts enter a consumer close bundle or are mutated
    contributionResourceKey: runner-publication-output-authority
    responsibility: task-required
    dependencyEdge: ATM-GOV-0369
    contractEdge: atm.runnerPublicationOutputAuthority.v1
    resourceKey: taskflow-close-runner-output-ownership
requiredTestCaseIds: [test_atm_gov_0370_own_runner_output_is_bound_to_producer, test_atm_gov_0370_foreign_runner_output_excluded]
tddMode: required
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert producer authority filtering and the focused fixtures together; never delete foreign runner output as recovery.
atomizationImpact:
  ownerAtomOrMap: atm.runner-publication-output-authority
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-15T09:09:26.182Z"
completed_by_agent: "cursor-captain"
closedAt: "2026-08-15T09:09:26.182Z"
closedByActor: "cursor-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-15T09-09-26-182Z-close-1164ef368e69"
lastTransitionAt: "2026-08-15T09:09:26.182Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2bbce6c359462c4a812cde1a47bd10704674defb"
---

# ATM-GOV-0370 Bind runner publication outputs to producer authority before taskflow close bundling

## Intent

Make taskflow close consume one canonical, producer-attributed runner-publication
output snapshot. A consumer may stage only outputs produced for its own authority.

## Acceptance

- ACC-1 Producer authority is durable, digest-bound, and shared by publication
  capability, close-evidence discovery, and bundle assembly.
- ACC-2 A foreign active, released, or framework-temp producer output remains
  byte-preserved and excluded from the consumer bundle.
- ACC-3 The close preview emits one actionable ownership diagnostic rather than
  attempting a foreign commit; own output remains stageable.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-14T00:28:12.713Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0370-bind-runner-publication-outputs-to-producer-authority-before-taskflow-close-bundling.task.md","contentDigest":"sha256:9014271ee6f2948e519b9b5607d7d18f6ee835c1293200fb55d3caf7ccdcf88c"} -->
