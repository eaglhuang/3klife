---
doc_id: doc_cid_0053
task_id: TASK-CID-0053
title: "Dependency gate atom extraction for next and claim"
status: planned
owner: atm-core
priority: P0
milestone: M8
depends_on:
  - "TASK-CID-0051"
  - "TASK-CID-0052"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "packages/cli/src/commands/tasks/dependency-gate.ts"
  - "packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/cli/src/commands/tasks/dependency-gate.ts"
  - "packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.dependency-gate-atom"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Mailbox dispatch scheduling"
  - "Planning repo status mirror"
nonGoals:
  - "Do not treat prose dependencies in dispatch files as sufficient machine gates."
---

# TASK-CID-0053 - Dependency gate atom extraction for next and claim

## Goal

Create one shared dependency gate used by `next`, `next --claim`, and `tasks claim`.

## Required Behavior

- Dependency satisfaction must require trusted governed closeout provenance from TASK-CID-0052.
- The gate must report exact blockers with task id, dependency id, status, and missing provenance reason.
- `next` and `tasks claim` must not drift in behavior.
- A downstream task must not claim if any dependency is `planned`, `running`, `blocked`, ambiguous, or missing trusted closeout.

## Validation

```powershell
npm run typecheck
node --strip-types packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts
npm run validate:cli
git diff --check
```

