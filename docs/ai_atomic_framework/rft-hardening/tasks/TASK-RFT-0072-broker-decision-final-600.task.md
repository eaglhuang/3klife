---
task_id: TASK-RFT-0072
title: Split broker decision below 600 lines
status: done
owner: atm-core
priority: P1
depends_on:
  - TASK-RFT-0071
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0072-broker-decision-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/decision.ts
  - packages/core/src/broker/decision/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - tests/core/broker-decision-final-600.test.ts
deliverables:
  - packages/core/src/broker/decision.ts
  - packages/core/src/broker/decision/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - tests/core/broker-decision-final-600.test.ts
validators:
  - node --strip-types tests/core/broker-decision-final-600.test.ts
  - npm run typecheck
  - npm run validate:governance-projections
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atom-core-broker
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.broker-decision-map
      pattern: Facade
      source: packages/core/src/broker/decision.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T07:02:04.726Z"
completed_by_agent: "codex-task-rft-0072"
closedAt: "2026-07-16T07:02:04.726Z"
closedByActor: "codex-task-rft-0072"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T07-02-04-726Z-close-0d680e49686e"
lastTransitionAt: "2026-07-16T07:02:04.726Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "7b799833168a6709dbfcd7f88f5d2acada3e3d2a"
---

# TASK-RFT-0072 - Split Broker Decision Below 600 Lines

## Goal

Split `packages/core/src/broker/decision.ts` into a small public facade plus bounded helper modules while preserving the broker arbitration, proposal admission, physical overlap, Layer 2 decomposition, and failure-reason behavior.

## Acceptance

- `packages/core/src/broker/decision.ts` keeps the existing public `calculateBrokerDecision` import path.
- Helper modules live under `packages/core/src/broker/decision/`.
- Every touched physical TypeScript file is below 600 lines.
- `owner-shard-core.json` explicitly maps the facade and helper directory to the broker decision atom/map.
- Focused final-600 guard proves line budgets, facade delegation, and owner-shard coverage.
- Existing typecheck, governance projection validation, and CLI validation pass.

## Out Of Scope

- Changing broker decision verdict semantics.
- Changing write broker registry schema.
- Changing release artifacts under `release/**`.
