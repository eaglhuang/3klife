---
task_id: TASK-TMP-0006
title: Historical planning transition provenance sweep
status: planned
owner: atm-governance
priority: P1
depends_on:
  - "TASK-TMP-0005"
causalGraph:
  causalDependencies:
    - "TASK-TMP-0005 completed post-close residue reconciliation."
  startConditions:
    - "Planning workspace 3KLife dirty working tree is clean."
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges:
    - "Planning task cards mirror live target ledger lastTransitionId accurately."
  validatorReferences:
    - "git diff --check"
    - "node atm.mjs hook pre-push --json"
  phaseOwner: "single reconciliation steward"
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "TMP is the registered family for one-time quarantine and residue disposition; this card changes no product contract."
scopePaths:
  - "docs/ai_atomic_framework/**/tasks/*.task.md"
  - "docs/ai_atomic_framework/temporary-governance/reports/TASK-TMP-0006-sweep-report.json"
deliverables:
  - "docs/ai_atomic_framework/temporary-governance/tasks/TASK-TMP-0006-historical-planning-transition-provenance-sweep.task.md"
  - "docs/ai_atomic_framework/temporary-governance/reports/TASK-TMP-0006-sweep-report.json"
validators:
  - "git diff --check"
  - "node atm.mjs hook pre-push --json"
errorCodes: []
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
---

# TASK-TMP-0006 Historical planning transition provenance sweep

## Intent

Sweep all completed planning task cards in 3KLife and align their `lastTransitionId` frontmatter with the verified target live ledger in `AI-Atomic-Framework/.atm/history/tasks/`.

## Governance Note

Planning sweep was executed in commit `5f53e505`, but because this card has no target live ledger or closure packet in target `AI-Atomic-Framework`, its status remains `planned` (not target `done`). There is **no target closure** for TASK-TMP-0006. Target attestation and reconciliation are formally tracked under `TASK-TMP-0007`.

## Required Work

1. Full scan of 3KLife completed task cards' `lastTransitionId`.
2. Cross-reference target live ledger and task events.
3. Update planning cards where `lastTransitionId` was missing or mismatched.
4. Output detailed sweep report in `docs/ai_atomic_framework/temporary-governance/reports/TASK-TMP-0006-sweep-report.json`.

## Acceptance

- [x] All 133 planning cards with target live ledger mismatches/omissions updated.
- [x] `TASK-ERR-0001` aligned to `2026-07-19T04-04-56-002Z-close-1c3aa337733f`.
- [x] `TASK-SKL-0014` aligned to `2026-07-21T02-25-26-704Z-repair-closure-b82036883535`.
- [x] Sweep report generated.
- [x] Pre-push hook executed cleanly.
