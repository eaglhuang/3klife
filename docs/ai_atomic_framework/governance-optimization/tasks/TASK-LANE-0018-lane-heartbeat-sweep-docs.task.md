---
task_id: TASK-LANE-0018
title: Lane heartbeat sweep analyzer and docs
status: done
owner: atm-core
priority: P1
depends_on:
  - TASK-LANE-0014
  - TASK-LANE-0017
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/lane.ts
  - packages/cli/src/commands/lane-session/store.ts
  - packages/cli/src/commands/lane-session/events.ts
  - docs/governance/error-code-registry.json
  - docs/governance/command-surface.md
  - tests/cli/cli-result-contract.test.ts
deliverables:
  - packages/cli/src/commands/lane.ts
  - packages/cli/src/commands/lane-session/store.ts
  - docs/governance/error-code-registry.json
  - docs/governance/command-surface.md
validators:
  - node atm.mjs lane status --json
  - node --strip-types tests/cli/cli-result-contract.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Remove heartbeat, sweep, analyzer, and error-code additions.
atomizationImpact:
  ownerAtomOrMap: atm.lane-session-runtime
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.lane-heartbeat-sweep
      pattern: Policy Object
      source: packages/cli/src/commands/lane-session/store.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - Claim conflict policy
  - Git commit attribution
nonGoals:
  - Do not make lane sweep destructive without explicit command-backed evidence.
completed_at: "2026-07-16T19:13:45.629Z"
completed_by_agent: "codex-lane-0018"
closedAt: "2026-07-16T19:13:45.629Z"
closedByActor: "codex-lane-0018"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T19-13-45-537Z-close-0d5c8cba2d78"
lastTransitionAt: "2026-07-16T19:13:45.629Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "7eaeb3d0deb76e2d6e8c7706de26d67a06e33b74"
---

# TASK-LANE-0018 - Lane Heartbeat Sweep Analyzer and Docs

## Goal

Finish the lane-session rollout with lifecycle maintenance: heartbeat, stale
sweep/analyzer output, and canonical error-code documentation for lane session
states.

## Acceptance

- Lane sessions can record heartbeat events.
- Stale lanes can be reported and swept through explicit command-backed
  behavior.
- Error-code registry covers lane minted, stale env, adoptable, adoption denied,
  and sweep outcomes.
- Command surface docs describe `atm lane` in neutral English.
- Validation proves the optional lane envelope remains schema compatible.
