---
task_id: TASK-LANE-0019
title: Persist lane session event history and wire analyzer evidence
status: planned
owner: atm-lane-session
priority: P0
depends_on:
  - TASK-LANE-0018
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/lane-session/events.ts
  - packages/cli/src/commands/lane-session/store.ts
  - packages/cli/src/commands/lane-session/__tests__/events.spec.ts
  - packages/cli/src/commands/lane-session/__tests__/store.spec.ts
  - scripts/analyze-captain-parallel-ledger.ts
  - docs/reports/mao-parallel-routing-benchmark.md
  - .atm/history/evidence/TASK-LANE-0019.*
  - .atm/history/task-events/TASK-LANE-0019/**
  - .atm/history/tasks/TASK-LANE-0019.json
deliverables:
  - packages/cli/src/commands/lane-session/events.ts
  - packages/cli/src/commands/lane-session/store.ts
  - packages/cli/src/commands/lane-session/__tests__/events.spec.ts
  - packages/cli/src/commands/lane-session/__tests__/store.spec.ts
  - scripts/analyze-captain-parallel-ledger.ts
  - docs/reports/mao-parallel-routing-benchmark.md
validators:
  - node --strip-types packages/cli/src/commands/lane-session/__tests__/events.spec.ts
  - node --strip-types packages/cli/src/commands/lane-session/__tests__/store.spec.ts
  - node --strip-types scripts/analyze-captain-parallel-ledger.ts --json
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.lane-session-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.lane-session-event-history
      pattern: Append-only Event Store
      source: packages/cli/src/commands/lane-session/events.ts
      disposition: inline
      inlineReason: Existing lane-session event helpers are the intended owner surface for this durable history.
    - atom: atm.parallel-ledger-analyzer-lane-evidence
      pattern: Analyzer Input Adapter
      source: scripts/analyze-captain-parallel-ledger.ts
      disposition: inline
      inlineReason: The analyzer already owns parallel ledger evidence projection; this card adds lane evidence as a bounded input.
---

# TASK-LANE-0019 - Lane Session Event History Analyzer Evidence

## Context

Lane Session rollout now has real dogfood overlap evidence: `TASK-CODEX-0204`
remained in an active claim window while lane actors completed
`TASK-LANE-0001`, `TASK-LANE-0002`, `TASK-LANE-0003`, and `TASK-LANE-0010`.
That proves task-level parallelism with `maxConcurrency = 2`, but the evidence
is currently reconstructed from task claim windows and git attribution. Lane
session state itself still lives primarily as mutable runtime snapshots under
`.atm/runtime/lane-sessions/`.

## Required Behavior

- Persist lane lifecycle events to an append-only history path such as
  `.atm/history/session-events/<laneId>/`.
- Record enough fields to reconstruct lane id, actor id, task id when known,
  event type, previous state, next state, timestamp, TTL/adoption context, and
  command provenance.
- Preserve the mutable runtime snapshot for current command behavior, but do not
  rely on it as the only historical evidence.
- Extend `scripts/analyze-captain-parallel-ledger.ts` so it can include lane
  event evidence alongside task claim windows and git attribution.
- The analyzer must be able to report the first real lane dogfood overlap as
  `maxConcurrency >= 2` without requiring manual grep or git-log reconstruction.

## Acceptance Criteria

- Lane heartbeat, adopt, sweep, expire, and session lifecycle transitions write
  append-only history records.
- Tests cover event append behavior and confirm historical records are not
  overwritten when the runtime snapshot changes.
- Analyzer output contains lane evidence fields and preserves the existing
  task-event based report.
- Analyzer output can identify the observed `TASK-CODEX-0204` plus
  `TASK-LANE-0001`/`0002`/`0003`/`0010` hard-overlap sample with
  `maxConcurrency >= 2`.
- No source planning cards are created in the ATM target repo; target receives
  only imported `.atm/history/**` ledger state for this card.

## Validation

Run:

```shell
node --strip-types packages/cli/src/commands/lane-session/__tests__/events.spec.ts
node --strip-types packages/cli/src/commands/lane-session/__tests__/store.spec.ts
node --strip-types scripts/analyze-captain-parallel-ledger.ts --json
npm run typecheck
npm run validate:cli
```
