---
task_id: TASK-AAO-FABLE-005
title: "Resolve residue ownership from the committing task id under multi-claim parallelism"
status: done
owner: claude-fable-5
priority: P0
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/hook/pre-commit.ts"
deliverables:
  - "packages/cli/src/commands/hook/pre-commit.ts"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert to lock-count heuristic; single-claim behavior is unchanged either way."
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance"
completed_at: "2026-07-13T00:23:36.761Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-13T00:23:36.761Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T00-23-36-761Z-close-7e564e8c92e1"
lastTransitionAt: "2026-07-13T00:23:36.761Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6a5357953cf46a76da27a9c05461e6037048190b"
---

# TASK-AAO-FABLE-005 Multi-claim residue task resolution

`resolveResidueTaskId` falls back to the active direction-lock list and
returns null whenever more than one lock exists. Under two-captain
parallelism every governance artifact in the worktree (another task's
bundle-manifest, evidence, task-events) is then reported as
"no active task ownership is available" and blocks every governed commit,
even though the wrapper already exports `ATM_COMMIT_TASK_ID` for the hook.

## Acceptance

- The committing task id from `ATM_COMMIT_TASK_ID` is the primary residue
  ownership context; staged-file inference and the single-lock heuristic
  remain as fallbacks.
- Foreign-owned governance artifacts still block when the committing task is
  genuinely unknown.
- Two active claims plus a foreign untracked bundle-manifest no longer block
  an unrelated task's governed commit.
