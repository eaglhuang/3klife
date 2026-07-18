---
task_id: TASK-CID-0125
doc_id: doc_cid_0125
title: "Manual done closeback audit backfill"
status: done
owner: atm-core
priority: P0
milestone: M19
related_plan: "docs/ai_atomic_framework/cid-hardening/CID hardening plan.md"
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
depends_on:
  - "TASK-CID-0124"
scopePaths:
  - "docs/reports/3klife-manual-done-closeback-backfill.md"
  - "scripts/validate-manual-done-zero.cjs"
  - "docs/ai_atomic_framework/adapter-guided-atomization-sdk/tasks/TASK-ASP-0001-atomization-planning-sdk-contract.task.md"
  - "docs/ai_atomic_framework/adapter-guided-atomization-sdk/tasks/TASK-ASP-0002-js-adapter-candidate-discovery.task.md"
  - "docs/ai_atomic_framework/adapter-guided-atomization-sdk/tasks/TASK-ASP-0003-python-adapter-sdk-promotion.task.md"
  - "docs/ai_atomic_framework/adapter-guided-atomization-sdk/tasks/TASK-ASP-0004-broker-candidate-bridge.task.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0108-recover-atm-map-0003-from-preserved-0102-tag.task.md"
  - ".atm/history/task-events/TASK-ASP-0001/**"
  - ".atm/history/task-events/TASK-ASP-0002/**"
  - ".atm/history/task-events/TASK-ASP-0003/**"
  - ".atm/history/task-events/TASK-ASP-0004/**"
  - ".atm/history/task-events/TASK-AAO-0108/**"
planningMirrorPaths:
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0125-manual-done-closeback-backfill.task.md"
deliverables:
  - "docs/reports/3klife-manual-done-closeback-backfill.md"
  - "scripts/validate-manual-done-zero.cjs"
  - ".atm/history/task-events/TASK-ASP-0001/**"
  - ".atm/history/task-events/TASK-ASP-0002/**"
  - ".atm/history/task-events/TASK-ASP-0003/**"
  - ".atm/history/task-events/TASK-ASP-0004/**"
  - ".atm/history/task-events/TASK-AAO-0108/**"
validators:
  - "git diff --check"
  - "node scripts/validate-manual-done-zero.cjs"
evidence:
  required: command-output
rollback:
  strategy: revert-governance-backfill
  notes: "Revert planning metadata alignment and historical close event files if audit classification changes."
atomizationImpact:
  ownerAtomOrMap: "atm.task-audit-history-backfill"
outOfScope:
  - "Do not reopen or re-close the affected ASP/AAO tasks."
  - "Do not modify implementation deliverables."
  - "Do not suppress cross-repo, planning-only, or legacy warning findings."
nonGoals:
  - "Do not change audit rules."
completed_at: "2026-07-18T12:37:12.977Z"
completed_by_agent: "codex-main"
closedAt: "2026-07-18T12:37:12.977Z"
closedByActor: "codex-main"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T12-37-12-977Z-close-99b46e313eef"
lastTransitionAt: "2026-07-18T12:37:12.977Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "cb4de0ad4b9e4f6b1e40f2b57cc89ca4b7953ba4"
---

# TASK-CID-0125 - Manual done closeback audit backfill

## Goal

Resolve the remaining five `ATM_TASK_AUDIT_MANUAL_DONE` error findings by adding historical close provenance for manually marked done planning cards.

## Required Behavior

- Keep the repair scoped to historical close provenance.
- Preserve `status: done` on the affected planning cards.
- Use the last git commit that touched each card as the historical completion source when no completion metadata exists.
- Add a report explaining source timestamp, source commit, and generated transition event for each task.
- Leave warning-only audit buckets for follow-up CID cards.

## Acceptance Criteria

- `node scripts/validate-manual-done-zero.cjs` reports zero `ATM_TASK_AUDIT_MANUAL_DONE` findings while allowing warning-only audit buckets to remain.
- Backfilled transition events use `atm.taskTransition.v1` and match the planning-card `lastTransitionId`.
- No framework source or target implementation files are changed.
---
