---
task_id: TASK-RFT-0071
title: Split broker evidence collector below 600 lines
status: done
owner: atm-scripts
priority: P1
depends_on:
  - TASK-RFT-0070
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0071-collect-broker-evidence-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/collect-broker-evidence.ts
  - scripts/collect-broker-evidence/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - tests/scripts/collect-broker-evidence-final-600.test.ts
deliverables:
  - scripts/collect-broker-evidence.ts
  - scripts/collect-broker-evidence/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - tests/scripts/collect-broker-evidence-final-600.test.ts
validators:
  - node --strip-types tests/scripts/collect-broker-evidence-final-600.test.ts
  - node --strip-types scripts/collect-broker-evidence.ts --help
  - npm run typecheck
  - npm run validate:governance-projections
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.broker-evidence-capture-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.broker-evidence-collector-map
      pattern: Facade
      source: scripts/collect-broker-evidence.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T06:52:10.368Z"
completed_by_agent: "codex-task-rft-0071"
closedAt: "2026-07-16T06:52:10.368Z"
closedByActor: "codex-task-rft-0071"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T06-52-10-307Z-close-a711f86641c7"
lastTransitionAt: "2026-07-16T06:52:10.368Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "50f7386042ed3aa44c00c742d813dbc426e4351d"
---

# TASK-RFT-0071 - Split Broker Evidence Collector Below 600 Lines

## Goal

Split `scripts/collect-broker-evidence.ts` into a tiny executable facade plus bounded helper modules while preserving the broker evidence bundle JSON and Markdown report contracts.

## Acceptance

- `scripts/collect-broker-evidence.ts` remains the executable entrypoint for existing operator usage.
- Helper modules live under `scripts/collect-broker-evidence/`.
- Every touched physical TypeScript file is below 600 lines.
- `owner-shard-scripts.json` explicitly maps both the facade and helper directory to `atm.broker-evidence-capture-map`.
- Focused final-600 guard proves line budgets, facade delegation, and owner-shard coverage.
- Existing `--help` output still works through the facade.

## Out Of Scope

- Changing broker evidence bundle schema.
- Changing default run directory fallbacks.
- Changing release artifacts under `release/**`.
