---
task_id: TASK-AAO-0141
title: "git commit task-scoped staging required-command diagnostics"
status: done
completed_at: "2026-06-11T14:46:09.837Z"
completed_by_agent: cursor-agent
lastTransitionId: "2026-06-11T14-46-09-837Z-close-95939d700644"
delivery_commit: "0af42bd14"
owner: atm-core
priority: P1
milestone: M17
closure_authority: target_repo
depends_on:
  - "TASK-AAO-0051"
  - "TASK-AAO-0137"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 運作性提升計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "scripts/validate-governance-commands.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "scripts/validate-governance-commands.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-governance-commands.ts"
  - "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the wrapper diagnostic change and the focused regression coverage; agents fall back to the pre-existing manual staging workaround until a governed fix lands again."
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Implicit auto-stage of task-scoped files during git commit"
  - "tasks deliver-and-close auto-stage behavior"
  - "Broad pre-commit or hook remediation redesign outside git commit wrapper parity"
  - "Changing planning-repo files as part of the target implementation"
nonGoals:
  - "Do not add a generic staged-file bypass for arbitrary dirty worktrees"
  - "Do not silently widen scope to hook.ts or tasks.ts unless a minimal parity fix becomes strictly necessary"
  - "Do not change the commit wrapper into an implicit mutator in this card"
---

# TASK-AAO-0141 - git commit task-scoped staging required-command diagnostics

## Goal

Make `node atm.mjs git commit --task <id>` fail with a task-scoped, actionable diagnostic when the wrapper already knows the task boundary, sees in-scope dirty files, but nothing has been staged yet.

## Why

Current behavior is misleading in a high-friction way:

- the wrapper already knows `--task <id>`;
- the task ledger / direction lock already knows the task's allowed files;
- the worktree may contain dirty files that are fully inside that declared task scope;
- but if the index is empty, the wrapper falls through to raw `git commit` failure and reports only a generic commit failure shape.

That leaves the operator without a precise ATM error code or a runnable `requiredCommand`, even though ATM has enough information to explain the next safe step.

This card fixes the diagnostics gap first. It intentionally does **not** introduce implicit auto-staging in the same slice.

## Implementation Contract

- `atm git commit --task <id>` must inspect task-scoped dirty files before it falls through to the underlying `git commit`.
- When the index is empty and the wrapper can prove that one or more dirty files are inside the task's declared scope, it must fail with a dedicated ATM error/diagnostic instead of a generic raw commit failure.
- The diagnostic must include a runnable `requiredCommand` that stages only the task-scoped files ATM is prepared to name explicitly.
- The required command must not suggest broad `git add .`, broad `git add -A`, or any staging command that sweeps unrelated dirty files into the commit.
- If no task-scoped dirty files exist, or if the dirty tree is ambiguous relative to task scope, the wrapper must keep fail-closed behavior and must not fabricate a staging command.
- This card must not convert `atm git commit` into an implicit writer. Auto-stage or `--stage-scope` ergonomics, if desired later, belong to a separate follow-up.

## Work Outputs

- A focused `git-governance.ts` diagnostic path for the empty-index / task-scoped-dirty case.
- Command-spec or user-facing spec text updated if the wrapper exposes a new dedicated error code or expected operator path.
- Regression coverage proving the wrapper emits a scoped `requiredCommand` instead of a generic failure.
- Atomization map continuity for touched wrapper/test surfaces.

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-governance-commands.ts`
- `node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts`
- `git diff --check`

## Acceptance Criteria

- When `node atm.mjs git commit --actor <id> --task <task> --message "<summary>" --json` is run with no staged files but with dirty files fully inside the task's declared scope, ATM returns a dedicated diagnostic instead of a raw generic commit failure.
- The diagnostic includes a runnable `requiredCommand` that stages only the proven in-scope files.
- The diagnostic does not recommend `git add .`, `git add -A`, or any equally broad staging fallback.
- Normal commit-wrapper success paths remain unchanged when files are already staged correctly.
- Ambiguous or mixed-scope dirty trees remain fail-closed; ATM must not guess a staging command for unrelated files.
- Regression coverage proves this behavior for at least one realistic framework task shape using declared `allowedFiles`.

## Rollback

Revert this task commit. The wrapper returns to the previous generic failure behavior, and operators may continue using manual scoped staging until a governed follow-up lands.

## Notes

2026-06-11 | status: done | validation: passed in AAF | delivery: 0af42bd14 | closed by cursor-agent | change: task-scoped staging diagnostics for empty-index git commit (`ATM_GIT_COMMIT_TASK_SCOPED_STAGING_REQUIRED`)
