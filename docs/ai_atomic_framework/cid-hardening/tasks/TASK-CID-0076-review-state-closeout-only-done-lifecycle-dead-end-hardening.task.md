---
task_id: TASK-CID-0076
doc_id: doc_cid_0076
title: "Review-state closeout-only done lifecycle dead-end hardening"
status: done
owner: atm-core
priority: P0
milestone: M16
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0063"
  - "TASK-CID-0065"
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-ledger-governance.ts"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-ledger-governance.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if review-state reclaim broadens write claims unsafely or allows done close without real historical-delivery proof."
atomizationImpact:
  ownerAtomOrMap: "atm.task-review-closeout-lifecycle"
  mapUpdates:
    - "packages/cli/src/commands/tasks.ts"
    - "scripts/validate-task-ledger-governance.ts"
outOfScope:
  - "Do not redesign TASK-CID-0063 taskflow close dual-repo bundle semantics."
  - "Do not weaken TASK-CID-0065 emergency lane permissions."
  - "Do not hand-edit legacy .atm history files."
  - "Do not reopen or rewrite already trusted governed done tasks just to normalize style."
nonGoals:
  - "Do not add a second task lifecycle model."
  - "Do not allow ordinary write claims to bypass existing closeout gates."
  - "Do not make review-state tasks auto-close to done without an explicit governed reclaim or closeback route."
contextMap:
  primary:
    - path: "packages/cli/src/commands/tasks.ts"
      reason: "owns task lifecycle transitions, close gates, claim intent persistence, and reset/import edge behavior"
  secondary:
    - path: "packages/cli/src/commands/next.ts"
      reason: "owns next --claim guidance and admission routing for closeout-only reclaim"
    - path: "packages/cli/src/commands/taskflow.ts"
      reason: "operator lane may need to surface the repaired review-state closeback route"
  tests:
    - path: "scripts/validate-task-ledger-governance.ts"
      reason: "must add a 0047-style planning-authority review-state closeout regression"
    - path: "scripts/validate-cli.ts"
      reason: "must keep operator guidance and protected backend wording aligned"
  patterns:
    - referencePath: "packages/cli/src/commands/tasks.ts"
      referenceTaskId: "TASK-CID-0024"
      description: "reuse existing closeout-only claim and historical-delivery semantics instead of inventing a new lifecycle branch"
completed_at: "2026-06-13T14:44:38.729Z"
completed_by_agent: "captain"
delivery_commit: "8bbeac2c"
---

# TASK-CID-0076 - Review-state closeout-only done lifecycle dead-end hardening

## Goal

Repair the lifecycle dead-end exposed by TASK-CID-0047: a task that is already in `review`, has no more intended source mutation, and needs only governed closeout to `done` should have a mechanical reclaim path that does not require destructive `tasks import --reset-open` recovery or direct runtime surgery.

The repaired route must work for ordinary historical-delivery closeout and for `planning_repo` authority tasks whose real deliverable already lives in the planning repo.

## Problem

Current ATM behavior leaves a real hole between "review" and "done":

- `tasks claim` rejects review-state tasks because the task is not considered ready;
- `tasks reset` only supports `--to open`, but `review` is not an allowed source state;
- `tasks close --status done` still requires an active claim;
- the only currently viable escape hatch is a dangerous runtime overwrite/import reset, which is exactly the kind of backend repair lane TASK-CID-0063 and TASK-CID-0065 are trying to demote.

This means a task can be logically delivered yet become mechanically uncloseable through the normal governed lane. That is a lifecycle bug, not operator error.

## Required Behavior

- Before source edits, run the repo-local `atm-atom-map-refactor` skill as a lifecycle/state-machine preflight.
- Keep the extraction scoped to this card. A small `TaskLifecyclePolicy` / result-contract split is welcome if it reduces ambiguity, but do not widen into TASK-CID-0062-style general module extraction.
- Define one governed reclaim path for `review -> done` when all remaining work is closeout-only:
  - no new source mutation is intended;
  - the operator claims with `--claim-intent closeout-only` (or equivalent taskflow-mediated route);
  - deliverable proof comes from current scoped diff or `--historical-delivery`.
- A task in `review` with no active conflicting writer claim must be reclaimable for closeout-only completion without first forcing the ledger back to `open`.
- The reclaim route must preserve existing safety checks:
  - done still requires real non-`.atm` deliverable proof or valid historical-delivery proof;
  - planning-authority tasks still must not mutate target source deliverables outside their declared lane;
  - direct backend emergency surfaces remain protected by TASK-CID-0065.
- `next --claim` and any taskflow closeback guidance must recommend the repaired reclaim route instead of hinting at reset/open workarounds.
- If a review-state task lacks valid deliverable proof, ATM must still fail closed with a precise diagnostic and a governed next command. The fix is not "always allow review -> done."
- Add a regression fixture matching the TASK-CID-0047 shape:
  - planning repo authority;
  - planning-side deliverable already landed;
  - runtime task sits in `review` / released;
  - operator can reclaim closeout-only and complete governed closeout to `done` without reset-open import.

## Acceptance Criteria

- A review-state task with historical-delivery proof can be reclaimed with `--claim-intent closeout-only` and closed to `done` through a governed path.
- The same route works for a planning-authority closeout fixture without forcing `tasks import --reset-open`.
- `next --claim` guidance for the fixture points to the repaired closeout-only reclaim route, not to an invalid reset path.
- A review-state task without valid current or historical deliverable proof still fails closed and surfaces a stable diagnostic/remediation path.
- Existing non-review closeout-only historical-delivery regressions continue to pass.
- `npm run validate:cli` and `validate-task-ledger-governance` both cover the new lifecycle route.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report:

- the exact reclaim route added or repaired;
- whether the fix lives in lifecycle policy, claim admission, close gate, or operator guidance layers;
- the new stable diagnostics (if any);
- the TASK-CID-0047-style regression scenario and outcome;
- whether the refactor skill suggested a retained in-scope atom/map extraction or only a deferred candidate.
