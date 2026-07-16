---
task_id: TASK-RFT-0068
title: Split CLI route command below 600 lines
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-RFT-0067
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0068-cli-route-command-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/route.ts
  - packages/cli/src/commands/route/**/*.ts
  - tests/cli/route-command-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/route.ts
  - packages/cli/src/commands/route/**/*.ts
  - tests/cli/route-command-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
validators:
  - node --strip-types tests/cli/route-command-final-600.test.ts
  - npm run validate:cli
  - npm run typecheck
  - npm run validate:governance-projections
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.cli-route-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.cli-route-command-map
      pattern: Facade
      source: packages/cli/src/commands/route.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T06:14:10.529Z"
completed_by_agent: "codex-task-rft-0068"
closedAt: "2026-07-16T06:14:10.529Z"
closedByActor: "codex-task-rft-0068"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T06-14-10-529Z-close-c4610b3be1cd"
lastTransitionAt: "2026-07-16T06:14:10.529Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e4a824fd15bf54ec2ff0ff22b681ed965e8f1449"
---

# TASK-RFT-0068 - Split CLI route command below 600 lines

## Goal

Refactor `packages/cli/src/commands/route.ts` into a thin operator-facing facade plus bounded implementation modules owned by `atm.cli-route-command-map`.

## Acceptance

- `packages/cli/src/commands/route.ts` remains the stable command entrypoint.
- Every physical TypeScript file in this task scope is below 600 lines.
- Existing CLI route behavior is preserved.
- A focused final-600 guard verifies the facade and extracted module line counts.
- The CLI owner shard records both the facade and extracted module glob.

## Extraction Plan

Atom: `atm.cli-route-command-map`
Pattern: Facade
Owner module: `packages/cli/src/commands/route/**/*.ts`
Callers: CLI command registry importing `packages/cli/src/commands/route.ts`
Public surface: unchanged exported command handler surface
Focused test: `node --strip-types tests/cli/route-command-final-600.test.ts`
CLI regression: `npm run validate:cli`
Out of scope: behavior changes to route selection, task lifecycle, evidence policy, or governance admission semantics
Commit split: delivery commit first, closeout governance bundle second
