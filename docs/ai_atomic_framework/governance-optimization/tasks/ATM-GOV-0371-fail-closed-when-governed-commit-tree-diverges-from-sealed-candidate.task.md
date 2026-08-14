---
task_id: ATM-GOV-0371
title: Fail closed when governed commit tree diverges from sealed candidate
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions: ["A governed commit receipt reported success while the actual HEAD diff omitted its sealed delivery bundle."]
  softRelations: [ATM-GOV-0370]
  changedPublicSeams: [atm.sealedCommitTreeParity.v1]
  causalImpactEdges: [post-commit-tree-is-proven-against-seal, mismatch-never-reports-success]
  parallelFrontierInputs: [sealed-candidate-index, branch-commit-window, live-index-reconciliation]
  validatorReferences: [sealed-commit-tree-parity]
  phaseOwner: wave-3-governance-substrate-recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
  - packages/cli/src/commands/git-governance/implementation/git-head-evidence-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.test.ts
  - packages/cli/dist/commands/emergency/__tests__/gate.test.d.ts
  - packages/cli/dist/commands/emergency/gate.d.ts
  - packages/cli/dist/commands/framework-development/runner-publication-close-handoff.js
  - packages/cli/dist/commands/framework-development/runner-publication-lifecycle.test.js
  - packages/cli/dist/commands/git-governance/implementation/git-head-evidence-transaction.js
  - packages/cli/dist/commands/taskflow/commit-bundle-assembly.js
  - packages/cli/dist/commands/tasks/scope-lock-diagnostics.js
  - scripts/build-root-drop-release.ts
  - scripts/validate-root-drop-release.ts
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop
deliverables:
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
  - packages/cli/src/commands/git-governance/implementation/git-head-evidence-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.test.ts
  - packages/cli/dist/commands/emergency/__tests__/gate.test.d.ts
  - packages/cli/dist/commands/emergency/gate.d.ts
  - packages/cli/dist/commands/framework-development/runner-publication-close-handoff.js
  - packages/cli/dist/commands/framework-development/runner-publication-lifecycle.test.js
  - packages/cli/dist/commands/git-governance/implementation/git-head-evidence-transaction.js
  - packages/cli/dist/commands/taskflow/commit-bundle-assembly.js
  - packages/cli/dist/commands/tasks/scope-lock-diagnostics.js
  - scripts/build-root-drop-release.ts
  - scripts/validate-root-drop-release.ts
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop
validators:
  - node --strip-types packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0371_post_commit_tree_matches_seal
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: committed_tree_exactly_matches_sealed_candidate
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [post-commit-tree-is-proven-against-seal, mismatch-never-reports-success]
    expectedRedPredicate: a post-commit tree that differs from the seal can be reported as a successful governed commit
    contributionResourceKey: sealed-commit-tree-parity
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.sealedCommitTreeParity.v1
    resourceKey: sealed-commit-tree-parity
requiredTestCaseIds: [test_atm_gov_0371_post_commit_tree_matches_seal]
tddMode: required
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the post-commit parity gate and its focused regression together; do not retroactively rewrite a mismatched commit.
atomizationImpact:
  ownerAtomOrMap: atm.sealed-commit-tree-parity
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-14T02:02:47.211Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-14T02:02:47.211Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T02-02-47-211Z-close-7cc96aa54482"
lastTransitionAt: "2026-08-14T02:02:47.211Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "eeae28cba4fbf36346f66b86442f162d9a24688a"
---

# ATM-GOV-0371 Fail closed when governed commit tree diverges from sealed candidate

## Intent

Make the sealed candidate bundle and the actual committed HEAD diff one atomic,
verified fact. A commit that advances HEAD with different paths, blobs, modes,
or deletion dispositions must surface an attribution mismatch and cannot return
a successful governed-commit receipt.

## Acceptance

- ACC-1 A successful task-scoped commit proves its actual committed tree equals
  the exact sealed candidate bundle, including transaction-authored evidence.
- ACC-2 A divergent post-commit tree fails closed with the canonical attribution
  mismatch contract and records the observed commit SHA for recovery.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-14T00:45:44.807Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0371-fail-closed-when-governed-commit-tree-diverges-from-sealed-candidate.task.md","contentDigest":"sha256:192deab4913b5afbb48383bf0d4a2c789e7395d9afccb33162bdcc1919400741"} -->
