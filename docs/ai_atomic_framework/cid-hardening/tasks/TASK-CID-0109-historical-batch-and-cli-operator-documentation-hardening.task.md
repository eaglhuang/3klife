---
task_id: TASK-CID-0109
title: Historical batch and CLI operator documentation hardening
status: planned
milestone: M19
depends_on:
  - TASK-CID-0103
  - TASK-CID-0108
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - packages/cli/src/commands/command-specs/**
  - README.md
  - docs/**
validators:
  - npm run typecheck
  - npm test
  - git diff --check
evidence:
  required: cli-and-operator-documentation-proof
rollback:
  strategy: revert-historical-batch-cli-doc-hardening
atomization_impact:
  owner_atom_or_map: atm.evidence-command-map
  map_updates:
    - atm.task-closure-map
---

# TASK-CID-0109

## Goal

Document the historical batch lane and all related CLI/operator surfaces so the feature is not discoverable only from diffs, tests, or chat history.

## Acceptance

- Historical batch operator guidance is written into stable repo docs.
- CLI specs/examples cover evidence historical-batch, tasks close --historical-batch, and taskflow close --historical-batch.
- Docs explain coverage status, validator mapping, diagnostic-only behavior, and close-readiness boundaries.

## Non-Goals

- Do not redesign the runtime behavior in this card.
