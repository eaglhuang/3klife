---
task_id: TASK-CID-0123
doc_id: doc_cid_0123
title: "Transition event missing audit backfill"
status: done
owner: atm-core
priority: P0
milestone: M19
related_plan: "docs/ai_atomic_framework/cid-hardening/CID蝖砍?閮??.md"
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
depends_on:
  - "TASK-CID-0122"
scopePaths:
  - "docs/reports/3klife-transition-event-missing-backfill.md"
  - "scripts/validate-transition-event-missing-zero.cjs"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0148-same-repo-close-bundle-and-scope-hardening.task.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0190-taskflow-close-auto-stage-and-status-migration.task.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-FABLE-003-unify-closure-required-validator-readiness.task.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-FABLE-005-multi-claim-residue-task-resolution.task.md"
  - "docs/ai_atomic_framework/rft-hardening/tasks/TASK-RFT-0015-onefile-nested-launcher-recursion.task.md"
  - ".atm/history/task-events/TASK-AAO-0190/**"
  - ".atm/history/task-events/TASK-AAO-FABLE-003/**"
  - ".atm/history/task-events/TASK-AAO-FABLE-005/**"
planningMirrorPaths:
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0123-transition-event-missing-backfill.task.md"
deliverables:
  - "docs/reports/3klife-transition-event-missing-backfill.md"
  - "scripts/validate-transition-event-missing-zero.cjs"
  - ".atm/history/task-events/TASK-AAO-0190/**"
  - ".atm/history/task-events/TASK-AAO-FABLE-003/**"
  - ".atm/history/task-events/TASK-AAO-FABLE-005/**"
validators:
  - "git diff --check"
  - "node scripts/validate-transition-event-missing-zero.cjs"
evidence:
  required: command-output
rollback:
  strategy: revert-governance-backfill
  notes: "Revert the planning metadata alignment and synthetic historical transition events if audit classification changes."
atomizationImpact:
  ownerAtomOrMap: "atm.task-audit-history-backfill"
outOfScope:
  - "Do not reopen or re-close the affected AAO/RFT tasks."
  - "Do not modify target repository deliverables."
  - "Do not suppress manual-done, planning-only, legacy, or cross-repo audit findings."
nonGoals:
  - "Do not change audit rules."
completed_at: "2026-07-18T11:58:59.611Z"
completed_by_agent: "codex-main"
closedAt: "2026-07-18T11:58:59.611Z"
closedByActor: "codex-main"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T11-58-59-611Z-close-16511d9073fc"
lastTransitionAt: "2026-07-18T11:58:59.611Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3fa5343e975e4b769f6feed2931cb44f07311b7d"
---

# TASK-CID-0123 - Transition event missing audit backfill

## Goal

Resolve the five `ATM_TASK_AUDIT_TRANSITION_EVENT_MISSING` findings by aligning planning-card close metadata with existing transition events where available and backfilling minimal historical close events for planning-only cards that have no 3KLife runtime ledger.

## Required Behavior

- Keep the repair scoped to historical close provenance.
- Preserve existing delivery commits and close timestamps.
- Add a human-readable report explaining which entries were aligned versus backfilled.
- Leave larger audit buckets for follow-up CID cards.

## Acceptance Criteria

- `node scripts/validate-transition-event-missing-zero.cjs` reports zero `ATM_TASK_AUDIT_TRANSITION_EVENT_MISSING` findings while allowing unrelated historical audit buckets to remain.
- Affected planning cards keep `status: done`.
- Backfilled transition events use `atm.taskTransition.v1` and match the planning-card `lastTransitionId`.
- No framework source or target deliverable files are changed.
---
