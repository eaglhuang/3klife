---
task_id: TASK-MAO-0054
doc_id: doc_mao_0054
title: "tasks reserve planning-card precheck and auto-import"
status: done
owner: atm-core
priority: P1
milestone: M8
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0049"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "tests/cli/tasks-reserve-planning-precheck.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "tests/cli/tasks-reserve-planning-precheck.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/tasks-reserve-planning-precheck.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert reserve precheck; reserve falls back to current direct-create behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-reserve-planning-precheck-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Mutating planning-repo cards from the reserve lane (still read-only there)."
  - "Replacing tasks import; reserve only delegates to it when applicable."
nonGoals:
  - "Do not change AI-manual-task audit semantics — they remain the safety net."
completed_at: "2026-06-18T10:33:57.231Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-18T10-33-57-076Z-close-6a20cbec4f79"
delivery_commit: "718f2f4913d15d7bab67b4bb54343faff6d0a148"
---

# TASK-MAO-0054 - tasks reserve planning-card precheck and auto-import

## Background

`tasks reserve --task TASK-XXXX --actor <ai>` currently creates a ledger entry
unconditionally, then the pre-commit audit later flags
`ATM_TASK_AUDIT_AI_MANUAL_TASK_IN_LEDGER` because the entry has no provenance
to a human-authored planning card. The check happens too late — by the time
the agent hits a commit, they've already done substantial implementation work
under what turns out to be an audit-rejected reservation.

Field evidence: TASK-MAO-0014..0022 implementation by claude-code-opus-4-7
required a full rewind (release claims, delete ledger entries, re-import from
planning) after the audit fired at first commit attempt.

## Goal

Move the AI-manual check from commit-time to reserve-time so failures happen
before any code is written.

## Captain Adjustment - 2026-06-18

This card also owns the task-open / import commit lane discovered during CID
historical closeback. When `tasks import --write` creates a planned task ledger
and an import event, the ATM git wrapper must allow that governance bundle to
commit without claiming the new task first. Import reports are useful evidence,
but they must not be mandatory when the canonical ledger + import event already
prove the task-open transition.

## Implementation Contract

- **Precheck on `tasks reserve`**: if `--actor` is an AI actor (per actor
  registry kind, see TASK-MAO-0049), check whether a matching planning card
  exists in the configured `planning_repo`.
  - If found: auto-invoke `tasks import --from <planning-card>` first, then
    proceed with reserve.
  - If not found: refuse with a clear error pointing to the planning_repo
    path and recommending `tasks new --template <key>` or human authorship.
- **`--no-planning-mirror` flag**: explicit opt-out for legitimate scratchpad
  / experiment cards that are not in any planning_repo. Logs an audit event
  so the AI-manual audit still fires at close time if such a card tries to
  governance-close.
- **Resolution rule for planning_repo path**: prefer repo-local
  `taskflow.profile.json` → fallback to `planning_repo` frontmatter on any
  sibling card → fallback to repo conventions documented in
  `docs/ATM_NEW_USER_WORKFLOW.md`.
- **Result contract**: reserve `--json` output includes
  `evidence.planningProvenance` field naming the imported card path (or null
  with `--no-planning-mirror`).

## Acceptance Criteria

- `tasks reserve --task TASK-MAO-XXXX --actor <ai>` for a card that exists in
  planning_repo auto-imports and reserves in one command, no separate
  `tasks import` call needed.
- `tasks reserve` for a card not in planning_repo fails fast with a message
  naming the expected card path and the `--no-planning-mirror` opt-out.
- Re-running TASK-MAO-0014..0022 batch closeback under this lane does not
  produce any `ATM_TASK_AUDIT_AI_MANUAL_TASK_IN_LEDGER` blockers.
- `atm git commit --task <new-task>` can commit a task-open import bundle made
  of `.atm/history/tasks/<task>.json` plus `.atm/history/task-events/<task>/*import*.json`
  without requiring an active claim for that planned task.
- A test fixture simulates AI-actor reserve against (a) existing planning
  card, (b) missing planning card, (c) `--no-planning-mirror` opt-out, and
  asserts the documented behavior for each.

## Out of scope

- Mutating planning-repo cards from reserve.
- Replacing `tasks import` — this card only invokes it when applicable.
