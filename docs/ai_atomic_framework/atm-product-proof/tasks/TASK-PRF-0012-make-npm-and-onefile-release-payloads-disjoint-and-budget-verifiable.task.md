---
task_id: TASK-PRF-0012
title: Make npm and onefile release payloads disjoint and budget-verifiable
status: done
owner: atm-release
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-PRF-0011 compact npm runtime remains installable and its scaffold smoke stays green.
    - No external benchmark verdict is inferred from this packaging task.
  softRelations:
    - TASK-PRF-0008 remains independently blocked until external evidence is supplied.
  changedPublicSeams:
    - npm-cli-package-payload
    - onefile-release-payload
    - sealed-release-builder-entrypoint
    - onefile-budget-validator
  causalImpactEdges:
    - npm-and-onefile-inventories-are-disjoint
    - onefile-budget-is-measured-on-the-shipped-surface
    - builder-and-validator-share-one-contract
  parallelFrontierInputs:
    - compact-npm-runtime-manifest
    - onefile-payload-manifest
    - release-prepublish-evidence
  validatorReferences:
    - test_prf_payload_disjointness_4b0b3d1a
    - test_prf_builder_boundary_coherence_2f8c91e0
    - test_prf_release_surface_budget_9a12f3ce
    - test_prf_scope_boundary_no_publish_6d91a2e4
  phaseOwner: phase-3-installable-artifact-and-ci
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - package.json
  - packages/cli/package.json
  - scripts/build-cli-npm-runtime.ts
  - scripts/build-package-dist.ts
  - scripts/build-onefile-release.ts
  - scripts/run-sealed-runner-build.ts
  - scripts/validate-onefile-budget.ts
  - scripts/validate-onefile-release.ts
  - scripts/validate-runner-reproducibility.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - tests/cli/onefile-runtime-closure.test.ts
  - tests/cli/build-release-hygiene.test.ts
  - tests/cli/release-prepublish-gate.test.ts
  - docs/reports/atm-release-surface-budget.md
deliverables:
  - scripts/build-cli-npm-runtime.ts
  - scripts/build-onefile-release.ts
  - scripts/validate-onefile-budget.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - tests/cli/onefile-runtime-closure.test.ts
  - tests/cli/release-prepublish-gate.test.ts
  - docs/reports/atm-release-surface-budget.md
validators:
  - npm run typecheck
  - npm run lint
  - node --strip-types tests/cli/adopter-artifact-budget.test.ts
  - node --strip-types tests/cli/onefile-runtime-closure.test.ts
  - npm run validate:onefile-budget
  - npm run validate:onefile-release
  - npm run validate:runner-reproducibility
  - npm run validate:release-prepublish -- --prior-evidence <sealed-prior-evidence>
