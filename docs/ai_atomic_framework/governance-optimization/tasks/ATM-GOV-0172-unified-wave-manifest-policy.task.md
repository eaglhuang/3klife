---
task_id: ATM-GOV-0172
title: Unified Wave Manifest and Policy
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0162
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  The source plan assigned this foundation to ATM-GOV-0168, but ATM-GOV-0168
  and ATM-GOV-0169 were already closed as prerequisite lane/foreign-WIP repair
  cards. This card preserves the plan's first missing functional deliverable in
  the next free GOV slot without rewriting closed ledger history.
scopePaths:
  - packages/core/src/broker/wave-manifest.ts
  - packages/core/src/broker/__tests__/wave-manifest.test.ts
  - packages/core/src/index.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - .atm/history/evidence/ATM-GOV-0172.*
  - .atm/history/task-events/ATM-GOV-0172/**
  - .atm/history/tasks/ATM-GOV-0172.json
deliverables:
  - packages/core/src/broker/wave-manifest.ts
  - packages/core/src/broker/__tests__/wave-manifest.test.ts
  - packages/core/src/index.ts
validators:
  - node --strip-types packages/core/src/broker/__tests__/wave-manifest.test.ts
  - npm run typecheck
  - npm run validate:atomization-coverage
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.wave-manifest-policy
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.wave-manifest-policy
      pattern: Schema plus Policy Object
      source: packages/core/src/broker/wave-manifest.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-e2e-2026-07
surfaceFamily: broker-core
completed_at: "2026-07-18T16:04:26.037Z"
completed_by_agent: "codex-gpt-5-captain"
closedAt: "2026-07-18T16:04:26.037Z"
closedByActor: "codex-gpt-5-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T16-04-25-894Z-close-f908b277cb6d"
lastTransitionAt: "2026-07-18T16:04:26.037Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e6a41ad1a9277a317b869656aa6494cc74d7077b"
---

# ATM-GOV-0172 - Unified Wave Manifest and Policy

## Context

The end-to-end auto-batch product model is: Batch selects cards, Team Wave does
the work, Broker batches shared writes, and Checkpoint closes tasks. Existing
Batch, Team Wave, broker ticket, and checkpoint pieces need one shared manifest
contract before executor and close integration can be made durable.

## Required Behavior

- Add `atm.waveManifest.v1` as the shared manifest contract for waves.
- Model lifecycle states: `planned`, `admitted`, `executing`,
  `ready-for-write`, `writing`, `ready-to-close`, `closed`, `needs-review`,
  `failed-retryable`, and `failed-terminal`.
- Include wave id, batch run id, sealed base sha, coordinator, executor, tasks,
  lane sessions, claims, scopes, validators, broker tickets, shared receipts,
  and timing fields.
- Provide deterministic policy helpers for related-task eligibility using wave
  id, target repo, dependency readiness, validators, and surface family.
- Provide a compatibility adapter from legacy `atm.teamWaveEnvelope.v1`.
- Keep this card foundation-only: no executor, commit batching, build batching,
  checkpoint integration, or default-on behavior.

## Acceptance Criteria

- Tests create, validate, transition, and summarize a wave manifest.
- A legacy team-wave envelope converts into a valid wave manifest.
- Incompatible repo, wave id, or surface family inputs fail eligibility with
  machine-readable reasons.
- Manifest state transitions reject invalid lifecycle jumps.

## Validation

Run:

```shell
node --strip-types packages/core/src/broker/__tests__/wave-manifest.test.ts
npm run typecheck
npm run validate:atomization-coverage
```

## Rollback

Revert the implementation, tests, and atomization map entry. Later cards fall
back to existing Team Wave envelope and broker ticket contracts.
