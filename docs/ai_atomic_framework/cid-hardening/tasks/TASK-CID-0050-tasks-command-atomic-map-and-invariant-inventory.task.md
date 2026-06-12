---
doc_id: doc_cid_0050
task_id: TASK-CID-0050
title: "Tasks command atomic map and invariant inventory"
status: done
completed_at: "2026-06-12T12:07:51+08:00"
completed_by_agent: "001b"
owner: atm-core
priority: P1
milestone: M7
depends_on:
  - "TASK-CID-0048"
  - "TASK-CID-0049"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/reports/tasks-command-atomic-map.md"
  - "scripts/validate-tasks-atomic-map.ts"
deliverables:
  - "docs/reports/tasks-command-atomic-map.md"
  - "scripts/validate-tasks-atomic-map.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-tasks-atomic-map.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the report and validator if the map is inaccurate."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-atomic-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Refactoring tasks.ts"
  - "Changing task lifecycle behavior"
nonGoals:
  - "Do not move code in this task."
---

# TASK-CID-0050 - Tasks command atomic map and invariant inventory

## Goal

Produce a read-only atomic map of `packages/cli/src/commands/tasks.ts` and the related caller surfaces before any extraction begins.

## Required Work

- Inventory functions, command flows, and governance invariants in `tasks.ts`.
- Map callers from `tasks.ts`, `next.ts`, and `next/route-predicates.ts`.
- Identify duplicated or near-duplicated logic for closeout provenance, dependency satisfaction, lifecycle state checks, historical delivery, scope locks, and residue diagnostics.
- Produce a concise report with proposed atom names and file extraction targets.
- Add a lightweight validator that fails if the report omits required atom sections.

## Validation

```powershell
npm run typecheck
node --strip-types scripts/validate-tasks-atomic-map.ts
git diff --check
```
