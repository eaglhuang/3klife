---
task_id: TASK-LANE-0013
title: Lane commit attribution
status: planned
owner: atm-core
priority: P0
depends_on:
  - TASK-LANE-0012
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/__tests__/commit-scope-policy.spec.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
validators:
  - node --strip-types packages/cli/src/commands/git-governance/__tests__/commit-scope-policy.spec.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert ATM_COMMIT_LANE_SESSION_ID propagation and commit trailer/env additions.
atomizationImpact:
  ownerAtomOrMap: atm.git-governance-commit
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.commit-lane-attribution
      pattern: Policy Object
      source: packages/cli/src/commands/git-governance/implementation.ts
      disposition: follow-up-card
      inlineReason: null
outOfScope:
  - Reusing ATM_COMMIT_SESSION_ID for lane identity
  - Changing git author name or email semantics
nonGoals:
  - Do not require lane attribution for legacy commits.
---

# TASK-LANE-0013 - Lane Commit Attribution

## Goal

Propagate `ATM_COMMIT_LANE_SESSION_ID` through governed commit paths so commits
can be attributed to a lane session without overloading actor work-session ids.

## Acceptance

- Governed `git commit` receives `ATM_COMMIT_LANE_SESSION_ID` when a lane is
  available.
- Taskflow target and planning close commits include lane attribution in their
  sanitized env when available.
- Commit trailers or evidence expose lane identity without changing existing
  `ATM-Actor`, `ATM-Task`, or `ATM-Session` semantics.
- Actor-only commits still pass existing governance checks.

## Notes

This task is attribution only. Conflict arbitration still lands in
`TASK-LANE-0017`.
