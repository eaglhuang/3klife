---
task_id: TASK-AAO-0160
title: "Governed commit audit deferral and lease renewal"
status: done
owner: atm-core
priority: P0
milestone: Backlog-P0
depends_on: []
related_backlog: ATM-BUG-2026-07-12-124
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "scripts/validate-governance-commands.ts"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "scripts/validate-governance-commands.ts"
validators:
  - "node --strip-types scripts/validate-governance-commands.ts --mode validate"
  - "npm run typecheck"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-map"
  mapUpdates: []
outOfScope:
  - "Deleting foreign protected override audit records"
  - "Writing shared canonical backlog/map paths while another task owns them"
completed_at: "2026-07-12T10:39:24.679Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-12T10:39:24.679Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T10-39-24-621Z-close-81fb807ec4ca"
lastTransitionAt: "2026-07-12T10:39:24.679Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c2835c9ff56028b32c6b16ad93f13f0b0c3f7c3a"
---

# TASK-AAO-0160 Governed commit audit deferral and lease renewal

## Goal

Fix `ATM-BUG-2026-07-12-124` without weakening protected-audit protection.
Task-scoped commit bundle calculation, pre-commit staging checks, and claim
lease renewal must agree when protected audit records exist before a long
governed commit.

## Acceptance Criteria

- Foreign protected audit is deferred with a durable snapshot and is absent
  from both the computed commit bundle and pre-commit task scope checks.
- Task-owned generated audit is admitted consistently by bundle and hook.
- Long evidence/commit orchestration renews the active same-actor lease or
  returns a retry-safe renewal command before the lease expires.
- Regression covers a task delivery beside pre-existing foreign protected audit
  and proves no scope drift or unsafe unstage occurs.
- After shared closeback ownership is available, add backlog/map paths through
  ATM scope amendment before changing the canonical status.

