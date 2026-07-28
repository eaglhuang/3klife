---
task_id: ATM-GOV-0158
title: Scope runner-sync foreign WIP admission to build-input conflicts
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0150
  - ATM-GOV-0154
  - ATM-GOV-0159
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - tests/cli/runner-sync-foreign-dirty-owner.test.ts
  - tests/cli/runner-sync-build-script-admission.test.ts
  - docs/governance/command-surface.md
  - docs/governance/error-code-registry.json
deliverables:
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - tests/cli/runner-sync-foreign-dirty-owner.test.ts
  - tests/cli/runner-sync-build-script-admission.test.ts
validators:
  - node --strip-types tests/cli/runner-sync-foreign-dirty-owner.test.ts
  - node --strip-types tests/cli/runner-sync-build-script-admission.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync.coalescing-steward-queue
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.runner-sync-foreign-wip-build-input-admission
      pattern: Policy Object
      source: packages/cli/src/commands/framework-development/runner-sync-admission.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-18T05:54:39.962Z"
completed_by_agent: "atm-core"
closedAt: "2026-07-18T05:54:39.962Z"
closedByActor: "atm-core"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T05-54-39-273Z-close-ec35c9c4bf85"
lastTransitionAt: "2026-07-18T05:54:39.962Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2e476d4c794a342d68d3946a3fd6e957b574fcdb"
---

# ATM-GOV-0158 - Scope Runner-Sync Foreign WIP Admission To Build-Input Conflicts

## Context

`ATM_RUNNER_SYNC_FOREIGN_WIP_BLOCKED` currently protects runner artifacts by
refusing runner-sync builds when unrelated active foreign WIP exists. The
protection target is correct, but the diagnostic is too broad for parallel
development: a sealed build uses the committed `HEAD` tree, so unrelated
uncommitted WIP outside the build-input surface should not be treated the same
as a build-input conflict.

This card refines admission diagnostics and blocking precision. It does not
authorize emergency override and must continue to fail closed for real
build-input conflicts.

This card implements the highest parallel governance principle: Tier 0 reads
and Tier 1 private ledger/evidence/planning writes must not queue behind
unrelated lanes. Runner-sync admission may serialize only Tier 2 shared
build/release/git-index risk, and the blocker must name the concrete
build-input intersection plus the landed-not-closed risk.

## Required Behavior

- Reuse or introduce the same framework build-input path policy as
  `ATM-GOV-0165`.
- When inspecting active foreign claims, compute:
  - `foreignClaimFiles`
  - `buildInputIntersectingFiles`
  - dirty working-tree paths among that intersection
  - landed-but-not-closed evidence when available from task events or committed
    files since claim.
- Block runner-sync admission only for foreign work that has a concrete
  build-input intersection and landed-not-closed build-input delivery risk.
- Do not block merely for dirty foreign uncommitted files that are outside the
  sealed build input set or have not landed in `HEAD`.
- Do not block runner-sync admission solely because a foreign active claim
  exists outside the build-input set.
- Do not treat Tier 0 reads or Tier 1 private ledger/evidence/planning writes
  as runner-sync conflicts unless they also intersect a Tier 2 build/release
  surface.
- Error details for blocked admission must include:
  - `blockingTaskId`
  - `blockingActorId`
  - `blockingLaneSessionId` when available
  - `heartbeatAt`
  - `intersectingFiles`
  - `dirtyIntersectingFiles`
  - a reason code that distinguishes dirty build-input WIP from
    landed-not-closed build-input risk.
- Preserve clear failure for missing runner-sync queue-head ownership and
  release-output dirty paths.

## Acceptance Criteria

- A foreign active claim that touches only ledger, docs, evidence, or planning
  paths no longer causes `ATM_RUNNER_SYNC_FOREIGN_WIP_BLOCKED`.
- A foreign active claim touching `packages/**`, `scripts/**`, `package.json`,
  or another build-input path still blocks only when there is landed-not-closed
  build-input risk.
- Blocked diagnostics identify the specific task, actor, heartbeat, and
  intersecting files.
- Every blocked diagnostic identifies the Tier 2 shared surface that requires
  broker/steward serialization.
- Existing tests for runner-sync queue-head ownership and build-script
  admission still pass.

## Validation

Run:

```shell
node --strip-types tests/cli/runner-sync-foreign-dirty-owner.test.ts
node --strip-types tests/cli/runner-sync-build-script-admission.test.ts
npm run typecheck
npm run validate:cli
```

## Rollback

Revert the implementation and test commit. The previous conservative admission
will return; it may over-serialize parallel work but preserves runner artifact
safety.
