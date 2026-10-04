---
task_id: TASK-PRF-0127
title: Generate valid npm CLI entry guidance after bootstrap
status: planned
owner: atm-product-proof
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams:
    - bootstrap-generated-agent-entrypoint
  causalImpactEdges:
    - npm-first-use-command-executable
    - root-drop-entrypoint-compatibility
  parallelFrontierInputs: []
  validatorReferences:
    - test_prf_0127_npm_bootstrap_entrypoint
  phaseOwner: null
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/plugin-governance-local/src/bootstrap/bootstrap/implementation.ts
  - packages/plugin-governance-local/src/bootstrap/bootstrap/root-entry-patching.ts
  - packages/plugin-governance-local/src/bootstrap/bootstrap/bootstrap-support.ts
  - scripts/validate-candidate-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/plugin-governance-local/bootstrap-final-600.test.ts
deliverables:
  - packages/plugin-governance-local/src/bootstrap/bootstrap/implementation.ts
  - packages/plugin-governance-local/src/bootstrap/bootstrap/root-entry-patching.ts
  - packages/plugin-governance-local/src/bootstrap/bootstrap/bootstrap-support.ts
  - scripts/validate-candidate-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/plugin-governance-local/bootstrap-final-600.test.ts
validators:
  - node --strip-types tests/plugin-governance-local/bootstrap-final-600.test.ts
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - npm run validate:bootstrap
  - npm run validate:root-drop-release
  - npm run typecheck
  - npm run lint
testContributions:
  - caseId: test_prf_0127_npm_bootstrap_entrypoint
    targetGroupId: null
    semanticKey: npm_bootstrap_generated_entrypoint
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [npm-first-use-command-executable, root-drop-entrypoint-compatibility]
    expectedRedPredicate: "The npm bootstrap-generated instruction points to a missing atm.mjs in a clean npm consumer, or root-drop generation stops using the local runner."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: bootstrap-generated-agent-entrypoint
    resourceKey: candidate-npm-clean-consumer
requiredTestCaseIds:
  - test_prf_0127_npm_bootstrap_entrypoint
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - tdd-oracle-fidelity
evidence:
  required: red-green-clean-candidate-npm-install-with-generated-entrypoint-execution
rollback:
  strategy: revert-commit
  notes: "Revert only the scoped bootstrap guidance, candidate validator, and regression test changes. Retain the external reproduction note and do not change published package history."
atomizationImpact:
  ownerAtomOrMap: atom-bootstrap-runtime
  atomCid: null
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0127 Generate valid npm CLI entry guidance after bootstrap

## Intent

Correct the confirmed failure where a fresh public npm consumer's bootstrap
creates agent instructions that execute `node atm.mjs` even though the npm
distribution supplies an `atm` binary and no root-level runner. Keep root-drop
and onefile instructions on their local `node atm.mjs` route. This removes a
first-use failure without increasing the npm runtime payload or introducing a
new gate or runtime dependency.

## Acceptance

- [ ] ACC-1: A fresh candidate npm install followed by bootstrap generates an
  `atm`-binary instruction that executes successfully from the adopter repo;
  it must not refer to an absent local `atm.mjs`.
- [ ] ACC-2: Root-drop and onefile bootstrap guidance continues to invoke the
  local `node atm.mjs` runner and existing root-drop validation passes.
- [ ] ACC-3: The existing public npm core command matrix remains green. The fix
  adds no runtime dependency, extra download, bundled root-drop runner, or
  separate CI gate; package size remains measured by the existing candidate
  proof.
- [ ] ACC-4: The same registered test case records a valid red against current
  behavior and green after the change, binding the candidate consumer and
  generated-command execution.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-23T07:24:03.843Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0127-generate-valid-npm-cli-entry-guidance-after-bootstrap.task.md","contentDigest":"sha256:4883835163ad477c3938a5424172e8361a2874d303c5394b1ae00fdd2fb704b0"} -->
