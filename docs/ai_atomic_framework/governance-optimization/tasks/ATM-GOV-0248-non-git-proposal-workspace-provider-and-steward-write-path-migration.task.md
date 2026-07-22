---
task_id: ATM-GOV-0248
title: Non-Git proposal workspace provider and steward write-path migration
status: planned
owner: atm-team-agents
priority: P0
milestone: ATM-3.1-R0
severity: P0
depends_on:
  - ATM-GOV-0247
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 execution evidence; this migrates the existing Team workspace adapter without creating a second broker or task model."
scopePaths:
  - packages/cli/src/commands/team/proposal-workspace.ts
  - packages/cli/src/commands/team/shadow-workspace.ts
  - packages/cli/src/commands/team/shadow-plan.ts
  - packages/cli/src/commands/team/scheduler.ts
  - packages/cli/src/commands/team-wave.ts
  - tests/cli/team-proposal-workspace.test.ts
  - tests/cli/team-shadow-workspace.test.ts
  - tests/cli/team-plan-contract.test.ts
  - tests/cli/team-contribution-composer.test.ts
deliverables:
  - packages/cli/src/commands/team/proposal-workspace.ts
  - packages/cli/src/commands/team/shadow-workspace.ts
  - packages/cli/src/commands/team/shadow-plan.ts
  - packages/cli/src/commands/team/scheduler.ts
  - packages/cli/src/commands/team-wave.ts
  - tests/cli/team-proposal-workspace.test.ts
  - tests/cli/team-plan-contract.test.ts
validators:
  - node --strip-types tests/cli/team-proposal-workspace.test.ts
  - node --strip-types tests/cli/team-shadow-workspace.test.ts
  - node --strip-types tests/cli/team-plan-contract.test.ts
  - node --strip-types tests/cli/team-contribution-composer.test.ts
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: non-git-bounded-proposal-provider-receipts
rollback:
  strategy: revert-commit-and-trip-queue-only
  notes: "Do not restore detached-worktree development as a fallback; retain proposals and run queue-only while the provider is repaired."
atomizationImpact:
  ownerAtomOrMap: atm.team.proposal-workspace
  mapUpdates: []
  extractionCandidates:
    - atom: atm.team.proposal-workspace
      pattern: Workspace Adapter
      source: packages/cli/src/commands/team/proposal-workspace.ts
      disposition: extract
---

# ATM-GOV-0248 Non-Git proposal workspace provider and steward write-path migration

## Intent

Replace Team Agents' `ephemeral-detached-worktree` development provider with a
bounded, non-Git proposal workspace. The provider materializes only the sealed
base blobs and declared logical scopes needed by a worker, produces immutable
patch/mutation proposals, and hands them to the existing adapter,
transactional-composer, neutral-steward, and shared-delivery pipeline.

This is an adapter migration, not a new broker, merge engine, or task model.
`shadow-workspace.ts` may remain temporarily as a compatibility facade, but it
must no longer invoke Git or expose detached-worktree semantics.

## Acceptance

- [ ] The canonical provider mode is a versioned `bounded-proposal-tree` contract containing canonical root/base/HEAD digests, declared files/intents, immutable base blobs/hashes, and an output proposal root; it has no branch, worktree, merge, rebase, or alternate-index fields.
- [ ] Provisioning never executes `git worktree`, `git branch`, `git switch`, `git merge`, `git rebase`, or task-local `GIT_INDEX_FILE`. It cannot mutate the canonical worktree or `.atm` runtime state.
- [ ] Only declared files/atoms/anchors/ranges are materialized. Any added surface requires broker re-arbitration before proposal generation continues.
- [ ] Worker output is normalized into the existing `PatchProposal`/mutation request contracts. Existing format adapters and transactional composer remain the merge authority; no file-type or task-specific merge branches are added to Team code.
- [ ] The neutral steward is the only component that applies composed shared-file output to the canonical worktree. Shared delivery emits one commit receipt with complete member attribution and HEAD/CAS evidence.
- [ ] `shadow-workspace.ts`, if retained for compatibility, is a thin deprecated alias over the new provider and contains no Git process execution. The compatibility period and removal condition are explicit.
- [ ] Short English comments explain the base-tree immutability boundary, proposal-only worker contract, and why canonical writes are delegated to the steward.
- [ ] Focused tests prove two same-file disjoint mutations compose from one immutable base, a true overlapping mutation is queued/revalidated, stale base is rejected, undeclared file access fails closed, and no Git topology command is spawned.
- [ ] Scheduler and Team plan output use provider capabilities/data, not provider/task/path hardcoding; unknown provider versions fail closed and trip queue-only.

## Evidence and rollback

Seal provider manifest/base digests, proposal digests, adapter decisions,
compose/queue selections, steward journal, shared-delivery attribution, and a
process-spawn audit proving no Git topology command executed. Rollback keeps
queue-only and retained proposals; it must not restore detached-worktree
development.

## Atomization impact

- owner atom/map: `atm.team.proposal-workspace`
- extraction candidate: `proposal-workspace.ts` owns bounded base/proposal transport only; conflict decisions remain in existing broker adapters/composer.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T02:25:59.445Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0248-non-git-proposal-workspace-provider-and-steward-write-path-migration.task.md","contentDigest":"sha256:4b2ac7e136000cffb6007c653c7e13d65a660b9d8124d60086ff407373728019"} -->
