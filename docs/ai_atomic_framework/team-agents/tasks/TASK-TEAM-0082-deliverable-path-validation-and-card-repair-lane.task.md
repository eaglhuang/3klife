---
doc_id: doc_team_0082
task_id: TASK-TEAM-0082
title: "Validate deliverable paths at import and add a governed card metadata repair lane"
status: done
owner: atm-core
priority: P1
milestone: "Team Broker Maintainability"
depends_on: []
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/import-orchestrator.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert validation; emergency-lease force re-import remains the manual fallback."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger"
completed_at: "2026-07-12T07:49:41.465Z"
completed_by_agent: "Codex-GPT5.6 Terra"
closedAt: "2026-07-12T07:49:41.465Z"
closedByActor: "Codex-GPT5.6 Terra"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T07-49-41-465Z-close-d985cc33f1a0"
lastTransitionAt: "2026-07-12T07:49:41.465Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b613c4db0c1011844f58d6cdd10415ceb2fa080b"
---

# TASK-TEAM-0082 Deliverable path validation and card repair lane

## Goal

Fix backlog `ATM-BUG-2026-07-12-138`: prose (non-path) deliverables pass
`tasks import` with only a warning, then make `taskflow close` fail with
`ATM_TASKFLOW_CLOSE_COMMIT_BUNDLE_INCOMPLETE`; the only repair lane today is
an emergency-lease `tasks import --write --force`.

## Acceptance Criteria

- Import fails closed (or normalizes with an explicit diagnostic) when a
  declared deliverable is not a repository path.
- A governed, non-emergency metadata repair lane exists for claimed tasks
  whose card text needs correction, preserving claim state.
- Close-time diagnostics name the offending deliverable strings.
- Backlog 138 updated to fixed with regression references.
