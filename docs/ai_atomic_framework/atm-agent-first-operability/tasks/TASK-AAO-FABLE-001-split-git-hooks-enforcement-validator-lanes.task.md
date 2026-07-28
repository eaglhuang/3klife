---
task_id: TASK-AAO-FABLE-001
title: "Split git-hooks enforcement validator into bounded lanes"
status: done
owner: claude-fable-5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-152
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validate-git-hooks-enforcement.ts"
  - "package.json"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "scripts/validate-git-hooks-enforcement.ts"
  - "package.json"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:git-hooks-enforcement -- --lane list"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert lane split; the monolithic full-suite command remains the fallback."
atomizationImpact:
  ownerAtomOrMap: "atm.validator-framework"
completed_at: "2026-07-12T16:27:49.165Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-12T16:27:49.165Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T16-27-49-059Z-close-7cd21dfc1c9c"
lastTransitionAt: "2026-07-12T16:27:49.165Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "4ea520e90d948cf374a1bb7d8e0ff277937f38ab"
---

# TASK-AAO-FABLE-001 Split git-hooks enforcement validator lanes

Fix backlog ATM-BUG-2026-07-12-152: `npm run validate:git-hooks-enforcement`
can take ~202s and feels like a timeout risk even when successful.

## Acceptance

- Focused bounded lanes selectable via CLI flag; explicit full-suite command kept.
- Duration guidance printed before long execution.
- Lane list/coverage provable via a deterministic command (regression).
- Backlog row 152 marked fixed after delivery evidence passes.
