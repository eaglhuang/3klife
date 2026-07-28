---
task_id: TASK-MAO-0055
doc_id: doc_mao_0055
title: "tasks claim auto-intent and closeout-only mutation safety"
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
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "tests/cli/tasks-claim-auto-intent.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "tests/cli/tasks-claim-auto-intent.test.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/tasks-claim-auto-intent.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert auto-intent; explicit --claim-intent remains the only path."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-claim-auto-intent-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing the semantics of normal / closeout-only at commit-time enforcement."
nonGoals:
  - "Do not remove explicit --claim-intent; it remains the override."
completed_at: "2026-06-18T10:56:52.675Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-18T10-56-52-235Z-close-a4790cab323b"
delivery_commit: "8bffe6b81"
---

# TASK-MAO-0055 - tasks claim auto-intent and closeout-only mutation safety

## Background

Two related UX problems around `tasks claim` claim-intent:

1. **`next --claim` for planned cards defaults to picking an intent that often
   does not match what the agent is about to do**. When an AI agent claims a
   `planned` card to do new implementation work, the wrong intent (e.g.
   `closeout-only`) is sometimes accepted, then the pre-commit hook later
   rejects the new source mutation with
   `ATM_PRE_COMMIT_CLOSEOUT_ONLY_CLAIM_MUTATION`.
2. **No early signal**: agent writes source, runs validators, tries to commit,
   and only at commit-time discovers the intent mismatch.

Field evidence: TASK-MAO-0016 closeback (claude-code-opus-4-7) wasted an
entire reserve → claim → write → commit cycle to discover the closeout-only
mismatch. Had to release + re-claim with normal intent.

## Goal

Make claim-intent resolution context-aware so wrong intent is caught at claim
time, not commit time.

## Captain Adjustment - 2026-06-18

This card also owns the closeback-only claim friction found during CID
historical cleanup. Verified historical closeback is not new source mutation,
so it should not require a live write claim merely to record a done transition.
Normal live close still requires claim/session ownership; only verified
historical-delivery or historical-batch cleanup may bypass the live-claim
requirement.

## Implementation Contract

- **`--auto-intent` flag (new) on `tasks claim` and `next --claim`**:
  - If working tree has dirty / staged source files inside the task's
    declared scope → `normal` intent.
  - If declared deliverables are already in HEAD and working tree is clean for
    in-scope source files → `closeout-only` intent.
  - If both conditions true → `normal` (conservative).
  - Default-on for new claims; explicit `--claim-intent X` still wins.
- **Closeout-only safety**: when `--claim-intent closeout-only` is used
  explicitly, and the working tree contains uncommitted source mutations in
  declared scope, **claim refuses immediately** with:
  ```
  ATM_CLAIM_INTENT_CONFLICT: closeout-only claim requires a clean in-scope
  source tree. Found dirty: <files>. Re-claim with --claim-intent normal
  or revert those changes first.
  ```
- **`next playbook` (TASK-MAO-0052 surface)**: when nextAction recommends
  claiming, the `nextCommand` includes `--auto-intent` by default.
- **Result contract**: claim `--json` output includes
  `evidence.claimIntentResolution` field naming the detected files that drove
  the auto-intent choice.

## Acceptance Criteria

- An AI agent claims a `planned` card with uncommitted source in the card's
  scope; auto-intent resolves to `normal`; first commit succeeds.
- An AI agent claims a `planned` card whose deliverables are already in HEAD;
  auto-intent resolves to `closeout-only`; agent proceeds directly to close.
- An explicit `--claim-intent closeout-only` with dirty in-scope source
  refuses immediately with `ATM_CLAIM_INTENT_CONFLICT`, naming the offending
  files.
- A verified historical closeback from `planned/open/running/review/blocked`
  may close without a live claim when historical delivery evidence is supplied;
  ordinary non-historical close remains claim/session gated.
- A regression test exercises the three scenarios above with deterministic
  fixtures.
- TASK-MAO-0014..0022 re-run under this lane produces zero
  `ATM_PRE_COMMIT_CLOSEOUT_ONLY_CLAIM_MUTATION` blockers.

## Out of scope

- Changing what closeout-only actually permits at commit-time hook enforcement
  (that remains as-is).
