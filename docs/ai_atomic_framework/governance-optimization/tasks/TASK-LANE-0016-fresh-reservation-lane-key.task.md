---
task_id: TASK-LANE-0016
title: Fresh task reservation lane key
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
  - packages/cli/src/commands/next/__tests__/fresh-task-reservation.spec.ts
  - packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
deliverables:
  - packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
validators:
  - node --strip-types packages/cli/src/commands/next/__tests__/fresh-task-reservation.spec.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert fresh reservation keying to actor-only behavior.
atomizationImpact:
  ownerAtomOrMap: atm.next-fresh-task-reservation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.fresh-reservation-lane-key
      pattern: Policy Object
      source: packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - Broker conflict decisions
  - Commit attribution
nonGoals:
  - Do not change task ranking order except for lane ownership identity.
---

# TASK-LANE-0016 - Fresh Task Reservation Lane Key

## Goal

Fresh task reservation should distinguish concurrent conversations that share an
actor handle by comparing lane identity when it exists.

## Acceptance

- Same actor with different lane ids can receive separate fresh reservations
  when scopes permit.
- Same lane keeps existing reservation reuse behavior.
- Actor-only legacy reservation behavior remains unchanged.
- Diagnostics show lane id and actor id when both are available.
