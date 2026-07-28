---
task_id: TASK-RFT-0073
title: Split atm-chart command below 600 lines
status: done
owner: atm-cli
priority: P1
depends_on:
  - TASK-RFT-0072
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0073-atm-chart-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/atm-chart.ts
  - packages/cli/src/commands/atm-chart/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - tests/cli/atm-chart-final-600.test.ts
deliverables:
  - packages/cli/src/commands/atm-chart.ts
  - packages/cli/src/commands/atm-chart/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - tests/cli/atm-chart-final-600.test.ts
validators:
  - node --strip-types tests/cli/atm-chart-final-600.test.ts
  - node atm.mjs atm-chart render --json
  - node atm.mjs atm-chart verify --json
  - npm run typecheck
  - npm run validate:governance-projections
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atom-cli-atm-chart
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.cli-atm-chart-command-map
      pattern: Facade
      source: packages/cli/src/commands/atm-chart.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T07:15:15.549Z"
completed_by_agent: "codex-task-rft-0073"
closedAt: "2026-07-16T07:15:15.549Z"
closedByActor: "codex-task-rft-0073"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T07-15-15-439Z-close-4f06fb755158"
lastTransitionAt: "2026-07-16T07:15:15.549Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f9663ad1cf2dca8c8680cdeb3e873b948afd43c6"
---

# TASK-RFT-0073 - Split Atm-Chart Command Below 600 Lines

## Goal

Split `packages/cli/src/commands/atm-chart.ts` into a small command facade plus bounded helper modules while preserving render, verify, summary loading, compatibility matrix, downgrade detection, and version compatibility behavior.

## Acceptance

- `packages/cli/src/commands/atm-chart.ts` keeps the existing public exports and command entry behavior.
- Helper modules live under `packages/cli/src/commands/atm-chart/`.
- Every touched physical TypeScript file is below 600 lines.
- `owner-shard-cli.json` explicitly maps the facade and helper directory to the atm-chart command atom/map.
- Focused final-600 guard proves line budgets, facade delegation, and owner-shard coverage.
- Existing `atm-chart render`, `atm-chart verify`, typecheck, governance projection validation, and CLI validation pass.

## Out Of Scope

- Changing ATMChart markdown format.
- Changing compatibility matrix semantics.
- Changing release artifacts under `release/**`.
