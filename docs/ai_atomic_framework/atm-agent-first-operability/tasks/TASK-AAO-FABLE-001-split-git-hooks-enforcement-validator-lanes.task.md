---
task_id: TASK-AAO-FABLE-001
title: "Split git-hooks enforcement validator into bounded lanes"
status: planned
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
---

# TASK-AAO-FABLE-001 Split git-hooks enforcement validator lanes

Fix backlog ATM-BUG-2026-07-12-152: `npm run validate:git-hooks-enforcement`
can take ~202s and feels like a timeout risk even when successful.

## Acceptance

- Focused bounded lanes selectable via CLI flag; explicit full-suite command kept.
- Duration guidance printed before long execution.
- Lane list/coverage provable via a deterministic command (regression).
- Backlog row 152 marked fixed after delivery evidence passes.
