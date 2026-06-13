---
doc_id: doc_cid_0052
task_id: TASK-CID-0052
title: "Closeout provenance atom extraction"
status: done
started_at: "2026-06-13T17:18:45+08:00"
completed_at: "2026-06-13T17:23:32+08:00"
started_by_agent: "captain"
completed_by_agent: "captain"
target_delivery_commit: "d779a820d15b15e0d57135b82c7fa483956fb04f"
target_close_commit: "8188e9fe17e7ed8d327b45c6176927a4d70f7e67"
owner: atm-core
priority: P0
milestone: M8
depends_on:
  - "TASK-CID-0051"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "packages/cli/src/commands/tasks/closeout-provenance.ts"
  - "packages/cli/src/commands/tasks/__tests__/closeout-provenance.test.ts"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/cli/src/commands/tasks/closeout-provenance.ts"
  - "packages/cli/src/commands/tasks/__tests__/closeout-provenance.test.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/closeout-provenance.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.closeout-provenance-atom"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Historical-delivery commit diff scope rules"
  - "Task lifecycle transition design"
nonGoals:
  - "Do not duplicate closeout provenance logic in multiple files."
---

# TASK-CID-0052 - Closeout provenance atom extraction

## Goal

Extract closure packet and close transition trust checks into a single reusable module.

## Required Behavior

- `tasks.ts` and `next/route-predicates.ts` must call the same closeout provenance verifier.
- The verifier must require `atm.closurePacket.v1` with matching `taskId` when relying on closure packet files.
- The verifier must require `closure.schemaId = "atm.taskClosureTransition.v1"` when relying on transition events.
- Unsafe or ambiguous provenance must return a structured fail-closed reason, not a boolean-only result.

## Validation

```powershell
npm run typecheck
node --strip-types packages/cli/src/commands/tasks/__tests__/closeout-provenance.test.ts
npm run validate:cli
git diff --check
```
