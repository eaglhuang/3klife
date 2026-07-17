---
task_id: ATM-GOV-0162
title: Add related-task batching for commit build and projection windows
status: planned
owner: atm-core
priority: P1
depends_on:
  - ATM-GOV-0161
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/branch-commit-queue-gate.ts
  - packages/cli/src/commands/tasks/import.ts
  - tests/cli/related-task-batching-wave-surface.test.ts
  - docs/governance/command-surface.md
deliverables:
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - tests/cli/related-task-batching-wave-surface.test.ts
validators:
  - node --strip-types packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
  - node --strip-types tests/cli/related-task-batching-wave-surface.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.related-task-batching
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.wave-surface-batch-eligibility
      pattern: Policy Object
      source: packages/core/src/broker/runner-sync-steward-queue.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0162 - Add Related-Task Batching For Commit Build And Projection Windows

## Context

F6 implements ruling R3. The single main branch remains the accepted minimum
serial core, but related tasks from the same wave and compatible surface family
should share commit/build/projection windows where the broker can prove they
belong together. Unrelated tasks must not be silently merged into the same
commit.

## Required Behavior

- Add `waveId` support to the task-card contract and imported task snapshot.
- Add broker batch verbs or equivalent queue decisions for:
  - commit batching
  - build batching
  - projection batching
- A ticket is batch eligible only when:
  - the task has a `waveId`;
  - the candidate tickets share the same `waveId`;
  - surface families are compatible;
  - claims and scope boundaries remain valid for every member;
  - evidence can identify every task included in the shared window.
- A task without `waveId`, a cross-wave task, or an incompatible surface family
  must receive its own queue position and own commit/build/projection window.
- Evidence and analyzer reports expose `batchRate` and `buildsPerWave`.
- Absorb the intent of backlog 011/190 without changing R1 same-card conflict
  semantics.

## Acceptance Criteria

- Same-wave compatible tasks can share a build/projection/commit window.
- Cross-wave or missing-wave tasks do not batch.
- Incompatible surface families do not batch.
- Batch evidence lists all task ids, ticket ids, shared surface family, and
  validators used for the shared window.
- Analyzer fixtures can compute `batchRate` and `buildsPerWave`.

## Validation

Run:

```shell
node --strip-types packages/core/src/broker/__tests__/runner-sync-steward-queue.test.ts
node --strip-types tests/cli/related-task-batching-wave-surface.test.ts
npm run typecheck
npm run validate:cli
```

## Rollback

Revert the implementation and tests. Broker tickets remain serial per task and
commit/build/projection batching is disabled.
