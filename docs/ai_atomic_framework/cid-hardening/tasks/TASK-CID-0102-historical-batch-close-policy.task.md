---
task_id: TASK-CID-0102
title: Historical batch close policy and approval guard
status: done
milestone: M19
depends_on:
  - TASK-CID-0101
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
  strategy: revert-historical-batch-close-policy
atomization_impact:
  owner_atom_or_map: atm.historical-batch-evidence
  map_updates: []
completed_at: "2026-06-16T02:52:02.625Z"
completed_by_agent: "codex-main"
delivery_commit: "917e54c3e23f9929652c636435642f59d974a8bd"
---

# TASK-CID-0102

## Goal

Add explicit close policy metadata to historical batch evidence, including approval-required unmatched handling and a clear separation between "recordable evidence" and "close-ready task slice".

## Acceptance

- `--allow-unmatched` requires both `--approval-reason` and `--approved-by`.
- Historical batch output exposes `okToRecordEvidence` and `okToCloseTask` separately.
- Unmatched or partial slices can be diagnostic-only but not close-ready.

## Non-Goals

- Do not silently auto-approve unmatched slices.
- Do not make historical-reference evidence appear fresh.
