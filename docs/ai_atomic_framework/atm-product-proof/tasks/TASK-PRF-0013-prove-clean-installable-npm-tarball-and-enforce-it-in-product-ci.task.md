---
task_id: TASK-PRF-0013
title: Prove clean-installable npm tarball and enforce it in Product CI
status: done
owner: atm-release
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .github/workflows/ci.yml
  - package.json
  - scripts/validate-ci-product-lane.ts
  - scripts/validate-package-skeleton.ts
  - tests/cli/ci-product-lane-contract.test.ts
  - docs/reports/atm-product-ci-burn-in.md
  - atomic_workbench/maps/atm-release-build/map.spec.json
deliverables:
  - .github/workflows/ci.yml
  - package.json
  - scripts/validate-ci-product-lane.ts
  - scripts/validate-package-skeleton.ts
  - tests/cli/ci-product-lane-contract.test.ts
  - docs/reports/atm-product-ci-burn-in.md
  - atomic_workbench/maps/atm-release-build/map.spec.json
validators:
  - npm run typecheck
  - node --strip-types tests/cli/ci-product-lane-contract.test.ts
  - node --strip-types scripts/validate-package-skeleton.ts --mode install-smoke
  - npm run validate:ci-product-lane
testContributions:
  - caseId: test_ci_clean_install_tarball_9b7e2a1c
    targetGroupId: null
    semanticKey: clean_install_tarball
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [public-npm-install-seam, protected-product-ci-seam]
    expectedRedPredicate: an isolated consumer install must fail when the packed bin or runtime closure is unusable
    contributionResourceKey: npm-tarball-smoke
    responsibility: task-required
    dependencyEdge: null
    contractEdge: npm-install-contract
    resourceKey: npm-tarball-smoke
  - caseId: test_ci_workflow_contract_4d2a8f77
    targetGroupId: null
    semanticKey: product_ci_clean_install_step
    coversAcceptance: [ACC-3]
    coversImpactEdges: [protected-product-ci-seam]
    expectedRedPredicate: the workflow contract must fail when Product CI no longer runs the isolated tarball smoke
    contributionResourceKey: product-ci-workflow
    responsibility: task-required
    dependencyEdge: null
    contractEdge: product-ci-contract
    resourceKey: product-ci-workflow
  - caseId: test_ci_install_evidence_71c04e2e
    targetGroupId: null
    semanticKey: install_evidence_digest
    coversAcceptance: [ACC-4]
    coversImpactEdges: [npm-install-evidence-seam]
    expectedRedPredicate: the smoke must emit measured inventory and command-backed evidence without retaining temp files
    contributionResourceKey: npm-tarball-evidence
    responsibility: task-required
    dependencyEdge: null
    contractEdge: npm-evidence-contract
    resourceKey: npm-tarball-evidence
requiredTestCaseIds:
  - test_ci_clean_install_tarball_9b7e2a1c
  - test_ci_workflow_contract_4d2a8f77
  - test_ci_install_evidence_71c04e2e
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
  notes: Revert the workflow, validator, package-script, report, and map changes together; no registry or npm publication is performed.
atomizationImpact:
  ownerAtomOrMap: atm.release-build-map
  atomCid: null
  mapUpdates:
    - atomic_workbench/maps/atm-release-build/map.spec.json
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-10T23:48:55.896Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-10T23:48:55.896Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-10T23-48-55-896Z-close-2ff27e015d1a"
lastTransitionAt: "2026-09-10T23:48:55.896Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a21da8068291c0218f13adc211bb8bf1ea37feae"
---

# TASK-PRF-0013 Prove clean-installable npm tarball and enforce it in Product CI

## Intent

Prove the actual publish-shaped CLI tarball is installable and executable from
an empty consumer directory, then make that proof a mandatory Product CI step.
This closes the gap between package metadata/dry-run checks and what an adopter
actually receives. It does not publish, push, or infer remote CI health.

## Acceptance

- [ ] ACC-1: `npm pack --workspace packages/cli` produces a tarball whose inventory is
      limited to the declared runtime closure and package metadata.
- [ ] ACC-2: A fresh temporary consumer can install that exact tarball with
      `npm install --ignore-scripts` and execute `npx --no-install atm --version`
      (or the equivalent installed bin) successfully.
- [ ] ACC-3: Product CI runs the same isolated clean-install smoke independently of
      ATM Dogfood, and the workflow contract test fails if the step disappears.
- [ ] ACC-4: Evidence records tarball bytes, entries, install command, public command
      output digest, and rollback/reproduction instructions without committing
      temporary consumer files.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-10T23:32:06.430Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0013-prove-clean-installable-npm-tarball-and-enforce-it-in-product-ci.task.md","contentDigest":"sha256:9301c7c1ef9497306539fc031bf38387ce88120bcc852fcd999a01187f6b5324"} -->
