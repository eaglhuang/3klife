---
task_id: TASK-PRF-0032
title: 建立 Product CI burn-in baseline boundary 與歷史失敗分層
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-PRF-0031
causalGraph:
  causalDependencies: [TASK-PRF-0031]
  startConditions:
    - Product CI daily schedule is deployed on protected main.
    - Existing burn-in history contains pre-remediation failures that must remain visible.
  softRelations: []
  changedPublicSeams: [product-ci-burn-in-baseline-boundary]
  causalImpactEdges: [post-remediation-green-window-is-measurable, historical-failures-remain-auditable]
  parallelFrontierInputs: [github-actions-history]
  validatorReferences: [test_prf_burn_in_baseline_boundary_5d9c1f0a]
  phaseOwner: phase-3-product-ci-burn-in
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/product-ci-burn-in.test.ts
  - docs/reports/atm-ci-burn-in-baseline-2026-09-12.md
deliverables:
  - scripts/measure-product-ci-burn-in.ts
  - tests/cli/product-ci-burn-in.test.ts
  - docs/reports/atm-ci-burn-in-baseline-2026-09-12.md
validators:
  - node --strip-types tests/cli/product-ci-burn-in.test.ts
  - npm run typecheck
  - npm run lint
testContributions:
  - caseId: test_prf_burn_in_baseline_boundary_5d9c1f0a
    targetGroupId: null
    semanticKey: post_remediation_failures_are_separated_from_historical_failures
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [post-remediation-green-window-is-measurable, historical-failures-remain-auditable]
    expectedRedPredicate: Historical failures before the declared baseline are counted as post-remediation failures or the baseline is accepted without evidence.
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: burn-in-baseline-boundary
    resourceKey: null
requiredTestCaseIds: [test_prf_burn_in_baseline_boundary_5d9c1f0a]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert baseline-boundary option and preserve raw historical run records.
atomizationImpact:
  ownerAtomOrMap: atm.release.product-ci-burn-in-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.release.product-ci-burn-in-baseline-policy
      pattern: Policy Object
      source: scripts/measure-product-ci-burn-in.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-12T17:21:16.544Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-12T17:21:16.544Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-12T17-21-16-544Z-close-3f6446546e1f"
lastTransitionAt: "2026-09-12T17:21:16.544Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e746248573972c994f271a737f5039e31ab43f8c"
---

# TASK-PRF-0032 建立 Product CI burn-in baseline boundary 與歷史失敗分層

## Intent

Introduce an explicit, immutable remediation baseline for burn-in evaluation. Runs before the baseline remain visible as historical evidence but must not poison the post-remediation green-window claim. The evaluator must fail closed when the baseline is missing, malformed, or does not bind to a protected-main commit/time.

## Acceptance

- [ ] ACC-1: The evaluator accepts a declared baseline boundary bound to protected-main SHA and timestamp.
- [ ] ACC-2: Pre-baseline failures remain reported as historical, while post-baseline failures still fail the green claim.
- [ ] ACC-3: Tests prove missing, malformed, and valid-boundary behavior without weakening the 90-run/30-day thresholds.

## Out of scope

- Rewriting or deleting historical GitHub run records.
- Lowering the 90-run or 30-day burn-in thresholds.
- Producing external A/B benchmark results or inferring provider cost.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-12T17:13:47.003Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0032-product-ci-burn-in-baseline-boundary.task.md","contentDigest":"sha256:8a3b37fee26b3a8e96de3c5d7b0a0391a53036d9b252a4ca93898a88030aa887"} -->
