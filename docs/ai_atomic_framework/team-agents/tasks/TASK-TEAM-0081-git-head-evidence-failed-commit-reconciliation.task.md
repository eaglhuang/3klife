---
doc_id: doc_team_0081
task_id: TASK-TEAM-0081
title: "Reconcile git-head evidence records left by failed governed commits"
status: done
owner: atm-core
priority: P2
milestone: "Team Broker Maintainability"
depends_on: []
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/tasks/close-orchestrator.ts"
  - "packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
  - "scripts/validate-git-head-evidence.ts"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "scripts/validate-git-head-evidence.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert reconciliation logic; manual git restore of git-head.jsonl remains the fallback."
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance"
completed_at: "2026-07-12T07:23:22.886Z"
completed_by_agent: "Codex-GPT5.6 Terra"
closedAt: "2026-07-12T07:23:22.886Z"
closedByActor: "Codex-GPT5.6 Terra"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T07-23-22-886Z-close-cfcbe6112b3f"
lastTransitionAt: "2026-07-12T07:23:22.886Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "573ac3cf7fb03cef459f37358d46270716c2d2b3"
---

# TASK-TEAM-0081 Reconcile git-head evidence from failed commits

## Goal

Fix backlog `ATM-BUG-2026-07-12-137`: a failed governed commit attempt leaves
its prepared commit record appended to `.atm/history/evidence/git-head.jsonl`.
The orphan line (its tree was never committed) later blocks `taskflow close`
as governance-tracked dirty state, forcing a manual `git restore`.

## Acceptance Criteria

- Commit-prep evidence is finalized only when the commit lands, or a failed
  attempt auto-reconciles/annotates its orphan record.
- Close preflight no longer blocks on an orphan prep record; a regression
  covers the failed-attempt path.
- `validate:git-head-evidence` still passes for the reconciled log.
