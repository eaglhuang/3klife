---
task_id: ATM-GOV-0265
title: Shared mutation finalization and sealed runner publication
status: done
owner: atm-shared-mutation-runtime
priority: P0
milestone: ATM-3.1-R0Q.3
severity: P0
depends_on:
  - TASK-LANE-0022
causalGraph:
  causalDependencies:
    - TASK-LANE-0022
  startConditions:
    - canonical mutation capability is available for commit and publication adapters
  softRelations:
    - ATM-BUG-2026-07-21-220
    - ATM-BUG-2026-07-22-228
  changedPublicSeams:
    - branch commit coordination
    - sealed runner publication lifecycle
  causalImpactEdges:
    - commit-candidate-to-branch-finalization
    - sealed-source-to-published-runner-and-archived-receipt
  parallelFrontierInputs:
    - TASK-SKL-0028
  validatorReferences:
    - test_int_branch_commit_orphan_recovery
    - test_int_sealed_runner_publication_lifecycle
  phaseOwner: shared-mutation-finalization
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns the end-to-end shared mutation finalization path. Branch commit liveness and sealed runner publication are delivered together as one usable vertical slice, while remaining separate deep modules inside the card."
scopePaths:
  - packages/cli/src/commands/git-governance/branch-commit-coordinator.ts
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/internal-release/publication.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - scripts/run-sealed-runner-build.ts
  - scripts/runner-sync-incremental-build.ts
  - scripts/build-root-drop-release.ts
  - scripts/build-onefile-release.ts
  - scripts/build-release-hygiene.ts
  - tests/cli/branch-commit-orphan-recovery.test.ts
  - tests/cli/sealed-runner-publication-lifecycle.test.ts
  - tests/cli/post-close-zero-release-residue.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/branch-commit-coordinator.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - tests/cli/branch-commit-orphan-recovery.test.ts
  - tests/cli/sealed-runner-publication-lifecycle.test.ts
  - tests/cli/post-close-zero-release-residue.test.ts
validators:
  - node --strip-types tests/cli/branch-commit-orphan-recovery.test.ts
  - node --strip-types tests/cli/sealed-runner-publication-lifecycle.test.ts
  - node --strip-types tests/cli/post-close-zero-release-residue.test.ts
  - npm run typecheck
  - npm run validate:cli
errorCodes:
  - ATM_GIT_COMMIT_BRANCH_QUEUE_BUSY
  - ATM_RUNNER_SYNC_STEWARD_REQUIRED
evidence:
  required: shared-mutation-finalization-and-publication-receipt
rollback:
  strategy: revert-adapters-and-retain-fail-closed-queue-state
  notes: "Do not delete receipts or locks manually. Reconciliation must use fenced coordinator state and the sealed publication journal."
atomizationImpact:
  ownerAtomOrMap: atm.shared-mutation-runtime
  mapUpdates: []
  extractionCandidates:
    - atom: atm.branch-commit-coordinator
      pattern: Deep Module
      source: packages/cli/src/commands/git-governance/branch-commit-coordinator.ts
      disposition: extract
    - atom: atm.sealed-runner-publication
      pattern: Durable State Machine
      source: packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-25T13:23:44.847Z"
completed_by_agent: "claude-0265-plan31-captain"
closedAt: "2026-07-25T13:23:44.847Z"
closedByActor: "claude-0265-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-25T13-23-44-701Z-close-97906943410c"
lastTransitionAt: "2026-07-25T13:23:44.847Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c1cd15ea28eee82ab358740f7703d25fd7f013fb"
---

# ATM-GOV-0265 Shared mutation finalization and sealed runner publication

## Intent

Remove the recurring manual captain work between a governed commit candidate
and a clean, published frozen runner. One branch coordinator owns commit-window
acquire/status/reclaim/release semantics; one publication lifecycle owns
reservation, sealed build, publication, receipt archival, and cleanup. The card
contains both modules because Plan3.1 needs one end-to-end autonomous mutation
slice, not a chain of lock, build, receipt, and hygiene microcards.

## Acceptance

- [ ] Before implementation, invoke `atm-deep-module-refactor` separately on branch finalization and runner publication. Seal interfaces, ports, state ownership, deletion tests, and the `deep-module-review:2154f107` / `deep-module-review:2797aed9` baselines.
- [ ] `coordinateBranchCommit(request, snapshot, ports)` is the only branch commit-window policy. It returns acquire/wait/reclaim/release actions, fencing token, idempotency key, exact candidate set, and executable recovery without mutating during planning.
- [ ] A dead owner before commit is recoverable even when HEAD did not move. Reclaim requires expiry, dead/invalid owner proof, unchanged fenced generation, and lane capability; it never relies on manual deletion under `.atm/runtime`.
- [ ] Commit, taskflow close, and batch checkpoint adapters consume the same coordinator plan. No caller re-derives stale-lock, candidate, stage, or queue ownership rules.
- [ ] `publishSealedRunner(request, snapshot, ports)` owns reservation -> build-ready -> built-sealed -> publication-ready -> published -> receipt-archived state and returns one canonical receipt.
- [ ] The publication receipt binds task/lane authority, sealed source SHA, runner/build digest, exact surfaces, generated manifest, publication commit, remote visibility policy, and archived receipt disposition.
- [ ] Taskflow close and internal release use the same publication lifecycle. A successful normal task does not require a later framework-temp hygiene conversation, native pathspec, manual receipt archival, or manual release-artifact commit.
- [ ] Receipt archival is a governed terminal phase, not untracked advisory residue. Repeated publication/reconcile calls are idempotent and never publish the same generation twice.
- [ ] Frozen/source bootstrap is explicit: source-first code may prepare a build, but the hook and final validation run against the sealed newly built runner without circularly requiring the stale runner to approve its own replacement.
- [ ] Tests replay the pre-commit timeout orphan-lock incident, post-close release artifact residue, closed-task receipt rejection, Windows manifest retry, actor drift, and publication interruption at every phase.
- [ ] Deletion tests remove caller-local lock cleanup and post-close publish recipes. Existing framework-mode remains an emergency/manual framework channel, not the normal task publication path.
- [ ] Command-backed evidence reports manual interventions, orphan-lock recovery latency, duplicate publications, unarchived receipts, release-surface residue, actor mismatches, and false blocks; Plan3.1 requires zero manual interventions and zero residue for the N=2 proof.

## Execution boundary

This card depends only on TASK-LANE-0022 because mutation authority is its
security prerequisite. Existing 0256/0258/0260/0261 evidence is consumed as
regression input, not repeated as hard dependency edges. Do not split queue,
build, publication, receipt archival, or cleanup into separate cards.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T16:50:21.374Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0265-shared-mutation-finalization-and-sealed-runner-publication.task.md","contentDigest":"sha256:479570679a35fa130156c229c8e73e4138695b6ba3c591f3e20e52a848945265"} -->
