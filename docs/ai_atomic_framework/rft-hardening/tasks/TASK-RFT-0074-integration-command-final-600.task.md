---
task_id: TASK-RFT-0074
title: Split integration command below 600 lines
status: done
owner: atm-cli
priority: P1
depends_on:
  - TASK-RFT-0073
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0074-integration-command-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/integration.ts
  - packages/cli/src/commands/integration/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - tests/cli/integration-final-600.test.ts
deliverables:
  - packages/cli/src/commands/integration.ts
  - packages/cli/src/commands/integration/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - tests/cli/integration-final-600.test.ts
validators:
  - node --strip-types tests/cli/integration-final-600.test.ts
  - node atm.mjs integration list --json
  - node atm.mjs integration verify codex --json
  - npm run typecheck
  - npm run validate:governance-projections
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atom-cli-integration-command
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.cli-integration-command-map
      pattern: Facade
      source: packages/cli/src/commands/integration.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T07:26:46.278Z"
completed_by_agent: "codex-task-rft-0074"
closedAt: "2026-07-16T07:26:46.278Z"
closedByActor: "codex-task-rft-0074"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T07-26-46-278Z-close-badaeeb1f0cf"
lastTransitionAt: "2026-07-16T07:26:46.278Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e59b08a4258593e89771d1fe77ebff57b27faf48"
---

# TASK-RFT-0074 - Split Integration Command Below 600 Lines

## Goal

Split `packages/cli/src/commands/integration.ts` into a small command facade plus bounded helper modules while preserving integration adapter discovery, current editor detection, install, verify, remove, list, and status behavior.

## Acceptance

- `packages/cli/src/commands/integration.ts` keeps the existing public exports and command entry behavior.
- Helper modules live under `packages/cli/src/commands/integration/`.
- Every touched physical TypeScript file is below 600 lines.
- `owner-shard-cli.json` explicitly maps the facade and helper directory to the integration command atom/map.
- Focused final-600 guard proves line budgets, facade delegation, and owner-shard coverage.
- Existing `integration list`, `integration verify codex`, typecheck, governance projection validation, and CLI validation pass.

## Out Of Scope

- Changing adapter manifest format.
- Changing editor detection semantics.
- Changing install/remove/verify behavior.
- Changing release artifacts under `release/**`.
