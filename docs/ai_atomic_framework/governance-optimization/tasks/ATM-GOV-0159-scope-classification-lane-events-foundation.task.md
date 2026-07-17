---
task_id: ATM-GOV-0159
title: Add shared code docs ledger scope classification and lane event foundation
status: planned
owner: atm-core
priority: P0
depends_on:
  - TASK-LANE-0010
  - TASK-LANE-0011
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/atm-core-scope.ts
  - packages/core/src/broker/__tests__/atm-core-scope.test.ts
  - packages/cli/src/commands/lane-session/events.ts
  - packages/cli/src/commands/lane-session/__tests__/events.spec.ts
  - packages/cli/src/commands/tasks/task-option-parsers/scope-options.ts
  - docs/governance/command-surface.md
deliverables:
  - packages/core/src/broker/atm-core-scope.ts
  - packages/core/src/broker/__tests__/atm-core-scope.test.ts
  - packages/cli/src/commands/lane-session/events.ts
  - packages/cli/src/commands/lane-session/__tests__/events.spec.ts
validators:
  - node --strip-types packages/core/src/broker/__tests__/atm-core-scope.test.ts
  - node --strip-types packages/cli/src/commands/lane-session/__tests__/events.spec.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.parallel-scope-classification
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.parallel-scope-classifier
      pattern: Policy Object
      source: packages/core/src/broker/atm-core-scope.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0159 - Add Shared Code Docs Ledger Scope Classification And Lane Event Foundation

## Context

F1 is the foundation for the full parallelization pass. Existing gates use
similar but not identical notions of runner-affecting or framework-critical
paths. The new contract makes `code`, `docs`, and `ledger` first-class
classifications so later gates can apply R1-R4 consistently.

This card also closes the lane event foundation gap needed by F5: any broker
ticketing work must be able to append durable events under
`.atm/history/session-events/<laneId>/`. It absorbs the missing
claim-path/event-append coverage that was previously noted for
`TASK-LANE-0019`; analyzer integration can still remain on `TASK-LANE-0019`,
but F-series ticketing must not wait for a second event-foundation card.

## Required Behavior

- Add a shared classifier that accepts a file list and returns a stable
  `scopeClass` containing zero or more of:
  - `code`: `packages/**`, `scripts/**`, `templates/**`, `schemas/**`,
    `atomic_workbench/**`, `release/**`, `package.json`, `package-lock.json`,
    `tsconfig*`, and other build/release/projection source surfaces.
  - `docs`: `docs/**`, `*.md`, and planning/card/blueprint paths that are not
    generated release inputs.
  - `ledger`: `.atm/**`.
- Treat ambiguous projection inputs such as `docs/governance/*.json` as
  explicitly classified in tests so later gates do not drift.
- Add task-card contract support for derived `scopeClass`; explicit overrides
  must be recorded in evidence and may not downgrade a code path to docs.
- Ensure lane event append helpers write durable append-only records under
  `.atm/history/session-events/<laneId>/` and are callable from claim/broker
  paths.
- Preserve R1: same-card second-lane claims remain hard conflict and do not
  enter the broker ticket queue.

## Acceptance Criteria

- Classification tests cover code, docs, ledger, mixed scopes, release mirror
  paths, Markdown cards, and governance JSON projection edge cases.
- A task claim or dry-run can expose the derived `scopeClass`.
- Lane event helper tests prove append-only event creation under
  `.atm/history/session-events/<laneId>/`.
- No existing runner-affecting path loses code classification.

## Validation

Run:

```shell
node --strip-types packages/core/src/broker/__tests__/atm-core-scope.test.ts
node --strip-types packages/cli/src/commands/lane-session/__tests__/events.spec.ts
npm run typecheck
```

## Rollback

Revert the implementation and tests. Later F-series cards must not proceed
without a shared classifier.
