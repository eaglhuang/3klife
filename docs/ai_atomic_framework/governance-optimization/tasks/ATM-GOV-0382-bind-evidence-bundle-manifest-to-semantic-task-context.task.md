---
task_id: ATM-GOV-0382
title: Bind evidence bundle manifests to semantic task context
status: planned
owner: codex-captain-recovery
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - A taskflow close transaction has reproduced a protected-state rejection for its generated evidence bundle manifest.
  softRelations: [ATM-GOV-0381, TASK-MAO-0057, TASK-GIT-0026]
  changedPublicSeams: [atm.evidenceBundleManifest.v1, protected-evidence-bundle-admission]
  causalImpactEdges: [manifest-producer-consumer-parity, taskflow-close-atomicity]
  parallelFrontierInputs: [evidence-bundle-manifest, pre-commit-protected-state]
  validatorReferences: [evidence-bundle-manifest, taskflow-close-atomicity]
  phaseOwner: correction-wave-0
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/evidence/bundle-io/implementation.ts
  - packages/cli/src/commands/hook/pre-commit/support.ts
  - tests/cli/evidence-bundle-manifest.test.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
deliverables:
  - packages/cli/src/commands/evidence/bundle-io/implementation.ts
  - packages/cli/src/commands/hook/pre-commit/support.ts
  - tests/cli/evidence-bundle-manifest.test.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
validators:
  - node --strip-types tests/cli/evidence-bundle-manifest.test.ts
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
testContributions:
  - caseId: test_atm_gov_0382_manifest_semantic_task_context
    targetGroupId: test_group_plan3x4x_wave_0
    semanticKey: evidence_bundle_manifest_semantic_task_context
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [manifest-producer-consumer-parity, taskflow-close-atomicity]
    expectedRedPredicate: a generated same-task manifest without a semantic taskId is rejected before the producer fix, while a manifest with a mismatched taskId remains rejected
    contributionResourceKey: evidence-bundle-manifest
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.evidenceBundleManifest.v1
    resourceKey: evidence-bundle-manifest
requiredTestCaseIds: [test_atm_gov_0382_manifest_semantic_task_context]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the producer/consumer alignment together; protected evidence without one verified semantic task identity must remain fail-closed.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-integrity
  mapUpdates: []
  extractionCandidates: []
errorCodes:
  - code: ATM_PROTECTED_STATE_EVIDENCE_FILE_MISSING_TASK_CONTEXT
    disposition: reuse
    category: guard
    trigger: A protected evidence artifact cannot be tied to exactly one semantic task context.
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs taskflow close --task <task-id> --actor <actor-id> --dry-run --json
    sourceOwner: packages/cli/src/commands/hook/pre-commit/support.ts
    registryOwnerTask: TASK-GIT-0026
    tests: [tests/cli/evidence-bundle-manifest.test.ts]
outOfScope:
  - Weakening protected-state admission for arbitrary evidence files.
  - Bypassing pre-commit or taskflow close with raw Git.
nonGoals:
  - Declaring Wave 0 or the four plans complete.
---

# ATM-GOV-0382 Bind evidence bundle manifests to semantic task context

## Problem

`taskflow close` generates a same-task `atm.evidenceBundleManifest.v1` during
its sealed transaction. The protected-state hook must verify its semantic task
identity, but the current producer/consumer path can reject the generated
artifact as context-free. The result is an unnecessary full rollback after the
delivery commit has already passed.

## Acceptance

- ACC-1 Every produced `atm.evidenceBundleManifest.v1` carries exactly one
  semantic `taskId`, and the reader/hook validates that identity rather than
  inferring authority from a filename.
- ACC-2 A same-task close bundle is admitted with its staged ledger/event;
  missing, mismatched, or ambiguous task identity remains fail-closed.
- ACC-3 The focused regressions prove the producer/consumer contract without
  rerunning a broad suite or weakening foreign evidence isolation.
