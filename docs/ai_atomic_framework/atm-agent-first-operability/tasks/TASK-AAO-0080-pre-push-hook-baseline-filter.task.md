---
task_id: TASK-AAO-0080
title: "pre-push hook closure-packet baseline filter + evidence-missing diagnostic"
status: done
priority: P0
closure_authority: target_repo
depends_on: [TASK-AAO-0079]
scopePaths:
  - "packages/cli/src/commands/hook.ts"
deliverables:
  - "packages/cli/src/commands/hook.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
atomizationImpact: { ownerAtomOrMap: "atm.git-hooks-enforcement", mapUpdates: [] }
outOfScope:
  - "Bypass pre-push hook"
  - "Force push"
  - "Use ATM_FRAMEWORK_PUSH_GUARD_SAFE_MODE"
  - "Change framework-commit-range baseline JSON"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
completed_at: "2026-06-07T23:12:15+08:00"
completed_by_agent: "historical-backfill"
closedAt: "2026-06-07T23:12:15+08:00"
closedByActor: "historical-backfill"
closedByCommand: "historical planning closeback backfill for TASK-CID-0124"
lastTransitionId: "2026-06-07T23-12-15+08-00-close-b1990417692d"
lastTransitionAt: "2026-06-07T23:12:15+08:00"
ledgerContractVersion: "task-ledger/v1"
delivery_commit: "343ce28f884ce0aa4d7ff45704601c7024f19581"
---

# TASK-AAO-0080: pre-push hook closure-packet baseline filter + evidence-missing diagnostic

## Rationale
TASK-AAO-0079 forward-rolled the accepted framework commit-range baseline, but pre-push still reports legacy closure-packet findings and git-head evidence-missing findings. This task keeps the baseline file and strict-after policy unchanged, applies the existing accepted baseline boundary consistently to closure-packet findings, and adds diagnostic output for remaining git-head evidence-missing commits.