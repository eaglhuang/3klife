---
doc_id: doc_cid_0058
task_id: TASK-CID-0058
title: "Tasks CLI thin wrapper consolidation"
status: done
owner: atm-core
priority: P1
milestone: M10
depends_on:
  - "TASK-CID-0052"
  - "TASK-CID-0053"
  - "TASK-CID-0054"
  - "TASK-CID-0055"
  - "TASK-CID-0056"
  - "TASK-CID-0057"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/"
  - "docs/reports/tasks-command-atomic-map.md"
  - "scripts/validate-tasks-atomic-map.ts"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/command-dispatch.ts"
  - "packages/cli/src/commands/tasks/__tests__/command-dispatch.test.ts"
  - "docs/reports/tasks-command-atomic-map.md"
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
  ownerAtomOrMap: "atm.tasks-thin-cli-wrapper"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Changing CLI command names"
  - "Changing public JSON schemas"
nonGoals:
  - "Do not perform cosmetic-only rewrites."
completed_at: "2026-06-13T15:49:14.928Z"
completed_by_agent: "captain"
delivery_commit: "d9b5d46b3dd13554e16da79fccfd29fe72699841"
---

# TASK-CID-0058 - Tasks CLI thin wrapper consolidation

## Goal

Reduce `tasks.ts` into a thinner CLI orchestration layer after the invariant atoms exist.

## Required Behavior

- `tasks.ts` should primarily parse CLI input, call invariant modules, and format output.
- No duplicated closeout, dependency, lifecycle, historical-delivery, scope-lock, or residue trust logic should remain in `tasks.ts`.
- The atomic map report must record before/after line counts and responsibility movement.
- Public CLI behavior must remain compatible except for intentional hardening errors from previous tasks.

## Atom/Map Extraction Pattern

- Primary pattern: **Facade**.
- `tasks.ts` should become a thin command facade over named atoms; it should not become a new orchestration mega-module under another name.
- The facade may route actions, parse flags, and format CLI results, but governance decisions must live in owner atoms.
- Use the atomic map report to prove each major rule has one owner module and one focused test file.
- Preserve the public surface contract established by TASK-CID-0061; if a caller-facing symbol moves, re-export it from the stable surface rather than changing callers ad hoc.

## Validation

```powershell
npm run typecheck
node --strip-types scripts/validate-tasks-atomic-map.ts
npm run validate:cli
git diff --check
```
