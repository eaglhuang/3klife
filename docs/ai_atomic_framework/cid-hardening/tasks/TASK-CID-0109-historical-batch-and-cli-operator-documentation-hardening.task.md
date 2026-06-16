---
task_id: TASK-CID-0109
title: Historical batch and CLI operator documentation hardening
status: done
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
completed_at: "2026-06-16T03:56:51.992Z"
completed_by_agent: "antigravity-gemini-3.5-flash"
delivery_commit: "384d9f9c3b5bb109c5f2f28d01602be327a83b8d"
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

## Notes

- 2026-06-16 | 狀態: in-progress | 驗證: pending | 變更: antigravity-gemini-3.5-flash 開始處理 TASK-CID-0109 收尾，補充 README.md | 阻塞: none

