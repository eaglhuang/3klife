---
doc_id: doc_cid_0055
task_id: TASK-CID-0055
title: "Historical delivery atom extraction and provenance policy"
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
  - "packages/cli/src/commands/tasks/historical-delivery.ts"
  - "packages/cli/src/commands/tasks/__tests__/historical-delivery.test.ts"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/cli/src/commands/tasks/historical-delivery.ts"
  - "packages/cli/src/commands/tasks/__tests__/historical-delivery.test.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/historical-delivery.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.historical-delivery-atom"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Changing git history"
  - "Broad retroactive cleanup of old task ledgers"
nonGoals:
  - "Do not let a broad mixed commit silently become trusted task delivery."
---

# TASK-CID-0055 - Historical delivery atom extraction and provenance policy

## Goal

Extract historical-delivery and reconcile commit proof into one shared module.

## Required Behavior

- `tasks close --historical-delivery` and `tasks reconcile --delivery-commit` must use the same commit provenance verifier.
- The verifier must classify task-matched files, governance files, out-of-scope files, generated files, and waived files.
- Mixed-task or stale commits must fail closed unless an explicit governed waiver is present.
- The closure packet must record the commit proof classification.

## Validation

```powershell
npm run typecheck
node --strip-types packages/cli/src/commands/tasks/__tests__/historical-delivery.test.ts
npm run validate:cli
git diff --check
```

