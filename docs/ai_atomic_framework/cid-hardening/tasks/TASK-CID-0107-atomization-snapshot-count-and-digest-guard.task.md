---
task_id: TASK-CID-0107
title: Atomization snapshot count and digest guard
status: done
milestone: M19
depends_on:
  - TASK-CID-0106
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - packages/cli/src/commands/evidence.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/taskflow.ts
  - packages/cli/src/commands/**/__tests__/**
validators:
  - npm run typecheck
  - npm test
  - git diff --check
evidence:
  required: snapshot-anomaly-guard-evidence
rollback:
  strategy: revert-atomization-snapshot-guard
atomization_impact:
  owner_atom_or_map: atm.task-closure-map
  map_updates:
    - atm.evidence-command-map
completed_at: "2026-06-16T03:34:58.668Z"
completed_by_agent: "codex-main"
lastTransitionId: "2026-06-16T03-34-58-581Z-close-2ec5954c4a35"
delivery_commit: "917e54c3e23f9929652c636435642f59d974a8bd"
---

# TASK-CID-0107

## Goal

Add a cheap reverse guard based on count plus digest snapshots, so ATM can detect missing atom / atom-map governance updates without running full-universe diffs on every close.

## Acceptance

- ATM captures before/after atomization snapshots for governed tasks.
- Snapshot validation checks count and stable identity digest, not count alone.
- Mismatch triggers anomaly handling or deeper audit instead of silent pass.

## Non-Goals

- Do not require full-universe per-close row-by-row audits.

