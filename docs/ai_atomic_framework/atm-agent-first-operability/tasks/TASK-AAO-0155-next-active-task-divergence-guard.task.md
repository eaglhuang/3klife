---
doc_id: doc_aao_0155
task_id: TASK-AAO-0155
title: "Prevent next --prompt from silently attaching new bug work to the wrong active task"
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
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/core/src/broker/"
  - "scripts/validate-prompt-scoped-next.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:prompt-scoped-next"
  - "git diff --check"
deliverables:
  - "packages/cli/src/commands/next.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if valid same-lane continuation prompts stop resolving to their intended active task."
atomizationImpact:
  ownerAtomOrMap: "atm.next-routing"
  mapUpdates: []
outOfScope:
  - "Reworking the whole broker conflict model"
  - "Adding a free-form bypass that lets agents override divergence without evidence"
nonGoals:
  - "Do not optimize for fewer prompts at the expense of task-boundary correctness"
completed_at: "2026-07-09T17:53:52.718Z"
completed_by_agent: "codex-captain"
closedAt: "2026-07-09T17:53:52.718Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-09T17-53-52-210Z-close-b3526bbac3ce"
lastTransitionAt: "2026-07-09T17:53:52.718Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c50036809840f4685fce53a565ca45f6d141f3dc"
---

# TASK-AAO-0155 Active-task divergence guard

## Problem

When an agent is already inside one active task, a fresh bug-fix prompt can be
incorrectly interpreted as "continue the current task" even when the user's
intent has diverged. In practice this lets a weaker model attach unrelated bug
work to the currently running refactor card, then justify touching the wrong
files because routing said so.

That is especially dangerous when the current active task is already large or
hot, because the misroute looks official.

## Goal

Teach `next --prompt` to detect "active task divergence" and fail into a
clearer decision instead of silently binding the new request onto the current
task.

Examples that should trigger the guard:

- prompt names a bug/backlog item not mentioned by the current task;
- prompt asks for governance repair while the active task is a source refactor;
- prompt explicitly says not to use the current task as carrier;
- prompt scope points at files outside the current task's declared ownership.

## Acceptance

- For a divergent prompt, `next --prompt` returns a blocking or escalation
  result with explicit reasoning instead of auto-attaching to the current task.
- The result tells the operator whether to open/import a new card, repair the
  current task metadata, or continue the active task intentionally.
- Existing same-task continuation flows still work for real follow-up prompts.
- New helper modules introduced by this card stay under 600 lines and keep the
  routing policy inspectable.

## Notes for implementation

- Prefer evidence-based divergence checks over keyword heuristics alone.
- Use current task frontmatter, declared scope, and active claim metadata as
  primary signals.
- This card is a root-cause treatment for bug-lane misattachment; it must not
  introduce validator downgrade mechanisms.
