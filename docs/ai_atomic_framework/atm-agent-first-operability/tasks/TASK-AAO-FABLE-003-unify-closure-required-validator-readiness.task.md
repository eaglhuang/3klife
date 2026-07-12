---
task_id: TASK-AAO-FABLE-003
title: "Unify taskflow closure required-validator readiness"
status: planned
owner: claude-fable-5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-155
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/evidence/missing-report.ts"
  - "packages/cli/src/commands/evidence/validator-classification.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:git-head-evidence"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert shared readiness wiring; write-path closure packet validation stays authoritative."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-orchestration"
---

# TASK-AAO-FABLE-003 Unified closure required-validator readiness

Fix backlog ATM-BUG-2026-07-12-155 (and cover row 148 if fully addressed):
pre-close / dry-run treats required validators as advisory or invisible, but
`taskflow close --write` later fails because the closure packet lacks
required passes such as `validate:cli` and `validate:git-head-evidence`.

## Acceptance

- One shared required-validator calculation drives pre-close, dry-run, write.
- Dry-run lists every write-required validator with copyable commands.
- Regression proves dry-run and write required sets are identical.
- Backlog row 155 (and 148 if covered) marked fixed after evidence.
