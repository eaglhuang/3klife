---
task_id: TASK-CID-0101
title: Task-specific validator mapping for historical batch evidence
status: planned
milestone: M19
depends_on:
  - TASK-CID-0100
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
  strategy: revert-historical-batch-validator-mapping
atomization_impact:
  owner_atom_or_map: atm.historical-batch-evidence
  map_updates: []
---

# TASK-CID-0101

## Goal

Teach historical batch evidence to distinguish batch-wide validators from task-specific and advisory validators so a whole-batch pass cannot be mistaken for per-task acceptance.

## Acceptance

- Validator runs in historical batch output are classified as `batchWide`, `taskSpecific`, or `advisory`.
- Each task slice records only validators it can actually claim.
- Focused regression proves batch-wide validation does not automatically satisfy task-specific coverage.

## Non-Goals

- Do not infer validators from natural language alone.
- Do not bypass existing evidence missing gates.
