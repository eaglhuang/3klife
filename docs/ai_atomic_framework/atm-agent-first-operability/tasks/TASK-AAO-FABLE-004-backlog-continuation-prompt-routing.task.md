---
task_id: TASK-AAO-FABLE-004
title: "Route backlog continuation prompts to backlog/task queue, not create-atom"
status: done
owner: claude-fable-5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-157
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next/intent-normalizers.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/next/intent-normalizers.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:prompt-scoped-next"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert prompt classification extension; generic guide fallback remains."
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map"
completed_at: "2026-07-13T05:47:24.877Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-13T05:47:24.877Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T05-47-24-877Z-close-dd2c27563485"
lastTransitionAt: "2026-07-13T05:47:24.877Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "894a106d8c6023da16c8c52b24b229d1af73b7c5"
---

# TASK-AAO-FABLE-004 Backlog continuation prompt routing

Fix backlog ATM-BUG-2026-07-12-157: prompts like「請繼續修復所有 backlog」or
"continue backlog fixes" fall into generic `create-atom` guidance instead of
the existing backlog/task queue routing.

## Acceptance

- zh-TW backlog continuation prompts route to the existing task/batch queue.
- English "continue backlog fixes" and Captain-mode variants route correctly.
- Genuine new-capability / atom-birth prompts still route to create-atom.
- Deterministic regression fixtures added; backlog row 157 marked fixed.
