---
doc_id: doc_cid_0054
task_id: TASK-CID-0054
title: "Task lifecycle state machine atom extraction"
status: done
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
  - "packages/cli/src/commands/tasks/lifecycle-state.ts"
  - "packages/cli/src/commands/tasks/__tests__/lifecycle-state.test.ts"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/cli/src/commands/tasks/lifecycle-state.ts"
  - "packages/cli/src/commands/tasks/__tests__/lifecycle-state.test.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/lifecycle-state.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.task-lifecycle-atom"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Dependency provenance semantics"
  - "Historical delivery commit proof"
nonGoals:
  - "Do not add alternate task statuses outside the existing schema without a separate design card."
completed_at: "2026-06-13T15:04:37.483Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-13T15-04-37-314Z-close-cf79938e27c5"
delivery_commit: "ec9d8be8"
---

# TASK-CID-0054 - Task lifecycle state machine atom extraction

## Goal

Extract valid task lifecycle transition rules out of `tasks.ts`.

## Required Behavior

- Define explicit allowed transitions for import, reserve, ready, claim, release, close, block, and verify paths.
- Closing directly from `planned` or plain imported state to trusted `done` must fail closed.
- The lifecycle atom must return actionable error codes and required commands.
- Existing legitimate governed close paths must continue to work.

## Atom/Map Extraction Pattern

- Primary pattern: **Policy Object**.
- Represent lifecycle rules as a named transition policy map, not as scattered `if` blocks inside `tasks.ts`.
- The atom should expose stable result contracts for allowed, blocked, and recovery-required transitions.
- Keep `tasks.ts` as the CLI facade: parse flags, call the lifecycle policy, format the result.
- Focused tests must assert at least one allowed transition, one fail-closed transition, and one required-command recovery path.

## Validation

```powershell
npm run typecheck
node --strip-types packages/cli/src/commands/tasks/__tests__/lifecycle-state.test.ts
npm run validate:cli
git diff --check
```
