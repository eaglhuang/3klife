---
task_id: TASK-LANE-0017
title: Lane-aware claim conflict and broker lifecycle
status: done
owner: atm-core
priority: P0
depends_on:
  - TASK-LANE-0012
  - TASK-LANE-0016
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/next/claim-admission.ts
  - packages/cli/src/commands/next/broker-queue-admission.ts
  - packages/cli/src/commands/next/claim-conflict-log.ts
  - packages/cli/src/commands/broker/implementation.ts
  - packages/cli/src/commands/tasks/claim-repair-diagnostics.ts
  - packages/cli/src/commands/next/__tests__/claim-admission.spec.ts
  - packages/cli/src/commands/next/__tests__/claim-broker-resolution.spec.ts
deliverables:
  - packages/cli/src/commands/next/claim-admission.ts
  - packages/cli/src/commands/next/broker-queue-admission.ts
  - packages/cli/src/commands/next/claim-conflict-log.ts
  - packages/cli/src/commands/broker/implementation.ts
  - packages/cli/src/commands/tasks/claim-repair-diagnostics.ts
validators:
  - node --strip-types packages/cli/src/commands/next/__tests__/claim-admission.spec.ts
  - node --strip-types packages/cli/src/commands/next/__tests__/claim-broker-resolution.spec.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert conflict ownership comparisons to actor-only behavior.
atomizationImpact:
  ownerAtomOrMap: atm.claim-admission-broker-lifecycle
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.lane-aware-owner-comparison
      pattern: Policy Object
      source: packages/cli/src/commands/next/claim-admission.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - Lane adoption command implementation
  - Framework temp lock keying
nonGoals:
  - Do not bypass broker conflict blocked decisions.
completed_at: "2026-07-16T18:58:54.411Z"
completed_by_agent: "codex-lane-0017"
closedAt: "2026-07-16T18:58:54.411Z"
closedByActor: "codex-lane-0017"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T18-58-54-322Z-close-fa4cd2ad1d56"
lastTransitionAt: "2026-07-16T18:58:54.411Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "eced74c7530f0be34f7d4772f7b190096c9325c6"
---

# TASK-LANE-0017 - Lane-aware Claim Conflict and Broker Lifecycle

## Goal

Move active-claim and broker lifecycle ownership checks to the lane migration
rule: compare lane ids when both sides have them, otherwise fall back to actor
ids.

## Acceptance

- Same actor with different lane ids is treated as different ownership when
  both claims include lane ids.
- Same lane is treated as the same owner even when actor metadata differs after
  an explicit adoption/handoff.
- Legacy actor-only records retain current behavior.
- Diagnostics report the comparison mode: `lane-id` or `actor-fallback`.
- Claim repair and broker conflict guidance include lane id where available.
