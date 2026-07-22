---
task_id: ATM-GOV-0258
title: Broker-managed transactional stage commit queue
status: planned
owner: atm-git-governance
priority: P0
milestone: ATM-3.1-R0.10
severity: P0
depends_on:
  - ATM-GOV-0231
  - ATM-GOV-0249
  - ATM-GOV-0250
  - ATM-GOV-0256
  - ATM-GOV-0257
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 shared-write governance and closeout automation; this card extends the existing branch commit queue and broker/steward surfaces rather than introducing a separate Git isolation model."
scopePaths:
  - packages/cli/src/commands/git.ts
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - packages/cli/src/commands/git-governance/commit-scope-policy.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/command-specs/git.spec.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/framework-development/build-release-hygiene-hints.ts
  - packages/core/src/broker/shared-surface-queue.ts
  - packages/core/src/broker/shared-delivery-commit.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/shared-delivery-commit-executor.test.ts
  - tests/cli/real-shared-delivery-commit-executor.test.ts
  - tests/cli/runner-sync-steward-release.test.ts
  - tests/cli/transactional-commit-queue-isolation.test.ts
deliverables:
  - packages/cli/src/commands/git.ts
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - packages/cli/src/commands/git-governance/commit-scope-policy.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/command-specs/git.spec.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/framework-development/build-release-hygiene-hints.ts
  - packages/core/src/broker/shared-surface-queue.ts
  - packages/core/src/broker/shared-delivery-commit.ts
  - tests/cli/transactional-commit-queue-isolation.test.ts
validators:
  - node --strip-types tests/cli/transactional-commit-queue-isolation.test.ts
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - node --strip-types tests/cli/shared-delivery-commit-executor.test.ts
  - node --strip-types tests/cli/runner-sync-steward-release.test.ts
  - npm run validate:cli
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: broker-managed-transactional-commit-queue-red-green
rollback:
  strategy: revert-commit-and-retain-existing-branch-commit-queue
  notes: "Rollback may keep the current branch-commit serialization behavior, but must not claim autonomous multi-actor closeout if agents still manually share the git index or require human-staged release artifact commits."
atomizationImpact:
  ownerAtomOrMap: atm.git-governance-commit-queue
  mapUpdates: []
  extractionCandidates:
    - atom: atm.transactional-stage-commit-request
      pattern: Policy Object
      source: packages/cli/src/commands/git-governance/implementation.ts
      disposition: extract
    - atom: atm.release-artifact-commit-request
      pattern: Command Facade
      source: packages/cli/src/commands/framework-development/build-release-hygiene-hints.ts
      disposition: extract
---

# ATM-GOV-0258 Broker-managed transactional stage commit queue

## Intent

Make shared Git delivery a broker-managed transaction instead of a shared-index manual ritual. Multiple captains must be able to submit scoped commit requests to ATM, wait for a queue verdict, and receive a committed SHA or copyable recovery command without manually coordinating `git add`, native `git commit`, framework-temp release artifact claims, or post-close runner receipt cleanup.

This card turns the Plan 3.1 ATM-GOV-0255 dogfood failure mode into a first-class acceptance gate: if one captain has release/build artifacts ready and another captain has an unrelated backlog or planning commit, ATM must serialize and isolate the stage/commit packets rather than forcing one captain to wait because the shared index could mix both actors' files.

## Acceptance

- [ ] A broker-managed commit request envelope exists for task-scoped, framework-temp, post-close release artifact, and planning/backlog projection commits; it carries actor id, task id or framework-temp id, allowed files, sealed-source SHA when applicable, evidence refs, artifact surface, commit message, and expected trailers.
- [ ] The commit queue stages only the request-owned files at queue head, commits with governed trailers, records headShaAtAcquire/headShaAtCommitStart/headShaAfterCommit, then cleans or verifies the index before releasing the queue.
- [ ] Foreign staged files, unowned dirty WIP, manual-review runner receipts, and release artifact residue produce a broker ticket, queue status, or exact recoveryCommand; they must not require human step-by-step staging instructions or a native git fallback to finish ordinary governed delivery.
- [ ] Post-close runner-sync release artifact publication is supported by the same transactional commit path, including release mirrors and `packages/cli/dist`, without requiring a manually pre-approved framework-mode claim when the runner-sync ticket and sealed-source evidence already authorize the surface.
- [ ] Regressions run two actors with disjoint commit requests in one canonical worktree and prove ordered commits, zero cross-actor staged-file leakage, preserved actor/task trailers, and a clean shared index after each commit.
- [ ] Regressions replay the ATM-GOV-0255 case: delivery commit `6a89ed0d2f0c6f61ee0cb6d5dc7f27026716d5f3`, release artifact commit `947c6b7839bb2136ee024a476ade132632d99726`, and backlog gap commit `4695efa3b5694bb030621554f119aeffa07bd8e4`; the new path must complete without manual captain intervention.
- [ ] The final evidence exposes queue wait time, queue position, staged file count, committed file count, manual intervention count, false-block count, actor continuity, sealed-source parity, and runner receipt disposition.
- [ ] Backlog item `ATM-BUG-2026-07-22-228` is linked in delivery evidence and removed from Plan 3.1 open gaps only after command-backed proof shows autonomous transactional commit/stage isolation.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T11:59:42.456Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0258-broker-managed-transactional-stage-commit-queue.task.md","contentDigest":"sha256:2fb40b623e0ad4b071a1c9f2459f540512c7aaa7859d028a890ba4c875631d1a"} -->
