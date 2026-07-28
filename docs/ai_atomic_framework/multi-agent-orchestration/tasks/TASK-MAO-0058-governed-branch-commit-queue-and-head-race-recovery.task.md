---
task_id: TASK-MAO-0058
doc_id: doc_mao_0058
title: "governed branch commit queue and HEAD race recovery"
status: done
owner: atm-core
priority: P0
milestone: M8
closure_authority: target_repo
depends_on: []
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert branch commit queue lock and HEAD race error mapping; wrapper returns to prior direct commit behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-branch-commit-queue-map"
outOfScope:
  - "Replacing native git branch management with a long-lived ATM daemon."
  - "Rewriting taskflow close or batch checkpoint onto a shared commit queue in this card."
  - "Blocking raw host git commit outside the ATM wrapper."
nonGoals:
  - "Do not implement cross-repo planning mirror queueing in this card."
completed_at: "2026-06-18T10:21:28.708Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-18T10-21-28-374Z-close-d99f1d6acd8d"
delivery_commit: "4a02d28882d6e33278eae77263c30340af79d0b8"
---

# TASK-MAO-0058 - governed branch commit queue and HEAD race recovery

## Background

`atm git commit` already governs actor identity, task-scoped staging, and
claim/session trailers, but the final branch-tip write is still exposed to a
shared-branch race:

1. Two AI agents can both pass local governance checks.
2. One agent completes `git commit` first and advances `HEAD`.
3. The second agent then fails with raw Git output such as:
   `fatal: cannot lock ref 'HEAD': is at <new> but expected <old>`.

This is not just noisy UX; it undermines the "single official commit lane"
story because the most important shared mutation is not yet serialized.

## Goal

Add a lightweight governed queue around the final ATM commit write, and map
HEAD races to first-class ATM retryable errors.

## Implementation Contract

- `atm git commit` must acquire a short-lived branch commit queue lock under
  `.atm/runtime/locks/` before invoking the final native `git commit`.
- The queue key is branch-ref scoped, so concurrent governed commits on the
  same branch serialize, while unrelated branches remain independent.
- If the queue lock is already held past the short retry window, ATM returns:
  `ATM_GIT_COMMIT_BRANCH_QUEUE_BUSY`
  with lock path, branch name, current HEAD, and a retryable command hint.
- If native `git commit` still fails because `HEAD` moved between preflight and
  final write, ATM returns:
  `ATM_GIT_COMMIT_BRANCH_QUEUE_RACE`
  instead of only bubbling raw Git stderr.
- The lock must always release on success, failure, or thrown ATM error.
- Regression coverage must prove the queue-busy path and preserve existing
  task-scoped auto-stage behavior.

## Acceptance Criteria

- A queued ATM commit on the same branch fails closed with
  `ATM_GIT_COMMIT_BRANCH_QUEUE_BUSY`, not raw Git stderr.
- A native `cannot lock ref 'HEAD'` failure is translated into
  `ATM_GIT_COMMIT_BRANCH_QUEUE_RACE` with retryable ATM guidance.
- Existing `atm git commit --auto-stage` task-scoped commit tests still pass.
- CLI validation and typecheck stay green.

## Out of scope

- Re-plumbing `taskflow close`, `batch checkpoint`, and planning mirror commit
  onto the same queue. That follow-up may reuse this lane later.
