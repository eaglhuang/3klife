---
task_id: TASK-PRF-0120
title: Map public runtime schema dependencies before any further bundle slimming
status: done
owner: codex-product-proof
priority: P2
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-PRF-0119 is blocked and its rollback receipt is retained as counter-evidence
    - public 0.1.2 baseline metrics and the clean-install candidate harness are available
  softRelations:
    - TASK-PRF-0056
    - TASK-PRF-0060
    - TASK-PRF-0073
    - TASK-PRF-0119
  changedPublicSeams:
    - public-npm-runtime-schema-closure
    - clean-install-core-workflow
  causalImpactEdges:
    - schema-runtime-reachability
    - clean-install-correctness
    - future-bundle-slimming-safety
  parallelFrontierInputs:
    - prf0119-runtime-schema-boundary-review
    - fixed-public-0.1.2-metrics
  validatorReferences:
    - tests/cli/runtime-schema-dependency-map.test.ts
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/product-proof/runtime-schema-dependency-map.json
  - docs/product-proof/runtime-schema-dependency-map.md
  - tests/cli/runtime-schema-dependency-map.test.ts
deliverables:
  - docs/product-proof/runtime-schema-dependency-map.json
  - docs/product-proof/runtime-schema-dependency-map.md
  - tests/cli/runtime-schema-dependency-map.test.ts
validators:
  - node --strip-types tests/cli/runtime-schema-dependency-map.test.ts
  - npm run validate:cli
  - npm run validate:schemas
  - npm run validate:npm-clean-install
  - node --strip-types scripts/validate-candidate-npm-install.ts --measurement-runs 1
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Remove only the map/report/test deliverables; do not alter the runtime asset boundary or 0119 evidence.
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-runtime-map
  mapUpdates: []
  extractionCandidates: []
testContributions:
  - caseId: test_prf0120_runtime_schema_dependency_map
    targetGroupId: null
    semanticKey: runtime_schema_dependency_map
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5, ACC-6]
    coversImpactEdges: [schema-runtime-reachability, clean-install-correctness, future-bundle-slimming-safety]
    expectedRedPredicate: a runtime-referenced schema is absent, misclassified, or lacks a source callsite and command-path reference
    contributionResourceKey: runtime-schema-dependency-map
    responsibility: task-required
    dependencyEdge: public-npm-runtime-schema-closure
    contractEdge: schema-reachability-contract
    resourceKey: runtime-schema-map
requiredTestCaseIds:
  - test_prf0120_runtime_schema_dependency_map
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: reasoned-not-applicable
tddNotApplicableReason: This card produces a dependency inventory and regression contract without changing runtime behavior; the focused map test is the required proof.
tddExemptions:
  - kind: docs
    reason: The report is a derived product-proof artifact, not a behavior implementation.
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-22T02:49:01.307Z"
completed_by_agent: "codex-product-proof"
closedAt: "2026-09-22T02:49:01.307Z"
closedByActor: "codex-product-proof"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-22T02-49-01-307Z-close-9e8bc5830a81"
lastTransitionAt: "2026-09-22T02:49:01.307Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "146792957b8a069003e87b5179ab8dced41303ba"
---

# TASK-PRF-0120 Map public runtime schema dependencies before any further bundle slimming

## Intent

Turn the TASK-PRF-0119 clean-install regression into a durable dependency map
so future bundle slimming decisions are based on runtime evidence rather than
static file counts or a partial command matrix.

## Acceptance

- [ ] **ACC-1 — Complete inventory:** Every schema copied into the public CLI runtime is listed with source callsites, command paths, classification, and digest.
- [ ] **ACC-2 — Red gates:** `create`, test-report validation, registry operations, bootstrap/chart lifecycle, and the 22-command help matrix are explicit red gates.
- [ ] **ACC-3 — Focused guard:** The map test fails when a required schema is missing or misclassified and passes against the current complete runtime.
- [ ] **ACC-4 — Clean evidence:** Clean candidate install and existing schema/CLI validators pass without changing bundler output or package boundary.
- [ ] **ACC-5 — Counter-evidence:** The report records TASK-PRF-0119's failed omission proof and states that no slimming claim is permitted from this card alone.
- [ ] **ACC-6 — Stop rule:** Any missing evidence or command regression blocks closure; no publish, push, lockfile, splitting, or runtime download is in scope.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T02:28:17.310Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0120-map-public-runtime-schema-dependencies-before-any-further-bundle-slimming.task.md","contentDigest":"sha256:37e30464f5935a761b29e5034f37bb3f0aa94f0720277eab88d25d0c7674439d"} -->
