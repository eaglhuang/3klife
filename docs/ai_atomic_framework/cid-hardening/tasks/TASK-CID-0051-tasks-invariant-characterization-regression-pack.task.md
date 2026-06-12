---
doc_id: doc_cid_0051
task_id: TASK-CID-0051
title: "Tasks invariant characterization regression pack"
status: planned
owner: atm-core
priority: P1
milestone: M7
depends_on:
  - "TASK-CID-0050"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validate-cli.ts"
  - "scripts/fixtures/tasks-invariant-regressions/"
deliverables:
  - "scripts/validate-cli.ts"
  - "scripts/fixtures/tasks-invariant-regressions/"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-invariant-characterization"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Moving production code"
  - "Relaxing closeout gates"
nonGoals:
  - "Do not mark unsafe historical behavior as acceptable."
---

# TASK-CID-0051 - Tasks invariant characterization regression pack

## Goal

Add regression fixtures that lock down the known abnormal-release cases before refactoring begins.

## Required Work

- Add fixtures proving `status=done` without governed closeout provenance does not satisfy dependencies.
- Add fixtures proving mailbox `done` and planning-card `done` cannot replace target repo closeout.
- Add fixtures proving a manual close event without closure metadata is rejected.
- Add fixtures proving valid closure packet and valid close transition metadata still admit downstream claim.
- Keep the coverage command-backed through `npm run validate:cli`.

## Validation

```powershell
npm run typecheck
npm run validate:cli
git diff --check
```

