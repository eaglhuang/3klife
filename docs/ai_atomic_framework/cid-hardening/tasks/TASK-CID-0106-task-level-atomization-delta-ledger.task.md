---
task_id: TASK-CID-0106
title: Task-level atomization delta ledger
status: planned
milestone: M19
depends_on:
  - TASK-CID-0104
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - packages/cli/src/commands/evidence.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/taskflow.ts
  - schemas/governance/**
  - packages/cli/src/commands/**/__tests__/**
validators:
  - npm run typecheck
  - npm test
  - git diff --check
evidence:
  required: atomization-delta-ledger-evidence
rollback:
  strategy: revert-task-level-atomization-delta-ledger
atomization_impact:
  owner_atom_or_map: atm.task-closure-map
  map_updates:
    - atm.evidence-command-map
---

# TASK-CID-0106

## Goal

Add a task-scoped atomization delta ledger so close verification can validate what this task created or updated without scanning the full atom universe.

## Acceptance

- ATM records a machine-readable delta ledger per task.
- The delta ledger captures created/updated/retired atoms and atom-map rows plus receipt references.
- Evidence/close flows can read the delta ledger.

## Non-Goals

- Do not implement count/digest anomaly guards here.

