---
task_id: TASK-PRF-0006
title: Minimize adopter artifacts and enforce bundle budgets
status: done
owner: atm-release
priority: P1
series: PRF
series_reason: Closest approved family because adopter payload is a measurable ATM product-proof cost.
dependencySemantics: hard-causal/v1
dependencies:
  - taskId: TASK-PRF-0004
    relation: validation
    note: The public package baseline is required to accept a minimized artifact, but a bounded package-manifest proposal can be developed and broker-composed against its sealed base without waiting for publication.
  - taskId: TASK-PRF-0005
    relation: validation
    note: Evidence-ledger migration is required for final acceptance evidence, not for proposal-first work or a bounded shared-surface compose.
causalGraph:
  causalDependencies: []
  startConditions:
    - Phase-2 public package baseline is sealed.
    - New runtime evidence is no longer packed or stored as adopter source content.
  softRelations: [TASK-PRF-0004, TASK-PRF-0005, TASK-PRF-0007]
  changedPublicSeams: [npm-runtime-artifact, onefile-adopter-artifact, developer-kit-artifact]
  causalImpactEdges:
    - every-packed-file-has-runtime-reason
    - developer-kit-is-not-runtime-dependency
    - reduced-artifacts-preserve-clean-install-behavior
  parallelFrontierInputs: [phase-2-pack-baseline, runtime-entrypoint-import-graph]
  validatorReferences:
    - test_prf_artifact_manifest_84d57b20
    - test_prf_bundle_budget_f6ab90e3
    - test_prf_reduced_artifact_equivalence_5e2c1f7a
  phaseOwner: phase-4-adopter-bundle-minimisation
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/package.json
  - scripts/build-package-dist.ts
  - scripts/build-onefile-release.ts
  - scripts/build-root-drop-release.ts
  - scripts/validate-onefile-budget.ts
  - scripts/validate-root-drop-release.ts
  - scripts/validate-adopter-artifact-manifest.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/release-manifest.json
deliverables:
  - packages/cli/package.json
  - scripts/build-package-dist.ts
  - scripts/build-onefile-release.ts
  - scripts/build-root-drop-release.ts
  - scripts/validate-adopter-artifact-manifest.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/release-manifest.json
validators:
  - node --strip-types tests/cli/adopter-artifact-budget.test.ts
  - node --strip-types scripts/validate-onefile-budget.ts
  - node --strip-types scripts/validate-root-drop-release.ts
  - node --strip-types scripts/validate-adopter-artifact-manifest.ts
testContributions:
  - caseId: test_prf_artifact_manifest_84d57b20
    targetGroupId: null
    semanticKey: adopter_artifact_manifest
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [every-packed-file-has-runtime-reason, developer-kit-is-not-runtime-dependency]
    expectedRedPredicate: Artifact contains an orphan file or runtime transitively requires the developer kit.
    contributionResourceKey: adopter-artifact-manifests
    responsibility: task-required
    dependencyEdge: packed-file-to-runtime-entrypoint
    contractEdge: npm-runtime-artifact
    resourceKey: release-manifest
  - caseId: test_prf_bundle_budget_f6ab90e3
    targetGroupId: null
    semanticKey: adopter_bundle_budget
    coversAcceptance: [ACC-3]
    coversImpactEdges: [every-packed-file-has-runtime-reason]
    expectedRedPredicate: Candidate exceeds sealed byte or entry-count budget without owner-approved evidence.
    contributionResourceKey: bundle-budget-report
    responsibility: task-required
    dependencyEdge: artifact-output-to-budget
    contractEdge: onefile-adopter-artifact
    resourceKey: release-artifact
  - caseId: test_prf_reduced_artifact_equivalence_5e2c1f7a
    targetGroupId: null
    semanticKey: reduced_artifact_clean_install_equivalence
    coversAcceptance: [ACC-4]
    coversImpactEdges: [reduced-artifacts-preserve-clean-install-behavior]
    expectedRedPredicate: Reduced artifact fails the same clean-install smoke as the Phase-2 baseline.
    contributionResourceKey: clean-install-equivalence
    responsibility: task-required
    dependencyEdge: artifact-reduction-to-product-behavior
    contractEdge: developer-kit-artifact
    resourceKey: clean-environment
requiredTestCaseIds:
  - test_prf_artifact_manifest_84d57b20
  - test_prf_bundle_budget_f6ab90e3
  - test_prf_reduced_artifact_equivalence_5e2c1f7a
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Restore last clean-install-passing manifests and allowlist; do not relax budgets silently.
atomizationImpact:
  ownerAtomOrMap: atom.npm-package.artifact-budget
  atomCid: cid:atom.npm-package.artifact-budget
  mapUpdates: [atomic_workbench/atoms/ATM-CORE-0007/atom.spec.json]
  newScriptsAllowed: true
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-27T01:56:20.219Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-27T01:56:20.219Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-27T01-56-20-219Z-close-d7d07a04f4fc"
lastTransitionAt: "2026-08-27T01:56:20.219Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0e05913298a797e08edd74d5d288e8a55c0c73bd"
---

# TASK-PRF-0006 Minimize adopter artifacts and enforce bundle budgets

## Intent

Separate the npm runtime, onefile adopter runner and developer kit, then enforce
a reason and budget for every shipped file.

## Acceptance

- [ ] ACC-1: npm runtime, onefile adopter runner and developer kit have distinct manifests and entrypoint ownership.
- [ ] ACC-2: Every packed file maps to a runtime entrypoint; tests, CI fixtures, evidence and duplicate development assets are rejected.
- [ ] ACC-3: Against Phase 2, unpacked CLI bytes fall at least 70%, entry count at least 80%, and root-drop bytes below 25%, unless the owner approves a dependency-level revision.
- [ ] ACC-4: Every reduced artifact passes the same clean-install and smoke contract as the published baseline.

## Out of scope

- Changing user-visible behavior solely to hit a byte target.
- Counting repository checkout size as adopter artifact size.

## Stop rule

Stop reduction when required behavior fails or a packed file cannot be mapped
safely. Budget revision requires measured dependency evidence and owner approval.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-20T14:42:33.920Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0006-minimize-adopter-artifacts-and-enforce-bundle-budgets.task.md","contentDigest":"sha256:c8a5dcb80451a2c6df998bca61b3b39b6de7539c81a4edf8eb6112804ad06dbc"} -->
