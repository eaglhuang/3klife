---
task_id: TASK-ERR-0014
title: Make live-index reconciliation exception safe, observable, and argv bounded
status: planned
owner: atm-captain
priority: P0
depends_on: []
causalGraph:
  startConditions: [governed-commit-advances-head-through-a-sealed-candidate-index]
  softRelations: [TASK-ERR-0013, ATM-GOV-0346]
  changedPublicSeams: [live-index-reconciliation-transaction, pathspec-argv-budget]
  causalImpactEdges:
    - commit-error-after-head-advance-to-reconciled-live-index
    - retained-path-to-operator-visible-result
    - oversized-path-bundle-to-bounded-git-invocations
  parallelFrontierInputs: [canonical-git-index, sealed-commit-bundle, worktree-bytes]
  validatorReferences:
    - test_reconcile_after_commit_error_0014
    - test_retained_path_observability_0014
    - test_pathspec_argv_batching_0014
  phaseOwner: correction-wave-0-unblock
related_plan: error-governance/error-governance-plan.md
planning_repo: docs
target_repo: C:\Users\User\AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/live-index-reconciliation.ts
  - packages/cli/src/commands/git-governance/implementation/live-index-reconciliation.test.ts
  - packages/cli/src/commands/git-governance/implementation/pathspec-argv-batching.ts
  - packages/cli/src/commands/git-governance/implementation/pathspec-argv-batching.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/live-index-reconciliation.ts
  - packages/cli/src/commands/git-governance/implementation/live-index-reconciliation.test.ts
  - packages/cli/src/commands/git-governance/implementation/pathspec-argv-batching.ts
  - packages/cli/src/commands/git-governance/implementation/pathspec-argv-batching.test.ts
validators:
  - node --strip-types packages/cli/src/commands/git-governance/implementation/pathspec-argv-batching.test.ts
  - node --strip-types packages/cli/src/commands/git-governance/implementation/live-index-reconciliation.test.ts
  - node --strip-types tests/cli/commit-attribution-concurrency-gates.test.ts
  - npm run typecheck
  - npm run validate:module-boundaries
testContributions:
  - caseId: test_reconcile_after_commit_error_0014
    semanticKey: commit_error_after_head_advance_still_reconciles_live_index
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [commit-error-after-head-advance-to-reconciled-live-index]
    expectedRedPredicate: run() throws after creating the commit, HEAD has advanced, and the live index keeps pre-commit blobs because reconciliation was skipped
    responsibility: task-required
    contractEdge: live-index-reconciliation-transaction
  - caseId: test_retained_path_observability_0014
    semanticKey: retained_paths_and_reasons_reach_the_production_caller
    coversAcceptance: [ACC-3]
    coversImpactEdges: [retained-path-to-operator-visible-result]
    expectedRedPredicate: withTaskScopedCommitIndex returns only .result, so a concurrent-index-change retention is computed and discarded
    responsibility: task-required
    contractEdge: live-index-reconciliation-transaction
  - caseId: test_pathspec_argv_batching_0014
    semanticKey: oversized_path_bundles_split_into_budget_bounded_git_invocations
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [oversized-path-bundle-to-bounded-git-invocations]
    expectedRedPredicate: a release-style path bundle is splatted into one git invocation whose argv exceeds the Windows CreateProcess budget
    responsibility: task-required
    contractEdge: pathspec-argv-budget
requiredTestCaseIds:
  - test_reconcile_after_commit_error_0014
  - test_retained_path_observability_0014
  - test_pathspec_argv_batching_0014
phaseTestCaseIds: [typecheck, validate:module-boundaries]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [transaction-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the transaction boundary, the batching module, and both focused tests together. Never restore index bytes by hand, and never resolve a batching failure by retry, reset, or stash.
atomizationImpact:
  ownerAtomOrMap: atm.live-index-reconciliation
  mapUpdates: []
  extractionCandidates:
    - atom: atm.pathspec-argv-budget
      pattern: Policy Object
      source: packages/cli/src/commands/git-governance/implementation/live-index-reconciliation.ts
      disposition: extract
      inlineReason: null
errorCodes:
  - code: ATM_GIT_PATHSPEC_ARGV_BUDGET_EXCEEDED
    disposition: new
    category: git-governance
    trigger: a single pathspec alone exceeds the platform argv byte budget, so no batching can make the invocation runnable
    retryable: false
---

# TASK-ERR-0014 Make live-index reconciliation exception safe, observable, and argv bounded

## Problem

`runWithSealedTaskScopedCommitIndex` reconciles the live shared index after a
task-scoped commit moves HEAD through a sealed candidate index. Three defects
were found by review of the landed implementation.

1. Reconciliation sits on the straight-line path after `input.run(env)`. If
   `run` throws after the commit object was created, reconciliation never runs.
   HEAD has advanced but the live index still holds pre-commit blobs for every
   committed path, which resurfaces them as unowned staged residue.
2. `withTaskScopedCommitIndex` returns only `.result`, so `reconciledPaths`,
   `retainedPaths`, and the retention reason are computed and discarded. A
   concurrent retention is invisible to the operator, who then sees staged
   paths after a green commit with no explanation.
3. Every bundle path is splatted into single `git ls-files` and `git add`
   invocations. A release-style bundle reaches the Windows 32767-byte
   CreateProcess limit, so the governed commit fails on large bundles. The
   stdin pathspec route is not available: this repository actively blocks
   `git add --pathspec-from-file=-` because it hangs the commit.

## Acceptance

- ACC-1 A commit error raised after HEAD advanced still reconciles the live
  index, and the original error reaches the caller unswallowed.
- ACC-2 A commit error raised before HEAD advanced performs no reconciliation
  and leaves the index byte-identical.
- ACC-3 The production caller receives a small stable result carrying
  reconciled paths, retained paths, retention reasons, and any reconciliation
  failure, so a non-clean index is never reported as clean.
- ACC-4 Pathspec batching is derived from an argv byte estimate and a platform
  budget, preserves sort order, dedupe, and result equivalence, and is
  identical in interface on Windows and POSIX.
- ACC-5 A single pathspec that alone exceeds the budget fails closed with a
  diagnosable error rather than producing a truncated or silently partial run.

## Out of scope

- ATM-GOV-0329 catalog, validator profile, and CI workflow.
- `scripts/sealed-build-output-ownership.ts`.
- `tests/cli/repair-closure-emergency-atomicity.test.ts` and
  `tests/cli/closure-repair-write-ticket-commit.test.ts`.
- `packages/cli/src/commands/git-governance/implementation/commit-execution.ts`.
  Observability is delivered inside `git-index-transaction.ts`, which already
  owns the index-transaction observation surface.
