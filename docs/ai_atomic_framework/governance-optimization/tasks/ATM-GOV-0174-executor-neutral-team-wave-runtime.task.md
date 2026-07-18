---
task_id: ATM-GOV-0174
title: Executor-Neutral Team Wave Runtime
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0172
  - ATM-GOV-0173
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  ATM-GOV-0168 through ATM-GOV-0171 were occupied by prerequisite safety work.
  ATM-GOV-0172 delivered the unified wave manifest, and ATM-GOV-0173 connected
  Batch selection to that manifest. This card is the next free GOV slot and
  implements the remapped Executor-Neutral Team Wave Runtime stage from the
  approved end-to-end auto-batch plan.
scopePaths:
  - packages/cli/src/commands/team-wave.ts
  - packages/cli/src/commands/team/**
  - packages/cli/src/commands/team.ts
  - packages/cli/src/commands/command-specs/team.spec.ts
  - packages/core/src/broker/wave-manifest.ts
  - packages/core/src/broker/team-wave-envelope.ts
  - packages/core/src/broker/team-worker-report.ts
  - tests/cli/team-wave-runtime-manifest.test.ts
  - docs/governance/command-surface.md
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - .atm/history/evidence/ATM-GOV-0174.*
  - .atm/history/task-events/ATM-GOV-0174/**
  - .atm/history/tasks/ATM-GOV-0174.json
deliverables:
  - packages/cli/src/commands/team-wave.ts
  - packages/cli/src/commands/team/**
  - tests/cli/team-wave-runtime-manifest.test.ts
  - docs/governance/command-surface.md
validators:
  - node --strip-types tests/cli/team-wave-runtime-manifest.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.team-wave-runtime
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.team-wave-runtime
      pattern: Executor Adapter plus Result Contract
      source: packages/cli/src/commands/team-wave.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-e2e-2026-07
surfaceFamily: team-wave-runtime
completed_at: "2026-07-18T17:33:48.621Z"
completed_by_agent: "codex-gov-auto-batch"
closedAt: "2026-07-18T17:33:48.621Z"
closedByActor: "codex-gov-auto-batch"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T17-33-48-621Z-close-d011d8292419"
lastTransitionAt: "2026-07-18T17:33:48.621Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ed3de81e0a01bb72929d5539380fdf53cb3178a9"
---

# ATM-GOV-0174 - Executor-Neutral Team Wave Runtime

## Context

The approved product model is: Batch selects cards, Team Wave does the work,
Broker batches shared writes, and Checkpoint closes tasks. ATM-GOV-0173 now lets
`batch current --compact` emit a deterministic wave manifest candidate. This
card makes `team wave plan|dispatch` consume that manifest through an
executor-neutral runtime contract without creating a fourth batch lifecycle.

## Required Behavior

- Add or extend `team wave plan|dispatch --batch <id> --wave <id>
  [--executor auto|local-lanes|editor-subagents|team-agents]` so it consumes the
  shared `atm.waveManifest.v1` shape.
- Bind each manifest member to a deterministic lane/workspace plan. For this
  card, local execution may be a dry-run planning/runtime envelope, but the
  contract must be executor-neutral.
- Workers may only return `atm.patchEnvelope.v1` references, validator evidence,
  timing, and status. They must not commit or close tasks.
- Coordinator output must preserve task attribution and fail closed with
  `needs-review` when a member reports files outside its declared scope.
- A failed or partial member can be marked defer/reseal before shared writes;
  if fewer than two members remain, the wave degrades to the existing serial
  path.
- The command must emit a stable machine-readable runtime result suitable for
  later Broker and Checkpoint cards.

## Acceptance Criteria

- A fixture manifest with two eligible members produces deterministic lane
  assignments and an executor-neutral dispatch envelope.
- Out-of-scope reported files cause a `needs-review` result with the offending
  task and files listed.
- A partial member can be deferred while preserving the rest of the manifest,
  and a one-member remainder reports serial fallback.
- `team wave` does not stage, commit, build, project, or close tasks.

## Validation

Run:

```shell
node --strip-types tests/cli/team-wave-runtime-manifest.test.ts
npm run typecheck
npm run validate:cli
```

## Rollback

Revert the team wave runtime command changes, focused tests, docs, and
atomization map entries. Existing legacy `team wave` command behavior remains
the compatibility fallback.
