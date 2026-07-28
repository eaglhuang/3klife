---
task_id: TASK-MAO-0040
doc_id: doc_mao_0040
title: "Task-scoped commit bundle resolver, foreign-staged restore, and host git compatibility"
status: done
started_at: 2026-06-17T06:15:00Z
started_by_agent: cursor-composer-2.5
owner: atm-core
priority: P1
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0036"
  - "TASK-MAO-0039"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "docs/governance/git-governance-contract.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "docs/governance/git-governance-contract.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - "npm run validate:neutrality"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert commit bundle resolver, auto-stage behavior, docs, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.task-scoped-commit-bundle-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Using git add ."
  - "Staging out-of-scope source changes"
  - "Auto-committing user work"
nonGoals:
  - "Do not bypass task allowedFiles with convenience staging."
completed_at: "2026-06-17T06:21:05.824Z"
completed_by_agent: "cursor-composer-2.5"
lastTransitionId: "2026-06-17T06-21-05-739Z-close-456e76fded83"
delivery_commit: "65940b1f3"
---

# TASK-MAO-0040 - Task-scoped commit bundle resolver, foreign-staged restore, and host git compatibility

## Goal

Let `atm git commit --auto-stage` stage only the current task's allowed delivery
bundle while clearly reporting skipped external dirty files, unexpected staged
foreign tasks, and host git fallback details.

## Implementation Contract

- Build a dry-run bundle resolver before apply behavior.
- Stage only task allowed files plus ATM-governed evidence, task events,
  closure packets, and generated release artifacts that are explicitly allowed
  by the active lane.
- Reject external deletions, renames, or source edits outside task scope.
- Report skipped files in JSON and text output, including `unexpectedStagedTasks`
  when the index already contains foreign work.
- Offer an explicit `--defer-foreign-staged` restore path that snapshots or
  un-stages foreign files only under a governed command, never silently.
- Add a pre-commit hard warning for single-task claims with staged files outside
  `allowedFiles` and require task-id consistency across the governance bundle.
- Normalize host git execution through `git.exe` or a configurable
  `ATM_GIT_EXECUTABLE` fallback, and emit copyable `-m` body output when trailer
  support is not available.

## Acceptance Criteria

- Shared worktree dirty files no longer cause `STAGING_AMBIGUOUS` when they are
  outside the current task and not staged.
- The mixed delivery commits observed in 0009 and 0010 are flagged before merge,
  and mismatched governance bundle task ids block the commit before it writes.
- The resolver cannot become a new bypass path.
- Host git incompatibility no longer leaves the operator without a usable copy
  of the final commit command.
