---
task_id: TASK-CID-0100
title: Historical batch coverage gate
status: planned
milestone: M19
depends_on:
  - TASK-CID-0099
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - packages/cli/src/commands/evidence.ts
  - packages/cli/src/commands/command-specs/evidence.spec.ts
  - packages/cli/src/commands/tasks/__tests__/historical-delivery.test.ts
validators:
  - npm run typecheck
  - npm test
  - git diff --check
evidence:
  required: command-backed-historical-batch
rollback:
  strategy: revert-historical-batch-coverage-gate
atomization_impact:
  owner_atom_or_map: atm.historical-batch-evidence
  map_updates: []
---

# TASK-CID-0100

## Goal

Add per-task coverage reporting to historical batch evidence so each task slice can prove which declared deliverables were matched, which remained uncovered, and whether the slice is complete enough for closeout.

## Acceptance

- Historical batch task slices record declared deliverables, matched files, missing coverage, and a normalized coverage status.
- Coverage incomplete tasks are not treated as close-ready.
- Missing deliverable coverage has focused regression coverage.

## Non-Goals

- Do not add semantic ownership inference.
- Do not auto-close tasks in this card alone.
