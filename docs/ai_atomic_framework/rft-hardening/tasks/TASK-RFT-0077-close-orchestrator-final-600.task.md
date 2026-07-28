---
task_id: TASK-RFT-0077
title: Split close orchestrator below 600 lines
status: done
owner: atm-cli
priority: P1
depends_on:
  - TASK-RFT-0076
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0077-close-orchestrator-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/close-orchestrator.ts
  - packages/cli/src/commands/tasks/close-orchestrator/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - tests/cli/close-orchestrator-final-600.test.ts
deliverables:
  - packages/cli/src/commands/tasks/close-orchestrator.ts
  - packages/cli/src/commands/tasks/close-orchestrator/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - tests/cli/close-orchestrator-final-600.test.ts
validators:
  - node --strip-types tests/cli/close-orchestrator-final-600.test.ts
  - node atm.mjs doctor --json
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-close-orchestrator-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.taskflow-close-orchestrator-map
      pattern: Facade
      source: packages/cli/src/commands/tasks/close-orchestrator.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T09:24:54.103Z"
completed_by_agent: "codex-task-rft-0077"
closedAt: "2026-07-16T09:24:54.103Z"
closedByActor: "codex-task-rft-0077"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T09-24-54-006Z-close-5ebd1557d868"
lastTransitionAt: "2026-07-16T09:24:54.103Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b7f387089d0935895fa435876c31a8160f42f27d"
---

# TASK-RFT-0077 - Split Close Orchestrator Below 600 Lines

## Goal

Split `packages/cli/src/commands/tasks/close-orchestrator.ts` into a bounded facade plus helper modules while preserving the `taskflow close` orchestration contract, closeback planning behavior, governed commit bundle assembly, and historical-delivery close flow.

## Acceptance

- `packages/cli/src/commands/tasks/close-orchestrator.ts` remains the stable public orchestration entry and keeps its exported call surface compatible.
- Helper modules live under `packages/cli/src/commands/tasks/close-orchestrator/`.
- Every touched physical TypeScript file is below 600 lines.
- `owner-shard-cli.json` explicitly maps the facade and helper directory to `atm.taskflow-close-orchestrator-map`.
- Focused final-600 guard proves line budgets, facade/helper coverage, and owner-shard coverage.
- Existing doctor, typecheck, and CLI validation pass.

## Out Of Scope

- Changing taskflow close semantics, closeback authority, closure packet semantics, or governed commit bundle behavior.
- Changing direct `tasks close` backend policy.
- Changing generated release artifacts under `release/**`.
