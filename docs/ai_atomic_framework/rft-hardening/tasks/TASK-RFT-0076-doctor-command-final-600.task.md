---
task_id: TASK-RFT-0076
title: Split doctor command below 600 lines
status: done
owner: atm-cli
priority: P1
depends_on:
  - TASK-RFT-0075
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0076-doctor-command-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/doctor.ts
  - packages/cli/src/commands/doctor/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - tests/cli/doctor-final-600.test.ts
deliverables:
  - packages/cli/src/commands/doctor.ts
  - packages/cli/src/commands/doctor/**/*.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - tests/cli/doctor-final-600.test.ts
validators:
  - node --strip-types tests/cli/doctor-final-600.test.ts
  - node atm.mjs doctor --json
  - npm run typecheck
  - npm run validate:governance-projections
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.doctor-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.doctor-command-map
      pattern: Facade
      source: packages/cli/src/commands/doctor.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T09:00:33.499Z"
completed_by_agent: "codex-task-rft-0076"
closedAt: "2026-07-16T09:00:33.499Z"
closedByActor: "codex-task-rft-0076"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T09-00-33-409Z-close-4a3f4e4617ad"
lastTransitionAt: "2026-07-16T09:00:33.499Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ae3c6f8f67ac034db670832421135be8dd29022a"
---

# TASK-RFT-0076 - Split Doctor Command Below 600 Lines

## Goal

Split `packages/cli/src/commands/doctor.ts` into a small command facade plus bounded helper modules while preserving the `atm doctor` command contract, diagnostics, checks, and remediation behavior.

## Acceptance

- `packages/cli/src/commands/doctor.ts` remains the public command facade and continues to export `runDoctor`.
- Helper modules live under `packages/cli/src/commands/doctor/`.
- Every touched physical TypeScript file is below 600 lines.
- `owner-shard-cli.json` explicitly maps the facade and helper directory to the doctor command atom/map.
- Focused final-600 guard proves line budgets, facade delegation, and owner-shard coverage.
- Existing doctor, typecheck, governance projection validation, and CLI validation pass.

## Out Of Scope

- Changing doctor check semantics or remediation text.
- Changing framework/adopter doctor policy decisions.
- Changing generated release artifacts under `release/**`.
