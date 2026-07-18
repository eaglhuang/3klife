---
task_id: TASK-CID-0121
title: 3KLife stale claim and framework lock cleanup
status: done
milestone: CID-audit-debt
depends_on:
  - TASK-CID-0120
related_plan: docs/reports/3klife-task-audit-debt-triage.md
target_repo: 3KLife
planning_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - ".atm/history/tasks/TASK-CID-0091.json"
  - ".atm/history/task-events/TASK-CID-0091/**"
  - ".atm/runtime/locks/ATM-FRAMEWORK-TEMP-001.lock.json"
  - "docs/reports/3klife-stale-claim-and-lock-cleanup.md"
  - "scripts/validate-stale-claim-lock-cleanup.cjs"
planningMirrorPaths:
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0121-stale-claim-and-framework-lock-cleanup.task.md"
deliverables:
  - "docs/reports/3klife-stale-claim-and-lock-cleanup.md"
  - "scripts/validate-stale-claim-lock-cleanup.cjs"
validators:
  - "node scripts/validate-stale-claim-lock-cleanup.cjs"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "Do not implement TASK-CID-0091 deliverables."
  - "Do not repair manual-done or legacy-baseline audit buckets in this card."
  - "Do not create a GOV-series task."
nonGoals:
  - "No full audit green claim."
  - "No framework target repository source mutation."
rollback:
  strategy: revert-commit
  notes: "If the stale-state cleanup is wrong, restore the previous claim/lock state from the pre-cleanup commit and rerun diagnosis."
atomizationImpact:
  ownerAtomOrMap: "atm.task-audit-active-state-cleanup"
  mapUpdates: []
  extractionCandidates: []
completed_at: "2026-07-18T11:21:54.106Z"
completed_by_agent: "codex-main"
closedAt: "2026-07-18T11:21:54.106Z"
closedByActor: "codex-main"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T11-21-54-106Z-close-a71ce05833cb"
lastTransitionAt: "2026-07-18T11:21:54.106Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "74cbeeb47a81e2c30ee410831a6a697c8555744e"
---

# TASK-CID-0121

## Goal

Clear the active-state audit debt identified in `TASK-CID-0120`: the stale `TASK-CID-0091` claim and the stale `ATM-FRAMEWORK-TEMP-001` runtime lock.

## Acceptance

- `TASK-CID-0091` stale claim diagnosis no longer reports a repairable active stale claim.
- The stale `ATM-FRAMEWORK-TEMP-001` runtime lock is absent or already released.
- A short cleanup report records the commands and remaining audit impact.

## Verification

```bash
node scripts/validate-stale-claim-lock-cleanup.cjs
git diff --check
```
