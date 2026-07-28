---
task_id: ATM-GOV-0164
title: Unlink sealed worktree node_modules junction before git worktree remove
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0163
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  ATM-GOV-0163 closed with junction-aware rmSync but live sealed build still wiped
  host node_modules because git worktree remove --force traverses the junction first.
  Follow-up stays in governance-optimization / ATM-GOV as 0164.
scopePaths:
  - scripts/run-sealed-runner-build.ts
  - tests/cli/sealed-runner-build-junction-cleanup.test.ts
  - .atm/history/evidence/ATM-GOV-0164.*
  - .atm/history/task-events/ATM-GOV-0164/**
  - .atm/history/tasks/ATM-GOV-0164.json
deliverables:
  - scripts/run-sealed-runner-build.ts
  - tests/cli/sealed-runner-build-junction-cleanup.test.ts
validators:
  - node --strip-types tests/cli/sealed-runner-build-junction-cleanup.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.sealed-runner-build
  mapUpdates: []
completed_at: "2026-07-18T03:10:56.770Z"
completed_by_agent: "cursor-gov-0164"
closedAt: "2026-07-18T03:10:56.770Z"
closedByActor: "cursor-gov-0164"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T03-10-56-664Z-close-1ebbad19e867"
lastTransitionAt: "2026-07-18T03:10:56.770Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c6112af1b316a8feaa92e51c8a1032524445ea42"
---

# ATM-GOV-0164 - Unlink Junction Before git worktree remove

## Series Selection

Follow-up to ATM-GOV-0163 in `governance-optimization` / ATM-GOV. Next free id **0164**.

## Context

ATM-GOV-0163 delivered `removeTreeWithoutFollowingLinks`, but a live
`ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build` still wiped host `node_modules`.
Root cause refinement: `git worktree remove --force` runs **before** junction
unlink and can traverse the Windows junction into the host tree.

## Required Behavior

- Call `unlinkWorktreeNodeModulesLink(worktreeRoot)` **before**
  `git worktree remove --force`.
- Keep junction-aware recursive remove as the fallback.
- Regression asserts unlink-before-remove ordering and host marker survival.

## Acceptance Criteria

- Focused junction test passes with `unlinkBeforeRemove: true`.
- `npm run typecheck` passes.
- Live sealed build (when runner-sync admits) leaves host `node_modules` intact.

## Validation

```shell
node --strip-types tests/cli/sealed-runner-build-junction-cleanup.test.ts
npm run typecheck
```
