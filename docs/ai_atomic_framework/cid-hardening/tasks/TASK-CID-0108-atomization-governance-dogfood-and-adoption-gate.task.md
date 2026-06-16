---
task_id: TASK-CID-0108
title: Atomization governance dogfood and adoption gate
status: planned
milestone: M19
depends_on:
  - TASK-CID-0105
  - TASK-CID-0106
  - TASK-CID-0107
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - docs/reports/**
  - packages/cli/src/commands/**/__tests__/**
  - .atm/history/evidence/**
validators:
  - npm run typecheck
  - npm test
  - git diff --check
evidence:
  required: dogfood-and-adoption-report
rollback:
  strategy: revert-atomization-governance-dogfood-gate
atomization_impact:
  owner_atom_or_map: atm.historical-batch-evidence
  map_updates:
    - atm.task-closure-map
---

# TASK-CID-0108

## Goal

Dogfood the official atom / atom-map registration path, delta ledger, and snapshot anomaly guard in one governed wave, then write the adoption gate decision.

## Acceptance

- A real dogfood scenario uses the official registration path instead of hand-edited scattered files.
- The task delta ledger and snapshot guard both participate in validation.
- The final report states whether the flow is ready for normal adoption.

## Non-Goals

- Do not widen scope into unrelated registry refactors.

