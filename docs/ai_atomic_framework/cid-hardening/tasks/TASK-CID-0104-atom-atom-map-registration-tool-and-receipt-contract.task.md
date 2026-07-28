---
task_id: TASK-CID-0104
title: Atom and atom-map registration tool and receipt contract
status: done
milestone: M19
depends_on:
  - TASK-CID-0103
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - packages/cli/src/commands/atomize.ts
  - packages/cli/src/commands/command-specs/atomize.spec.ts
  - packages/cli/src/commands/evidence.ts
  - schemas/governance/**
  - packages/cli/src/commands/**/__tests__/**
validators:
  - npm run typecheck
  - npm test
  - git diff --check
evidence:
  required: command-backed-registration-receipts
rollback:
  strategy: revert-atom-registration-entry-and-receipt-contract
atomization_impact:
  owner_atom_or_map: atm.historical-batch-evidence
  map_updates:
    - atm.evidence-command-map
completed_at: "2026-06-16T03:30:40.807Z"
completed_by_agent: "codex-main"
lastTransitionId: "2026-06-16T03-30-40-694Z-close-027e5d604e8d"
delivery_commit: "117017f66986be628ecdc5d07084992c724eebb1"
---

# TASK-CID-0104

## Goal

Create the official ATM mutation surface for atom / atom-map registration and define the machine-readable receipt contract that the tool must emit.

## Acceptance

- ATM exposes an official CLI/tool path for atom and atom-map registration.
- The tool writes machine-readable receipts into a fixed ATM-managed history path.
- Receipts capture taskId, actorId, eventKind, touched files, affected atom/map ids, and validator outcome.

## Non-Goals

- Do not implement full close guard logic here.
- Do not require full-universe audits.

