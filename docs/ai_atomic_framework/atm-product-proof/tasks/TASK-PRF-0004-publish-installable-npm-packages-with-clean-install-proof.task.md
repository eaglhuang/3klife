---
task_id: TASK-PRF-0004
title: Publish installable npm packages with clean-install proof
status: done
owner: atm-release
priority: P0
series: PRF
series_reason: Closest approved family because public installation is a primary ATM product-proof gate.
dependencySemantics: hard-causal/v1
dependencies:
  - taskId: TASK-PRF-0003
    relation: validation
    note: Required product CI burn-in is a release-acceptance input; package proposals and isolated validation may start against the current interface and must compose fail-closed if the input is not proven.
causalGraph:
  causalDependencies: []
  startConditions:
    - Required product CI is protected and has completed its burn-in.
    - npm organization ownership, package access and credential rotation owner are explicitly confirmed.
  softRelations: [TASK-PRF-0003, TASK-PRF-0006]
  changedPublicSeams: [npm-package-topology, clean-install-contract, public-release-provenance]
  causalImpactEdges:
    - every-runtime-dependency-resolves-from-registry
    - packed-artifact-contains-only-allowed-runtime-files
    - public-tarball-passes-clean-external-install
  parallelFrontierInputs: [npm-ownership-decision, package-dependency-closure-report]
  validatorReferences:
    - test_prf_npm_dependency_closure_6c8ed104
    - test_prf_pack_allowlist_20aee39b
    - test_prf_clean_registry_install_f3c9b174
  phaseOwner: phase-2-public-npm-delivery
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - package.json
  - packages/cli/package.json
  - packages/create-atm/package.json
  - packages/create-atm/src/index.ts
  - .github/workflows/release-npm.yml
  - scripts/build-package-dist.ts
  - scripts/validate-package-skeleton.ts
  - scripts/validate-npm-clean-install.ts
  - tests/cli/npm-clean-install.test.ts
  - docs/release-trust-ops.md
deliverables:
  - packages/cli/package.json
  - packages/create-atm/package.json
  - .github/workflows/release-npm.yml
  - scripts/validate-npm-clean-install.ts
  - tests/cli/npm-clean-install.test.ts
  - docs/release-trust-ops.md
validators:
  - node --strip-types scripts/validate-package-skeleton.ts
  - node --strip-types tests/cli/npm-clean-install.test.ts
  - node --strip-types scripts/validate-npm-clean-install.ts
testContributions:
  - caseId: test_prf_npm_dependency_closure_6c8ed104
    targetGroupId: null
    semanticKey: npm_dependency_closure
    coversAcceptance: [ACC-1]
    coversImpactEdges: [every-runtime-dependency-resolves-from-registry]
    expectedRedPredicate: A public package depends on a workspace-only or unpublished runtime package.
    contributionResourceKey: npm-package-graph
    responsibility: task-required
    dependencyEdge: public-package-to-runtime-dependency
    contractEdge: npm-package-topology
    resourceKey: npm-registry
  - caseId: test_prf_pack_allowlist_20aee39b
    targetGroupId: null
    semanticKey: npm_pack_allowlist
    coversAcceptance: [ACC-2]
    coversImpactEdges: [packed-artifact-contains-only-allowed-runtime-files]
    expectedRedPredicate: npm pack contains source tests, private evidence, fixtures or development-only scripts.
    contributionResourceKey: npm-pack-manifest
    responsibility: task-required
    dependencyEdge: package-files-to-runtime-entrypoints
    contractEdge: npm-package-topology
    resourceKey: npm-tarball
  - caseId: test_prf_clean_registry_install_f3c9b174
    targetGroupId: null
    semanticKey: clean_registry_install
    coversAcceptance: [ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [public-tarball-passes-clean-external-install]
    expectedRedPredicate: Exact tarball cannot install from isolated or public registry and complete the smoke workflow.
    contributionResourceKey: clean-install-receipt
    responsibility: task-required
    dependencyEdge: published-tarball-to-adopter-smoke
    contractEdge: clean-install-contract
    resourceKey: clean-environment
requiredTestCaseIds:
  - test_prf_npm_dependency_closure_6c8ed104
  - test_prf_pack_allowlist_20aee39b
  - test_prf_clean_registry_install_f3c9b174
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: deprecate-release-and-revert-commit
  notes: Deprecate a broken prerelease, restore the prior dist-tag and revert the release commit; never overwrite a version.
atomizationImpact:
  ownerAtomOrMap: atom.npm-package.runtime-allowlist
  atomCid: cid:atom.npm-package.runtime-allowlist
  mapUpdates: [atomic_workbench/atoms/ATM-CORE-0006/atom.spec.json]
  newScriptsAllowed: true
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-29T16:27:15.993Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-29T16:27:15.993Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-29T16-27-15-993Z-close-bb2690734418"
lastTransitionAt: "2026-08-29T16:27:15.993Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "976754ed7be986416afe9f31ff20970ff99a329f"
---

# TASK-PRF-0004 Publish installable npm packages with clean-install proof

## Intent

Publish a coherent, provenance-bound npm release whose exact artifact installs
and runs on a clean external machine without workspace links.

## Acceptance

- [ ] ACC-1: Every supported public package and runtime dependency resolves from the registry as one coherent version set.
- [ ] ACC-2: `npm pack` matches an allowlist and excludes tests, fixtures, private evidence and development-only files.
- [ ] ACC-3: The exact candidate passes `--help`, `init`, one documented governed smoke flow and cleanup in a temporary registry.
- [ ] ACC-4: A prerelease is independently installed from public npm and reports the expected version and digest.
- [ ] ACC-5: Stable promotion requires fresh external clean-install proof and explicit human publication approval.

## Out of scope

- Bundle-size optimization beyond clearly invalid package contents.
- Publishing when package ownership or credential authority is unavailable.

## Stop rule

Stop if any runtime dependency is unpublished, ownership is unknown, provenance
is missing, or the candidate differs from the independently tested artifact.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-20T14:42:29.617Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0004-publish-installable-npm-packages-with-clean-install-proof.task.md","contentDigest":"sha256:75e04d5ac83158b8d8bcec929bd57bb6e023ccd8459d526f29470966515a0c1a"} -->
