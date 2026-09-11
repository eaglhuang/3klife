---
task_id: TASK-PRF-0016
title: Repair and reverify public beta npm install
status: done
owner: atm-release
priority: P0
depends_on:
  - TASK-PRF-0015
  - TASK-PRF-0014
causalGraph:
  causalDependencies:
    - TASK-PRF-0015
    - TASK-PRF-0014
  startConditions:
    - Owner-approved npm publication and provenance authorization exists for a new immutable beta version.
    - A protected-main Product CI green release candidate is available.
    - The candidate runtime closure is built from the current source and passes isolated local clean-install smoke.
  softRelations:
    - TASK-PRF-0008
  changedPublicSeams:
    - public-npm-cli-beta-install
  causalImpactEdges:
    - public-workspace-dependencies-resolve
    - public-runtime-closure-starts
    - registry-provenance-is-reproducible
  parallelFrontierInputs:
    - npm-public-beta-version
    - isolated-consumer
    - release-runtime-closure
  validatorReferences:
    - test_prf_public_beta_dependency_resolution_1a7c4e90
    - test_prf_public_beta_runtime_startup_2b8d5f01
    - test_prf_public_beta_provenance_3c9e6a12
  phaseOwner: phase-2-public-npm-delivery
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/build-package-dist.ts
  - scripts/validate-public-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
  - .github/workflows/release-npm.yml
deliverables:
  - scripts/build-package-dist.ts
  - scripts/validate-public-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
  - .github/workflows/release-npm.yml
validators:
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types scripts/validate-npm-clean-install.ts
  - npm run validate:public-npm-install -- --package @ai-atomic-framework/cli --version 0.1.0-beta.2 --output docs/reports/atm-public-npm-install-proof-beta.md
testContributions:
  - caseId: test_prf_public_beta_dependency_resolution_1a7c4e90
    targetGroupId: null
    semanticKey: public_beta_dependency_resolution
    coversAcceptance: [ACC-1]
    coversImpactEdges: [public-workspace-dependencies-resolve]
    expectedRedPredicate: Published beta dependencies point at unavailable stable workspace versions.
    contributionResourceKey: public-npm-validator
    responsibility: task-required
    dependencyEdge: registry-package-to-workspace-dependency
    contractEdge: public-npm-cli-beta-install
    resourceKey: npm-registry
  - caseId: test_prf_public_beta_runtime_startup_2b8d5f01
    targetGroupId: null
    semanticKey: public_beta_runtime_startup
    coversAcceptance: [ACC-2]
    coversImpactEdges: [public-runtime-closure-starts]
    expectedRedPredicate: Isolated public beta install cannot execute atm --version because a runtime closure module is missing.
    contributionResourceKey: public-consumer-smoke
    responsibility: task-required
    dependencyEdge: package-install-to-runtime-startup
    contractEdge: public-npm-cli-beta-install
    resourceKey: clean-consumer
  - caseId: test_prf_public_beta_provenance_3c9e6a12
    targetGroupId: null
    semanticKey: public_beta_provenance
    coversAcceptance: [ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [registry-provenance-is-reproducible]
    expectedRedPredicate: Public beta proof omits immutable tarball digest or exact npm metadata.
    contributionResourceKey: public-provenance-report
    responsibility: task-required
    dependencyEdge: registry-tarball-to-report
    contractEdge: public-npm-cli-beta-install
    resourceKey: provenance
requiredTestCaseIds:
  - test_prf_public_beta_dependency_resolution_1a7c4e90
  - test_prf_public_beta_runtime_startup_2b8d5f01
  - test_prf_public_beta_provenance_3c9e6a12
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
  notes: Revert closure/validator/workflow changes together; do not delete registry history or rewrite provenance.
atomizationImpact:
  ownerAtomOrMap: atm.release-build-map
  mapUpdates:
    - atomic_workbench/maps/atm-release-build/map.spec.json
  extractionCandidates:
    - atom: atm.public-npm-install-proof
      pattern: Provider-neutral validation boundary
      source: scripts/validate-public-npm-install.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-11T00:25:10.571Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-11T00:25:10.571Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-11T00-25-10-571Z-close-5290780d843f"
lastTransitionAt: "2026-09-11T00:25:10.571Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d281955bf6037f335270eea510569cd64564eef9"
---

# TASK-PRF-0016 Repair and reverify public beta npm install

## Intent

Repair the two public beta failure classes observed by TASK-PRF-0015: stale
workspace dependency versions and an incomplete runtime closure. Re-run the
public registry proof against one new immutable beta version only after owner
authorization and green protected-main CI. A local clean-install pass is
necessary but never sufficient for closure.

## Acceptance

- [ ] ACC-1: Published beta workspace dependencies resolve to published versions in a clean consumer.
- [ ] ACC-2: The isolated consumer executes `atm --version` without workspace, file, or link resolution.
- [ ] ACC-3: The report records exact registry metadata, tarball SHA-256/integrity, and command output digest.
- [ ] ACC-4: The report distinguishes the old beta failures from the corrected beta result and does not claim success without registry evidence.
- [ ] ACC-5: Missing owner authorization, green CI, or public version keeps the task blocked/inconclusive.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T00:14:14.826Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0016-repair-and-reverify-public-beta-npm-install.task.md","contentDigest":"sha256:5a76974320517c6260d2f8e27920a4a99cacb00ff41ff233f9dbd4b691667d5c"} -->
