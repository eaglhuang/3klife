---
task_id: TASK-AAO-FABLE-002
title: "Surface stale frozen runner before taskflow close write"
status: done
owner: claude-fable-5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-154
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert readiness reporting only; the write-path stale guard stays authoritative."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-orchestration"
completed_at: "2026-07-12T16:14:27.772Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-12T16:14:27.772Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T16-14-27-772Z-close-8e44d048b67d"
lastTransitionAt: "2026-07-12T16:14:27.772Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9a0cd02fa921a1777414bbab92c810ea8dad1817"
---

# TASK-AAO-FABLE-002 Stale frozen runner pre-close readiness

Fix backlog ATM-BUG-2026-07-12-154: `taskflow close` dry-run passes but
`--write` later fails with `ATM_RUNNER_STALE_WRITE_REFUSED`.

## Acceptance

- Pre-close / dry-run reports stale frozen runner as a write-readiness blocker.
- Blocker carries the exact sync command `ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build`.
- Regression covers stale-runner readiness reporting.
- Backlog row 154 marked fixed after delivery evidence passes.
