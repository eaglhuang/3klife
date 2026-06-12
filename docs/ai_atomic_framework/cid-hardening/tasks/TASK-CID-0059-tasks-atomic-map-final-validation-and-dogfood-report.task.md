---
doc_id: doc_cid_0059
task_id: TASK-CID-0059
title: "Tasks atomic map final validation and dogfood report"
status: planned
owner: atm-core
priority: P1
milestone: M10
depends_on:
  - "TASK-CID-0058"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/reports/tasks-command-atomic-map.md"
  - "docs/reports/tasks-atomic-map-dogfood-report.md"
  - "scripts/validate-tasks-atomic-map.ts"
deliverables:
  - "docs/reports/tasks-command-atomic-map.md"
  - "docs/reports/tasks-atomic-map-dogfood-report.md"
  - "scripts/validate-tasks-atomic-map.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-tasks-atomic-map.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-atomic-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
    - "docs/reports/tasks-atomic-map-dogfood-report.md"
outOfScope:
  - "Further production refactors"
  - "Closing unrelated historical tasks"
nonGoals:
  - "Do not declare success without command-backed validation."
---

# TASK-CID-0059 - Tasks atomic map final validation and dogfood report

## Goal

Validate that the `tasks.ts` atomization refactor preserved safety and improved maintainability.

## Required Work

- Produce a dogfood report comparing before/after responsibilities and line counts.
- Confirm no known abnormal-release path from TASK-CID-0047 reopens.
- Confirm dependency, closeout, historical-delivery, lifecycle, scope-lock, and residue checks have a single owner module.
- Record validator results and any residual risk.

## Validation

```powershell
npm run typecheck
node --strip-types scripts/validate-tasks-atomic-map.ts
npm run validate:cli
git diff --check
```