testContributions:
  - caseId: test_prf_payload_disjointness_4b0b3d1a
    targetGroupId: null
    semanticKey: npm_and_onefile_payload_disjointness
    coversAcceptance: [ACC-1]
    coversImpactEdges: [npm-and-onefile-inventories-are-disjoint]
    expectedRedPredicate: Onefile payload includes npm-only runtime files or package budget is not enforced on the packed surface.
    contributionResourceKey: release-surface-inventory
    responsibility: task-required
    dependencyEdge: compact-npm-runtime-to-onefile-payload
    contractEdge: npm-cli-package-payload
    resourceKey: payload-manifests
  - caseId: test_prf_builder_boundary_coherence_2f8c91e0
    targetGroupId: null
    semanticKey: sealed_builder_boundary_coherence
    coversAcceptance: [ACC-2]
    coversImpactEdges: [builder-and-validator-share-one-contract]
    expectedRedPredicate: package.json, sealed runner wrapper, and onefile validator disagree about the canonical builder entrypoint.
    contributionResourceKey: sealed-builder-contract
    responsibility: task-required
    dependencyEdge: builder-to-validator-boundary
    contractEdge: sealed-release-builder-entrypoint
    resourceKey: builder-boundary
  - caseId: test_prf_release_surface_budget_9a12f3ce
    targetGroupId: null
    semanticKey: release_surface_budget_and_reproducibility
    coversAcceptance: [ACC-3]
    coversImpactEdges: [onefile-budget-is-measured-on-the-shipped-surface]
    expectedRedPredicate: A rebuilt onefile exceeds 4,500,000 bytes or fails cold/warm startup or reproducibility gates.
    contributionResourceKey: onefile-budget
    responsibility: task-required
    dependencyEdge: payload-inventory-to-budget-verdict
    contractEdge: onefile-budget-validator
    resourceKey: onefile-budget
  - caseId: test_prf_scope_boundary_no_publish_6d91a2e4
    targetGroupId: null
    semanticKey: packaging_task_scope_boundary
    coversAcceptance: [ACC-4]
    coversImpactEdges: []
    expectedRedPredicate: Packaging work emits a publish, protected push, or synthetic external benchmark verdict as completion evidence.
    contributionResourceKey: task-scope-boundary
    responsibility: task-required
    dependencyEdge: packaging-to-external-proof-boundary
    contractEdge: release-surface-budget
    resourceKey: scope-boundary
requiredTestCaseIds:
  - test_prf_payload_disjointness_4b0b3d1a
  - test_prf_builder_boundary_coherence_2f8c91e0
  - test_prf_release_surface_budget_9a12f3ce
  - test_prf_scope_boundary_no_publish_6d91a2e4
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
  notes: Revert the packaging-contract change and restore the last sealed runner; never raise the byte budget or remove the failing validator to obtain green output.
atomizationImpact:
  ownerAtomOrMap: atm.release-surface-budget-map
  mapUpdates:
    - atomic_workbench/maps/atm-release-surface-budget-map.json
  extractionCandidates:
    - atom: atm.release-payload-inventory
      pattern: Policy Object
      source: scripts/build-cli-npm-runtime.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-10T23:29:51.789Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-10T23:29:51.789Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-10T23-29-51-789Z-close-230e63753328"
lastTransitionAt: "2026-09-10T23:29:51.789Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3c59eda46c7dea444a72ad0353effb17f703df4b"
---

# TASK-PRF-0012 Make npm and onefile release payloads disjoint and budget-verifiable

## Intent

The external product-proof audit reproduced two distinct packaging failures:
the compact npm runtime is small enough to be a viable installable surface, but
the portable onefile build embeds overlapping npm/runtime payloads and exceeds
its 4.5 MB budget; at the same time, the sealed runner wrapper and the budget
validator disagree about the canonical builder entrypoint. This card makes the
two release surfaces explicit, disjoint, reproducible, and independently
budgeted. It does not publish, push, or infer any external A/B result.

## Acceptance

- [ ] **ACC-1 — Disjoint payloads:** the npm tarball and portable onefile have
  separate manifests; onefile excludes npm-only runtime payloads and its packed
  surface remains at or below 4,500,000 bytes without forbidden development
  files.
- [ ] **ACC-2 — Single builder contract:** package scripts, sealed runner
  publication, release manifest, and `validate-onefile-budget` resolve the same
  canonical builder entrypoint; boundary drift is detected by a focused test.
- [ ] **ACC-3 — Reproducible release proof:** clean rebuilds pass onefile size,
  cold/warm startup, clean-install, and runner-reproducibility gates; release
  prepublish consumes sealed prior evidence and does not treat missing evidence
  as green.
- [ ] **ACC-4 — No scope laundering:** no npm publish, protected push, or
  external benchmark verdict is part of this card's closure.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-10T22:53:02.889Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0012-make-npm-and-onefile-release-payloads-disjoint-and-budget-verifiable.task.md","contentDigest":"sha256:31234aa06835480e53ea5dd1e159f8e96d7caab78989a8223c928d759709c12a"} -->
