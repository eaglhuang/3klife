---
task_id: TASK-MAO-0056
doc_id: doc_mao_0056
title: "Scope amendment error clarity and --claim-first convenience"
status: done
owner: atm-core
priority: P2
milestone: M8
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0049"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli/tasks-scope-add-error-clarity.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "tests/cli/tasks-scope-add-error-clarity.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/tasks-scope-add-error-clarity.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert error message + --claim-first; existing scope add lane is unchanged."
atomizationImpact:
  ownerAtomOrMap: "atm.scope-amendment-error-clarity-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Loosening when scope amendment is permitted; preconditions stay as-is."
nonGoals:
  - "Do not let --claim-first auto-claim across dependency blockers."
completed_at: "2026-06-18T11:34:31.266Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-18T11-34-31-152Z-close-00d5d32d3fd0"
delivery_commit: "1f07c32b1c5c271dc9e27d42985a654bd22efc40"
---

# TASK-MAO-0056 - Scope amendment error clarity and --claim-first convenience

## Background

`tasks scope add` currently fails with `ATM_SCOPE_AMENDMENT_NO_ACTIVE_LOCK`
when the operator holds a reserved lock or a renewed lease but not a full
active claim. The error message names the missing component obliquely
("active lock") and does not tell the operator which prior command would
satisfy the precondition.

Field evidence: TASK-MAO-0014 takeover (claude-code-opus-4-7) — after stale
lease takeover + renew, scope add still failed with no clear hint that
`next --claim` (or equivalent) was needed to convert the lock into an active
claim. Multiple wasted retries before figuring it out.

## Goal

Make the precondition explicit in the error and provide a one-shot
`--claim-first` flag that auto-resolves the common case.

## Implementation Contract

- **Error message rewrite** for `ATM_SCOPE_AMENDMENT_NO_ACTIVE_LOCK`:
  ```
  Scope amendment for <task> requires an active claim, not a bare lock or
  renewed lease. Current state: lock=<state>, claim=<state>, lease=<state>.
  Run one of:
    - node atm.mjs next --claim --task <task> --actor <actor>  (recommended)
    - node atm.mjs tasks renew --task <task> --actor <actor>   (if lease only)
  Then retry the scope amendment.
  ```
- **`--claim-first` flag** on `tasks scope add`:
  - Pre-flight check: if no active claim exists for `--task` under `--actor`,
    auto-invoke `next --claim --task <task> --actor <actor> --auto-intent`
    (depends on TASK-MAO-0055) before performing the scope amendment.
  - If the auto-claim fails (dependency blocker, CID conflict, etc.), surface
    the upstream failure verbatim and do not modify scope.
  - Logs an audit event `scope-amendment.claim-first-resolved` so reviewers
    can distinguish manual vs auto-claim flows.
- **Result contract**: scope add `--json` output gains
  `evidence.preconditionResolution` field describing what state the lock /
  claim / lease was in at entry.

## Acceptance Criteria

- `tasks scope add` against a reserved-but-not-claimed task produces an error
  that names `next --claim` as the next command.
- `tasks scope add --claim-first --task X` succeeds in one call when the task
  is in a claimable state.
- `tasks scope add --claim-first --task X` against a dependency-blocked task
  surfaces the dependency blocker; scope is unchanged.
- A regression test exercises the three scenarios above.

## Out of scope

- Changing when scope amendment is permitted (preconditions remain as
  designed in TASK-MAO-0049).
- Allowing `--claim-first` to bypass governance gates.
