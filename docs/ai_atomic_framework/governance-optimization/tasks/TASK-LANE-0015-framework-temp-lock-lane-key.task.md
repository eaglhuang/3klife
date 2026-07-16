---
task_id: TASK-LANE-0015
title: Framework temp lock lane key
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
  - packages/cli/src/commands/framework-development/temp-claim.ts
  - packages/cli/src/commands/framework-development/__tests__/temp-claim.spec.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
deliverables:
  - packages/cli/src/commands/framework-development/temp-claim.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
validators:
  - node --strip-types packages/cli/src/commands/framework-development/__tests__/temp-claim.spec.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert framework temp lock key derivation to actor-only behavior.
atomizationImpact:
  ownerAtomOrMap: atm.framework-development-temp-claim
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.framework-temp-lock-lane-key
      pattern: Policy Object
      source: packages/cli/src/commands/framework-development/temp-claim.ts
      disposition: follow-up-card
      inlineReason: null
outOfScope:
  - Task claim conflict arbitration
  - Branch commit queue ownership
nonGoals:
  - Do not remove actor id from framework temp lock diagnostics.
---

# TASK-LANE-0015 - Framework Temp Lock Lane Key

## Goal

Make framework-mode temporary locks use lane identity when available, so two
conversations with the same actor handle do not collapse into the same
temporary framework lock.

## Acceptance

- Framework temp lock ids include lane identity when a lane is available.
- Actor-only locks remain readable and releasable.
- Stale-lock cleanup reports both actor id and lane id when present.
- Regression tests cover same actor with different lanes and legacy actor-only
  locks.
