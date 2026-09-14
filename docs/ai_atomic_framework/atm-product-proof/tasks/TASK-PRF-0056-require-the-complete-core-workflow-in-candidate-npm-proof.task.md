---
task_id: TASK-PRF-0056
title: Require the complete core workflow in candidate npm proof
status: done
owner: release-evidence-steward
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - "TASK-PRF-0053 established the public core-workflow contract, while candidate validation still covers only the legacy smoke commands."
    - "The current local candidate already carries the required chart schemas; this card repairs evidence completeness rather than changing the runtime split."
  softRelations: [TASK-PRF-0053, TASK-PRF-0052]
  changedPublicSeams: [candidate_npm_install_proof]
  causalImpactEdges: [candidate_install_complete, release_provenance]
  parallelFrontierInputs: [candidate-tarball, core-workflow-contract]
  validatorReferences: [test_prf_candidate_core_workflow_matrix, test_prf_candidate_fail_closed_missing_schema, test_prf_candidate_registry_separation]
  phaseOwner: release
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-candidate-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-product-proof-checkpoints.md
deliverables:
  - scripts/validate-candidate-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-product-proof-checkpoints.md
  - external candidate tarball receipt with full core-workflow command matrix and provenance
validators:
  - npm run typecheck
  - npm run lint
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types tests/cli/product-proof-evidence-boundary.test.ts
  - node --strip-types scripts/validate-candidate-npm-install.ts --candidate-dir packages/cli --record-blocked
testContributions:
  - caseId: test_prf_candidate_core_workflow_matrix
    targetGroupId: null
    semanticKey: candidate_core_workflow_matrix
    coversAcceptance: [ACC-1]
    coversImpactEdges: [candidate_install_complete]
    expectedRedPredicate: "A candidate tarball is accepted after legacy smoke commands even though bootstrap, atm-chart render, or atm-chart verify is absent or fails in the clean consumer."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: candidate_npm_install_proof
    resourceKey: clean-candidate-install
  - caseId: test_prf_candidate_fail_closed_missing_schema
    targetGroupId: null
    semanticKey: candidate_fail_closed_missing_schema
    coversAcceptance: [ACC-2]
    coversImpactEdges: [candidate_install_complete]
    expectedRedPredicate: "Removing a required chart schema still yields blocked/inconclusive candidate evidence and never a pass."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: candidate_npm_install_proof
    resourceKey: candidate-schema-closure
  - caseId: test_prf_candidate_registry_separation
    targetGroupId: null
    semanticKey: candidate_registry_separation
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [release_provenance]
    expectedRedPredicate: "A candidate receipt cannot be labeled as public registry proof and must retain exact source, metadata, digest, and workspace-link fields."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: candidate_npm_install_proof
    resourceKey: candidate-provenance
requiredTestCaseIds:
  - test_prf_candidate_core_workflow_matrix
  - test_prf_candidate_fail_closed_missing_schema
  - test_prf_candidate_registry_separation
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed-candidate-tarball-clean-install-full-core-workflow
rollback:
  strategy: revert-commit-preserve-candidate-receipt
  notes: "Revert only the candidate validator, tests, and report updates; retain failed or blocked candidate receipts outside Git for audit."
atomizationImpact:
  ownerAtomOrMap: atm.public-runtime-closure
  mapUpdates: []
  extractionCandidates:
    - atom: atm.candidate-registry-workflow-validator
      pattern: Policy Object
      source: scripts/validate-candidate-npm-install.ts
      disposition: follow-up-card
      inlineReason: "Keep the first repair cohesive; extract only if candidate and public validators later share a stable provider-neutral boundary."
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T03:02:25.124Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T03:02:25.124Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T03-02-25-124Z-close-dd44b7aaddd3"
lastTransitionAt: "2026-09-14T03:02:25.124Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d455422a021b790cdd06be7dd0b3c50c257e63d6"
---

# TASK-PRF-0056 Require the complete core workflow in candidate npm proof

## Intent

The public validator from TASK-PRF-0053 now requires `version`, `doctor`,
`bootstrap`, `atm-chart render`, and `atm-chart verify`, but the candidate
validator still runs only `version`, `next`, `tasks`, and `doctor`. This card
closes that evidence gap so a local tarball cannot be called complete merely
because it starts. It does not publish npm, change the artifact budget, or
split the runtime.

## Acceptance

- [ ] ACC-1: A clean tarball consumer runs the same five-command core workflow
      required by the public proof and records each exit code, output digest,
      startup timing, and module-resolution result.
- [ ] ACC-2: Missing required chart data or schema fails closed as
      blocked/inconclusive; no legacy smoke result can override it.
- [ ] ACC-3: The receipt distinguishes candidate, registry, and baseline data;
      records exact package source, tarball digest, unpacked bytes, entry count,
      Node/npm versions, workspace-link status, and the complete command matrix.
- [ ] ACC-4: Focused contract, evidence-boundary, typecheck, lint, and candidate
      validator checks pass; the report states candidate-only evidence and does
      not imply a public release or authorize npm publish.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T02:47:16.087Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0056-require-the-complete-core-workflow-in-candidate-npm-proof.task.md","contentDigest":"sha256:c4ad438141ed021a8dd26781188a08cec93bc610199cca21412ff730a1f01c16"} -->
