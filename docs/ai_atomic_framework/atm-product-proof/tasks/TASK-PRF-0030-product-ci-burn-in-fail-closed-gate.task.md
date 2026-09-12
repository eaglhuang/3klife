---
task_id: TASK-PRF-0030
title: 建立長期 Product CI burn-in 的可重跑證據報告與 fail-closed gate
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-PRF-0017
causalGraph:
  causalDependencies:
    - "TASK-PRF-0017 restored the Product CI workflow and its current short-window evidence."
  startConditions:
    - "Product CI workflow ci.yml is reachable and its run history can be exported as JSON."
    - "The protected-main burn-in policy is fixed at 30 calendar days or 90 completed runs, whichever is later."
  softRelations:
    - "TASK-PRF-0019 external A/B benchmark may consume the same evidence publication conventions."
  changedPublicSeams:
    - "npm run validate:ci-burn-in"
  causalImpactEdges:
    - "ci-history-input -> burn-in-report"
    - "burn-in-report -> long-term-green-claim"
  parallelFrontierInputs:
    - "github-actions-ci-run-json"
  validatorReferences:
    - "tests/cli/product-ci-burn-in.test.ts"
  phaseOwner: atm-release
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/product-ci-burn-in.test.ts
  - tests/fixtures/product-ci-burn-in/known-failure.json
  - package.json
  - docs/reports/atm-ci-burn-in-baseline-2026-09-12.md
deliverables:
  - "scripts/measure-product-ci-burn-in.ts — deterministic JSON-in/report-out evaluator for protected-main CI burn-in."
  - "tests/cli/product-ci-burn-in.test.ts — fixture-backed regression coverage for success, failure, insufficient-window, duplicate, and malformed history."
  - "tests/fixtures/product-ci-burn-in/known-failure.json — deterministic offline input proving a failure cannot produce a green claim."
  - "package.json — validate:ci-burn-in script contract."
  - "docs/reports/atm-ci-burn-in-baseline-2026-09-12.md — append-only observation format and current measured result."
validators:
  - "node --strip-types tests/cli/product-ci-burn-in.test.ts"
  - "npm run validate:ci-burn-in -- --input tests/fixtures/product-ci-burn-in/known-failure.json --report-only"
  - "npm run typecheck"
  - "npm run lint"
testContributions:
  - caseId: test_ci_burn_in_green_window_4e91a2c7
    targetGroupId: null
    semanticKey: ci_burn_in_green_window
    coversAcceptance: [ACC-1, ACC-2, ACC-4, ACC-6]
    coversImpactEdges:
      - "ci-history-input -> burn-in-report"
      - "burn-in-report -> long-term-green-claim"
    expectedRedPredicate: "A history shorter than the policy window or containing an unexplained failure is rejected."
    contributionResourceKey: ci-burn-in-evaluator
    responsibility: task-required
    dependencyEdge: ci-history-input
    contractEdge: ci-burn-in-report
    resourceKey: ci-burn-in-evaluator
  - caseId: test_ci_burn_in_input_integrity_7bc4d8f1
    targetGroupId: null
    semanticKey: ci_burn_in_input_integrity
    coversAcceptance: [ACC-3, ACC-5]
    coversImpactEdges:
      - "ci-history-input -> burn-in-report"
      - "burn-in-report -> long-term-green-claim"
    expectedRedPredicate: "Malformed, duplicated, or out-of-order run records are rejected without producing a green claim."
    contributionResourceKey: ci-burn-in-evaluator
    responsibility: task-required
    dependencyEdge: ci-history-input
    contractEdge: ci-burn-in-report
    resourceKey: ci-burn-in-evaluator
requiredTestCaseIds:
  - test_ci_burn_in_green_window_4e91a2c7
  - test_ci_burn_in_input_integrity_7bc4d8f1
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
  notes: "Revert the evaluator, package script, tests, and report append; retain prior CI workflow and prior baseline observation."
atomizationImpact:
  ownerAtomOrMap: atm.release.ci-burn-in-evidence-map
  mapUpdates:
    - docs/reports/atm-ci-burn-in-baseline-2026-09-12.md
  extractionCandidates:
    - atom: atm.release.ci-burn-in-evaluator
      pattern: Policy Object
      source: scripts/measure-product-ci-burn-in.ts
      disposition: extract
      inlineReason: null
errorCodes: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-12T16:19:14.489Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-12T16:19:14.489Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-12T16-19-14-489Z-close-494efee79d8f"
lastTransitionAt: "2026-09-12T16:19:14.489Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2f0f7d8ccc19600b2fe0586335504cfbce97d432"
---

# TASK-PRF-0030 建立長期 Product CI burn-in 的可重跑證據報告與 fail-closed gate

## Intent

Turn Product CI history into a reproducible, append-only burn-in measurement
that fails closed unless every policy condition is present. The evaluator must
separate observations from claims: it may report `insufficient-window` or
`unexplained-failure`, but it must never label a short recent streak as
long-term green. Input is an exported GitHub Actions JSON array so the same
commit can be rechecked offline and independently hashed.

## Acceptance

- [ ] **ACC-1 — Fixed policy:** evaluator uses the declared 30-calendar-day or
  90-completed-run (whichever is later) policy and reports both denominators.
- [ ] **ACC-2 — Fail closed:** any failed/cancelled/skipped run, missing run,
  non-protected event, or insufficient window prevents a `long-term-green`
  result and emits machine-readable reasons.
- [ ] **ACC-3 — Input integrity:** duplicate IDs, malformed timestamps,
  non-monotonic history, missing conclusion/status, or mutable/unstable fields
  are rejected before claim evaluation.
- [ ] **ACC-4 — Reproducible report:** output contains source digest, observed
  range, run IDs, success/failure counts, streak, release-candidate count,
  policy thresholds, and an explicit claim status.
- [ ] **ACC-5 — CI contract:** `npm run validate:ci-burn-in` is documented and
  covered by fixture tests; no network credential is required for offline
  rechecks.
- [ ] **ACC-6 — Evidence update:** the current report appends the latest
  observed history without overwriting prior observations and states that the
  current window is not yet long-term proof.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-12T15:54:21.124Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0030-product-ci-burn-in-fail-closed-gate.task.md","contentDigest":"sha256:8588a5ffaf5d989e073c67cb3fcdb3f13ead1d8e333465c34a448b72064ff23c"} -->
