---
doc_id: doc_aao_0154
task_id: TASK-AAO-0154
title: "Fail closed on cross-task restore/reset/remove and enter incident-safe mode"
status: done
owner: atm-core
priority: P1
milestone: RFT-M5
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/core/src/broker/"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if legitimate in-scope governed cleanup or closeback operations are misclassified as incidents."
atomizationImpact:
  ownerAtomOrMap: "atm.governed-mutation-boundary"
  mapUpdates: []
outOfScope:
  - "Auto-repairing the damaged task state itself"
  - "Creating validator downgrade profiles or advisory-only bypasses"
nonGoals:
  - "Do not make destructive commands quieter; make them fail earlier and surface better diagnostics"
completed_at: "2026-07-09T17:29:51.213Z"
completed_by_agent: "codex-captain"
closedAt: "2026-07-09T17:29:51.213Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-09T17-29-51-213Z-close-b065b650fa83"
lastTransitionAt: "2026-07-09T17:29:51.213Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "33030ccb06e25fde20af0989284e3bf84560d091"
---

# TASK-AAO-0154 Cross-task mutation incident-safe mode

## Problem

We now have a concrete weak-agent failure shape: an executor tried to make a
governed commit pass by restoring, removing, moving, or unstaging files that
belonged to a different active task. That behavior is worse than a normal
validator failure because it damages evidence and task ownership while trying
to hide ambiguity.

ATM currently leaves too much room for this class of mistake:

- cross-task file-state manipulation can happen before the operator gets a hard
  stop;
- the system does not consistently switch the session into a "freeze, inspect,
  and report" mode after a dangerous mutation attempt;
- the follow-up guidance is too soft for weaker agents that optimize for
  "make commit succeed" instead of "preserve task boundaries."

## Goal

Add an incident-safe mode for governed workflows:

1. Detect cross-task restore/reset/remove/move attempts against files owned by
   another active task or by staged evidence from another task.
2. Fail closed before the mutation is applied whenever ATM has enough context
   to know the target is out of scope.
3. If a dangerous mutation still occurs or is detected after the fact, switch
   the operator into a read-only incident lane with exact diagnostics:
   which file, which task owner, which command family, and which recovery lane
   to use next.

## Acceptance

- A governed command that tries to restore/reset/remove files owned by another
  active task returns a blocking error instead of proceeding.
- The returned diagnostic names the conflicting task id(s), file(s), and
  approved next action.
- Post-incident mode disables further write-path advice until the operator
  acknowledges the incident or moves to a repair lane.
- No new write helper introduced by this card exceeds 600 lines; prefer small
  policy modules over one large incident handler.

## Notes for implementation

- Treat `.atm/history/**` and staged evidence as first-class protected surfaces,
  not just ordinary paths.
- Reuse existing task ownership / claim / allowed-files truth where possible;
  do not add a parallel ownership model.
- The right UX is "stop, explain, and preserve state," not "guess the fix."
