---
task_id: TASK-CID-0103
title: Historical batch close integration
status: done
milestone: M19
depends_on:
  - TASK-CID-0102
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - packages/cli/src/commands/evidence.ts
  - packages/cli/src/commands/command-specs/evidence.spec.ts
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/tasks/task-option-parsers.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow.ts
  - packages/cli/src/commands/tasks/__tests__/historical-delivery.test.ts
  - packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
validators:
  - npm run typecheck
  - npm test
  - git diff --check
evidence:
  required: command-backed-historical-batch
rollback:
  strategy: revert-historical-batch-close-integration
atomization_impact:
  owner_atom_or_map: atm.historical-batch-evidence
  map_updates: []
completed_at: "2026-06-16T02:56:04.592Z"
completed_by_agent: "codex-main"
lastTransitionId: "2026-06-16T02-56-04-491Z-close-05faa189c351"
delivery_commit: "917e54c3e23f9929652c636435642f59d974a8bd"
---

# TASK-CID-0103

## Goal

Integrate historical batch slices with task close lanes so closeback can consume a batch envelope and only close tasks whose slices are coverage-complete and validator-complete.

## Acceptance

- `tasks close` can read historical batch slice input and reuse it as done-close evidence.
- Close is rejected when the referenced slice is not close-ready.
- Dogfood using TASK-CID-0100..0103 produces one batch envelope and four close-ready task slices.

## Non-Goals

- Do not add a second task lifecycle model.
- Do not allow batch close to bypass per-task closure records.
