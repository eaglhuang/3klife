---
task_id: TASK-PRF-0107
title: Restore installable npm chart lifecycle without inflating the bundle
status: done
owner: atm-release
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - clean npm install of @ai-atomic-framework/cli@0.1.0 reproduces ATM_CHART_SCHEMA_SOURCE_MISSING
    - embedded schema digests and runtime manifest are available for comparison
    - artifact budget and existing chart fail-closed behavior remain unchanged
  softRelations:
    - TASK-PRF-0101
    - TASK-PRF-0102
    - TASK-PRF-0106
  changedPublicSeams:
    - atm.cli.atm-chart.render
    - atm.cli.atm-chart.verify
    - atm.cli.public-npm-runtime
  causalImpactEdges:
    - public-clean-install-completeness
    - npm-chart-lifecycle-correctness
    - command-gate-latency-score
  parallelFrontierInputs:
    - TASK-PRF-0101
    - TASK-PRF-0106
  validatorReferences:
    - public-npm-install-command-matrix
    - npm-runtime-artifact-budget
    - atm-chart-schema-fail-closed
  phaseOwner: null
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/atm-chart/constants.ts
  - packages/cli/src/commands/atm-chart/render-verify.ts
  - scripts/build-cli-npm-runtime.ts
  - tests/cli/atm-chart-public-runtime.test.ts
  - docs/reports/atm-command-gate-latency-score.md
deliverables:
  - minimal runtime seam that lets a clean npm install render and verify ATMChart without the monorepo root
  - regression test covering bundled schema fallback and missing/invalid schema fail-closed behavior
  - public install validator receipt running the full command matrix, not only --version
  - external AB/BA+A/A receipt for clean-install chart command/gate wall milliseconds and unpacked bytes/entries
  - latency report update with candidate and baseline digests, sample counts, p50/p95, and exact rerun command
validators:
  - node --strip-types tests/cli/atm-chart-public-runtime.test.ts
  - npm run validate:public-npm-install
  - npm run typecheck -- --pretty false
  - npm run build:packages -- --packages cli
  - npm run check:encoding:touched -- --files packages/cli/src/commands/atm-chart/constants.ts packages/cli/src/commands/atm-chart/render-verify.ts scripts/build-cli-npm-runtime.ts tests/cli/atm-chart-public-runtime.test.ts docs/reports/atm-command-gate-latency-score.md
testContributions:
  - caseId: test_task_prf0107_chart_schema_fallback_8e7a1c44
    targetGroupId: null
    semanticKey: public_chart_schema_fallback
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [public-clean-install-completeness, npm-chart-lifecycle-correctness]
    expectedRedPredicate: a runtime-only chart render or verify cannot resolve a schema without the monorepo root
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: npm-chart-lifecycle-correctness
    contractEdge: atm.cli.atm-chart.render
    resourceKey: atm-chart-schema
  - caseId: test_task_prf0107_chart_schema_negative_0c2d9b71
    targetGroupId: null
    semanticKey: public_chart_schema_fail_closed
    coversAcceptance: [ACC-2, ACC-3]
    coversImpactEdges: [npm-chart-lifecycle-correctness]
    expectedRedPredicate: missing or invalid schema data is silently accepted or reported as a passing chart lifecycle
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: npm-chart-schema-fail-closed
    contractEdge: atm.cli.atm-chart.verify
    resourceKey: atm-chart-schema-negative
  - caseId: test_task_prf0107_public_install_latency_2a91f0de
    targetGroupId: null
    semanticKey: public_install_latency_receipt
    coversAcceptance: [ACC-4, ACC-5, ACC-6]
    coversImpactEdges: [command-gate-latency-score]
    expectedRedPredicate: receipt omits failure samples, tarball identity, or paired p50/p95 milliseconds
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: public-clean-install-completeness
    contractEdge: external-receipt-boundary
    resourceKey: public-install-latency
requiredTestCaseIds:
  - test_task_prf0107_chart_schema_fallback_8e7a1c44
  - test_task_prf0107_chart_schema_negative_0c2d9b71
  - test_task_prf0107_public_install_latency_2a91f0de
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
  notes: revert the single runtime seam and test change; retain external receipts and the documented npm failure evidence
atomizationImpact:
  ownerAtomOrMap: atm.cli.atm-chart-runtime
  mapUpdates:
    - atomic_workbench/maps/atm-cli-command-router-map.json
  extractionCandidates:
    - atom: atm.cli.atm-chart-schema-source
      pattern: Deep Module
      source: packages/cli/src/commands/atm-chart/constants.ts
      disposition: inline
      inlineReason: existing resolver and embedded digest table already form one bounded seam; extracting a second module would increase bundle surface without another adapter
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-17T23:42:39.826Z"
completed_by_agent: "claude-code-opus-5"
closedAt: "2026-09-17T23:42:39.826Z"
closedByActor: "claude-code-opus-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-17T23-42-39-826Z-close-7a78e08f7b19"
lastTransitionAt: "2026-09-17T23:42:39.826Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "36b780ff3"
---

# TASK-PRF-0107 Restore installable npm chart lifecycle without inflating the bundle

## Intent

The published CLI currently advertises the chart lifecycle but a clean npm
install fails because the runtime cannot find the schema source it fingerprints.
Restore that public behavior with the smallest existing resolver seam. The
candidate must remain a single compact runtime, keep schema drift and
missing-source failures fail-closed, and prove the result from a clean install.
The task also records command/gate wall milliseconds so installability and
lightweight performance are judged together rather than by a version-only
smoke test.

## Acceptance

- [ ] **ACC-1 — Clean-install function:** from an empty temporary project,
  `atm-chart render` and `atm-chart verify` execute against the installed
  package without depending on the framework repository root.
- [ ] **ACC-2 — Schema integrity:** chart output records the same sealed schema
  digests as the source runner; missing, tampered, or invalid schema data still
  returns the existing fail-closed error and never a false PASS.
- [ ] **ACC-3 — Existing product matrix:** `validate:public-npm-install` runs
  init, next/tasks, doctor/guide and chart lifecycle commands for the exact
  candidate version; any blocked or failed command remains visible.
- [ ] **ACC-4 — Bundle budget:** candidate unpacked bytes and entries do not
  exceed the current package budget and no broad `schemas/` copy or new registry
  is introduced.
- [ ] **ACC-5 — Millisecond evidence:** external receipt has at least 30
  interleaved AB/BA pairs and 8 A/A controls with tarball/runner digests,
  failure samples, clean-install wall p50/p95, and chart command/gate p50/p95;
  no claim is made if the candidate cannot pass the functional matrix.
- [ ] **ACC-6 — No concurrency regression:** no broker, lock, or multi-AI
  ownership semantics change; read-only/private evidence work remains parallel.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T19:53:18.769Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0107-restore-installable-npm-chart-lifecycle-without-inflating-the-bundle.task.md","contentDigest":"sha256:2ab0bc89075de2f89838b099a3957922972ee2909b8acec6b42cd616264fe6f1"} -->
