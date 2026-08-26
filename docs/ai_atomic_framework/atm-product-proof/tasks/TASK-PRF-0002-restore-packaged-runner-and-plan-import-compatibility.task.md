---
task_id: TASK-PRF-0002
title: Restore packaged-runner and plan-import compatibility
status: done
owner: atm-release
priority: P0
series: PRF
series_reason: Closest approved family because this work restores ATM product-proof delivery prerequisites.
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - Frozen and source runner versions and digests are captured before mutation.
    - The 3KLife planning-only exception remains planning-only; implementation occurs in the target repository.
  softRelations: [TASK-PRF-0003]
  changedPublicSeams: [atm-plan-cli, task-card-import, planning-only-route]
  causalImpactEdges:
    - plan-command-is-present-in-published-runner
    - generated-card-round-trips-without-field-loss
    - planning-only-work-remains-in-planning-authority
  parallelFrontierInputs:
    - frozen-runner-source-drift-report
    - causal-graph-import-failure-reproduction
  validatorReferences:
    - test_prf_runner_plan_surface_7d3c1a20
    - test_prf_card_import_fidelity_91e47bd2
    - test_prf_planning_only_route_4b93f85e
  phaseOwner: phase-0-governance-delivery-integrity
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/plan.ts
  - packages/cli/src/commands/command-specs/plan.spec.ts
  - packages/cli/src/commands/tasks/plan-import-boundary.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/next/runner-mode.ts
  - packages/cli/src/commands/next/plan-scoped-preflight.ts
  - scripts/sealed-runner-publication.ts
  - scripts/validate-task-import.ts
  - tests/cli/task-card-causal-graph-authoring.test.ts
  - tests/cli/runner-publication-inventory-parity.test.ts
deliverables:
  - packages/cli/src/commands/plan.ts
  - packages/cli/src/commands/tasks/plan-import-boundary.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/next/plan-scoped-preflight.ts
  - scripts/sealed-runner-publication.ts
  - tests/cli/task-card-causal-graph-authoring.test.ts
  - tests/cli/runner-publication-inventory-parity.test.ts
validators:
  - node --strip-types tests/cli/task-card-causal-graph-authoring.test.ts
  - node --strip-types tests/cli/runner-publication-inventory-parity.test.ts
  - node --strip-types scripts/validate-task-import.ts
testContributions:
  - caseId: test_prf_runner_plan_surface_7d3c1a20
    targetGroupId: null
    semanticKey: packaged_runner_plan_surface
    coversAcceptance: [ACC-1]
    coversImpactEdges: [plan-command-is-present-in-published-runner]
    expectedRedPredicate: Packaged runner rejects the plan command or differs from the source command surface.
    contributionResourceKey: release/atm-onefile/atm.mjs
    responsibility: task-required
    dependencyEdge: frozen-runner-to-source-command-surface
    contractEdge: atm-plan-cli
    resourceKey: packaged-runner
  - caseId: test_prf_card_import_fidelity_91e47bd2
    targetGroupId: null
    semanticKey: plan_card_import_fidelity
    coversAcceptance: [ACC-2, ACC-4]
    coversImpactEdges: [generated-card-round-trips-without-field-loss]
    expectedRedPredicate: A generated card loses or rejects a causalGraph field during same-version import.
    contributionResourceKey: task-card-import
    responsibility: task-required
    dependencyEdge: plan-card-create-to-tasks-import
    contractEdge: task-card-import
    resourceKey: planning-contract
  - caseId: test_prf_planning_only_route_4b93f85e
    targetGroupId: null
    semanticKey: planning_only_authority_route
    coversAcceptance: [ACC-3]
    coversImpactEdges: [planning-only-work-remains-in-planning-authority]
    expectedRedPredicate: A planning-only task requires target-repository mutation authority.
    contributionResourceKey: planning-authority
    responsibility: task-required
    dependencyEdge: planning-intent-to-closure-authority
    contractEdge: planning-only-route
    resourceKey: planning-repo
requiredTestCaseIds:
  - test_prf_runner_plan_surface_7d3c1a20
  - test_prf_card_import_fidelity_91e47bd2
  - test_prf_planning_only_route_4b93f85e
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
  notes: Revert source changes and republish the last verified frozen runner; do not retain a mixed source/frozen release.
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates:
    - atomic_workbench/maps/atm-cli-command-router-map.json
  newScriptsAllowed: false
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-26T23:28:00.844Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-26T23:28:00.844Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-26T23-28-00-844Z-close-952a8484315d"
lastTransitionAt: "2026-08-26T23:28:00.844Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d3312405e6c31caf11eb0d21f6c56854ed038024"
---

# TASK-PRF-0002 Restore packaged-runner and plan-import compatibility

## Intent

Restore one version-consistent planning chain from packaged runner through plan
creation, card generation, import and planning-only route selection.

## Acceptance

- [ ] ACC-1: The released frozen runner exposes the same `plan` command contract as the source runner and publishes a matching digest.
- [ ] ACC-2: A card generated by that release round-trips every declared `causalGraph` field through `tasks import --dry-run` without silent loss or false rejection.
- [ ] ACC-3: Planning-only authoring remains in 3KLife and does not require a target-repository mutation claim.
- [ ] ACC-4: The clean-checkout matrix covers plan doc creation, series lookup, card creation, dry-run import and claim preview using one packaged runner.

## Out of scope

- Product CI redesign, npm public publication, evidence migration and benchmark execution.
- Waiving runner drift or weakening import fidelity checks.

## Stop rule

Stop if source and frozen behavior cannot be made identical without modifying an
unrelated active framework task. Request broker coordination instead of taking
over foreign work.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-20T14:42:25.500Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0002-restore-packaged-runner-and-plan-import-compatibility.task.md","contentDigest":"sha256:0bd14d5607d646cbdcb3b4bac3e274817825f65c21c3e172a547ea7483fcb743"} -->
