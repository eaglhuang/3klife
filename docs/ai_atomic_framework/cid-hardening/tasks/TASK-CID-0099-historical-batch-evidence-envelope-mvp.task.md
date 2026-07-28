---
task_id: TASK-CID-0099
title: Historical batch evidence envelope MVP
status: done
milestone: M19
depends_on:
  - TASK-CID-0098
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - packages/cli/src/commands/evidence.ts
  - packages/cli/src/commands/command-specs/evidence.spec.ts
  - packages/cli/src/commands/tasks/__tests__/historical-delivery.test.ts
  - docs/governance/atm-bug-and-optimization-backlog.md
  - .atm/history/evidence/historical-batches/
  - .atm/history/evidence/TASK-CID-0092.json
  - .atm/history/evidence/TASK-CID-0093.json
  - .atm/history/evidence/TASK-CID-0094.json
  - .atm/history/evidence/TASK-CID-0095.json
  - .atm/history/evidence/TASK-CID-0096.json
  - .atm/history/evidence/TASK-CID-0097.json
  - .atm/history/evidence/TASK-CID-0098.json
validators:
  - npm run typecheck
  - npm test
  - git diff --check
evidence:
  required: command-backed-historical-batch
rollback:
  strategy: revert-mvp-command-and-generated-evidence
atomization_impact:
  owner_atom_or_map: atm.historical-batch-evidence
  map_updates: []
completed_at: "2026-06-16T02:34:37.449Z"
completed_by_agent: "codex-main"
lastTransitionId: "2026-06-16T02-34-37-274Z-close-da32c8ac398f"
delivery_commit: "d8d27781e12e1f7a83398686dd8a6f4ca9c952b7"
---

# TASK-CID-0099

## Goal

Implement the first ATM MVP for historical batch evidence envelopes so a previously committed multi-task delivery package can be verified once and sliced back into per-task evidence records without pretending the evidence is fresh live execution.

## Acceptance

- `node atm.mjs evidence historical-batch` supports task ids, delivery commits, a delivery repo, validator commands, and write/dry-run modes.
- The command writes one batch envelope under `.atm/history/evidence/historical-batches/`.
- The command appends one historical-reference evidence slice to each selected task evidence file.
- Validator commands are actually executed and recorded with exit code plus stdout/stderr SHA-256.
- Per-task slices include matched commits and matched files derived from each task scope/deliverables.
- The implementation is dogfooded against CID Phase B/C delivery commits.

## Non-Goals

- Do not rewrite the full task close state machine in this MVP.
- Do not mark historical evidence as fresh.
- Do not collapse all tasks into one unverifiable task closure.
