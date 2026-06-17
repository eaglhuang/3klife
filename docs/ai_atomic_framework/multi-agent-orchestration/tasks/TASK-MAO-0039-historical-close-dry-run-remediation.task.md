---
task_id: TASK-MAO-0039
doc_id: doc_mao_0039
title: "Historical close pre-close remediation and write rollback summary"
status: done
started_at: 2026-06-17T05:15:00Z
started_by_agent: cursor-composer-2.5
owner: atm-core
priority: P0
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0036"
  - "TASK-MAO-0038"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/historical-close-preflight.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/historical-batch-evidence.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/historical-close-preflight.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/historical-batch-evidence.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "npm run validate:neutrality"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert dry-run remediation output, docs, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.historical-close-preflight-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Auto-restoring dirty files"
  - "Committing unrelated dirty work"
  - "Changing historical batch envelope semantics"
nonGoals:
  - "Do not make dry-run mutate the worktree."
completed_at: "2026-06-17T06:02:48.123Z"
completed_by_agent: "cursor-composer-2.5"
delivery_commit: "cf1259d0d5ad3c910aefb97b1ba8900c2b61167b"
---

# TASK-MAO-0039 - Historical close pre-close remediation and write rollback summary

## Goal

Make historical closeback actionable before any write happens by exposing a
read-only pre-close summary that reports scoped dirty files, unexpected staged
tasks, mixed delivery files, stale evidence, and exact recovery choices.

## Implementation Contract

- Add structured pre-close and dry-run blockers such as
  `scopeTrackedDirtyFiles`, `unexpectedStagedTasks`, `mixedDeliveryCommit`,
  `staleEvidence`, and `missingApprovalLease`.
- Report the exact staged foreign task ids when the index contains work outside
  the current bundle, and show the restore choice without silently unstaging
  anything.
- Include per-file remediation hints: restore accidental drift, defer foreign
  staged files, commit intended delivery first, or request the specific waiver
  permission.
- Keep both dry-run and pre-close read-only.
- Update user workflow docs so `pre-close` is the first operator checkpoint
  before any write close or rollback summary.
- Surface the same blocker summary in CLI help and task-view so operators do
  not need chat history to understand the next safe step.

## Acceptance Criteria

- The 0010 report-drift scenario and foreign staged task scenario are both
  diagnosable from pre-close output without reading chat history.
- Pre-close and dry-run emit machine-readable blockers and human-readable
  remediation text.
- Docs warn that dirty-file remediation must be scoped, must not use broad
  destructive cleanup, and must not silently unstage foreign files.
