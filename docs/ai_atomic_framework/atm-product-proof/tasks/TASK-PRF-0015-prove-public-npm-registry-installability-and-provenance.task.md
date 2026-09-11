---
task_id: TASK-PRF-0015
title: Prove public npm registry installability and provenance
status: done
owner: atm-release
priority: P0
depends_on: [TASK-PRF-0013, TASK-PRF-0014]
causalGraph:
  causalDependencies: [TASK-PRF-0013, TASK-PRF-0014]
  startConditions:
    - Owner-approved npm organization ownership, provenance policy, and publish authorization exist.
    - Protected-main Product CI is green for the release candidate.
    - A concrete package name and immutable version are supplied to the validator.
  softRelations: [TASK-PRF-0008]
  changedPublicSeams: [public-npm-install-proof]
  causalImpactEdges:
    - registry-artifact-is-resolvable
    - clean-consumer-uses-public-tarball
    - provenance-digest-is-reproducible
  parallelFrontierInputs:
    - public-package-name-and-version
    - npm-registry-metadata
    - provenance-attestation
  validatorReferences:
    - test_prf_public_registry_lookup_contract_5c1a7e3f
    - test_prf_public_clean_consumer_install_8d4b2a10
    - test_prf_public_provenance_report_6f9c3b22
  phaseOwner: phase-2-public-npm-delivery
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - package.json
  - scripts/validate-public-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-install-proof.md
deliverables:
  - package.json
  - scripts/validate-public-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-install-proof.md
validators:
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - npm run validate:public-npm-install -- --package @ai-atomic-framework/cli --version 0.1.0 --record-blocked --output docs/reports/atm-public-npm-install-proof.md
testContributions:
  - caseId: test_prf_public_registry_lookup_contract_5c1a7e3f
    targetGroupId: null
    semanticKey: public_registry_lookup_contract
    coversAcceptance: [ACC-1, ACC-4]
    coversImpactEdges: [registry-artifact-is-resolvable]
    expectedRedPredicate: A missing or mutable public registry artifact is treated as installable or replaced with a local tarball.
    contributionResourceKey: public-npm-validator
    responsibility: task-required
    dependencyEdge: package-version-to-registry-lookup
    contractEdge: public-npm-install-proof
    resourceKey: npm-registry
  - caseId: test_prf_public_clean_consumer_install_8d4b2a10
    targetGroupId: null
    semanticKey: public_clean_consumer_install
    coversAcceptance: [ACC-2]
    coversImpactEdges: [clean-consumer-uses-public-tarball]
    expectedRedPredicate: The consumer installs via workspace, file path, link, or framework checkout instead of the public registry tarball.
    contributionResourceKey: public-consumer-smoke
    responsibility: task-required
    dependencyEdge: registry-lookup-to-consumer-install
    contractEdge: public-npm-install-proof
    resourceKey: clean-consumer
  - caseId: test_prf_public_provenance_report_6f9c3b22
    targetGroupId: null
    semanticKey: public_provenance_report
    coversAcceptance: [ACC-3]
    coversImpactEdges: [provenance-digest-is-reproducible]
    expectedRedPredicate: Report claims provenance without an immutable registry tarball digest and npm metadata snapshot.
    contributionResourceKey: public-provenance-report
    responsibility: task-required
    dependencyEdge: registry-tarball-to-provenance
    contractEdge: public-npm-install-proof
    resourceKey: provenance
requiredTestCaseIds:
  - test_prf_public_registry_lookup_contract_5c1a7e3f
  - test_prf_public_clean_consumer_install_8d4b2a10
  - test_prf_public_provenance_report_6f9c3b22
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert validator and report changes together; never delete public registry history or rewrite provenance.
atomizationImpact:
  ownerAtomOrMap: atm.release-build-map
  mapUpdates:
    - atomic_workbench/maps/atm-release-build/map.spec.json
  newScriptsAllowed: true
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-11T00:09:11.463Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-11T00:09:11.463Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-11T00-09-11-463Z-close-5a99980d2359"
lastTransitionAt: "2026-09-11T00:09:11.463Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "002823e79d2cf728eeb8d41771bbd5aae6c4d7e0"
---

# TASK-PRF-0015 Prove public npm registry installability and provenance

## Intent

Prove that a clean, untrusted consumer can install the exact ATM package from
the public npm registry and reproduce its metadata and tarball digest. A 404,
missing ownership, missing provenance, or absent credentials is a blocked or
inconclusive result—not permission to substitute a local tarball.

## Acceptance

- [ ] ACC-1: `npm view` resolves the exact package name/version and records registry metadata, or the report records a fail-closed 404.
- [ ] ACC-2: A fresh temporary consumer installs the exact registry tarball with no workspace link, `file:` path, or framework checkout and executes `atm --version`.
- [ ] ACC-3: The report binds the public tarball SHA-256, package version, registry URL, provenance metadata and command output digest.
- [ ] ACC-4: The report explicitly separates public-registry evidence from local `npm pack` evidence and never claims public installability while the package is absent.

## Stop rule

Do not publish, rotate credentials, or change npm access policy in this card
without an explicit owner authorization. If any external prerequisite is
missing, emit a command-backed blocked/inconclusive report and keep the
product-proof plan open.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-10T23:58:50.501Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0015-prove-public-npm-registry-installability-and-provenance.task.md","contentDigest":"sha256:a1dd25145c96bde669825af8e8a4818972704397e7d602ef136c93363d89201b"} -->
