---
task_id: TASK-MAO-0043
doc_id: doc_mao_0043
title: "Claim repair diagnose/write and lifecycle owner rule"
status: done
owner: cursor-gpt-5.2
started_at: 2026-06-17T16:22:00+08:00
started_by_agent: cursor-gpt-5.2
priority: P2
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0039"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/git-governance-contract.md"
  - "tests/cli/tasks-repair-claim.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/git-governance-contract.md"
  - "tests/cli/tasks-repair-claim.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/tasks-repair-claim.test.ts"
  - "npm run validate:neutrality"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert repair-claim command, lifecycle owner docs, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.claim-repair-lifecycle-owner-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Silently taking over active claims"
  - "Repairing valid active leases"
  - "Letting multiple actors own closeout writes"
nonGoals:
  - "Do not replace taskflow close."
completed_at: "2026-06-17T16:45:20.095Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "46dd432d5dca2d55964f197358ac6b5c22465426"
---

# TASK-MAO-0043 - Claim repair diagnose/write and lifecycle owner rule

## Goal

Provide a safe `tasks repair-claim` diagnose/write path and document that
closeout has one lifecycle owner while other agents remain read-only.

## Implementation Contract

- Add diagnose-first output for stale, dangling, expired, and conflicting claim
  states.
- Require `--write` plus reason for actual repair.
- Record a repair event with before/after state.
- Block repair when an active valid lease or actor session exists.
- Document lifecycle owner rules for closeout and historical closeback.

## Acceptance Criteria

- Operators can diagnose claim drift without mutation.
- Repairs are auditable and cannot mask real concurrency.
- The task consolidates backlog item `ATM-BUG-2026-06-15-009` where claim
  latency and inconsistent state hid the real blocker.
