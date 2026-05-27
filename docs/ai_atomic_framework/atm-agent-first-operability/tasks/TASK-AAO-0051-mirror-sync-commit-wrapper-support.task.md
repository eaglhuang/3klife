---
doc_id: doc_task_aao_0051
task_id: TASK-AAO-0051
title: "Mirror-sync commit wrapper support"
status: planned
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "Mirror-sync-only routes already avoid claim/close/deliverable work, but the git commit wrapper still requires a work session and pushes agents toward --no-verify."
milestone: M16
depends_on:
  - "TASK-AAO-0038"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "scripts/validate-governance-commands.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "scripts/validate-governance-commands.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-governance-commands.ts"
  - "node atm.mjs tasks import --from \"../3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md\" --dry-run --json"
  - "node atm.mjs tasks import --from \"../3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md\" --dry-run --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert mirror-sync commit wrapper changes; mirror-sync imports remain possible, but agents return to the previous manual commit workaround until the wrapper is fixed."
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Claiming, closing, or implementing the mirrored source task during mirror-sync-only commit flow"
  - "Adding a blanket allowlist for arbitrary .atm/history/** files"
  - "Weakening actor trailer, task trailer, task id, staged-file, or report-shape checks"
  - "Changing 3KLife planning files as part of the target implementation"
nonGoals:
  - "Making mirror-sync-only behave like normal delivery"
  - "Allowing commit wrapper bypass through --no-verify as the documented path"
  - "Reopening or reimplementing TASK-AAO-0036 deliverables"
---
# TASK-AAO-0051 - Mirror-sync commit wrapper support

## Goal

Give `mirror-sync-only` ledger imports a formal ATM git commit wrapper path, so a valid mirror sync can be committed without `--no-verify`, claim, close, or fake deliverable implementation.

## Why

During the `TASK-AAO-0036` mirror-sync pass, ATM correctly routed `next --task TASK-AAO-0036` to `recommendedChannel: mirror-sync` with `intent: mirror-sync-only` and a `tasks import --write --force` required command. The import result was valid, but `node atm.mjs git commit --task TASK-AAO-0036` still required an actor work session created by `next --claim`. That contradicts mirror-sync-only semantics: the source task is already done in the planning repo, and the target repo should only commit the imported ledger mirror artifacts.

The dogfood commit `5c95bad` used `git commit --no-verify` with correct trailers as a one-time workaround. The result is acceptable evidence of the desired shape, but the product path must be first-class in ATM.

The first source-side patch landed in `67e6ed3`, and it exposed a second small but related gap: a framework-temp commit with no task can still make `git check --actor` look at an old closed session and ask for stale trailers. That must be covered by this card because the symptom is the same bad attribution model: ATM should not teach agents to copy historical task/session trailers into a taskless commit.

## Implementation Contract

- `atm git commit` must recognize a `mirror-sync-only` route or equivalent staged-file shape for a specific task and allow the commit without an actor work session or claim lease.
- The special path is legal only when staged files are limited to that task's mirror-sync artifacts:
  - `.atm/history/tasks/<task>.json`
  - `.atm/history/task-events/<task>/*import*.json`
  - `.atm/history/reports/task-import/*.json`
- The wrapper must still require and verify actor trailer, task trailer, task id consistency, and staged-file scope.
- The task id in the task ledger path, task-events path, import report payload, and `ATM-Task` trailer must agree.
- The path must not become a generic `.atm/history/**` bypass.
- `mirror-sync-only` must not run `next --claim`, `tasks close`, or any source-task deliverable implementation step.
- `mirror-sync-only` must not require, create, imply, or recommend a fake claim, fake actor work session, or fake claim lease just to satisfy commit attribution.
- `mirror-sync-only` must not inherit closed, released, abandoned, stale, or otherwise unrelated prior work sessions.
- `git check`, `git commit`, and pre-commit must derive required trailers only from the current explicit task, the current valid session, or the task id proven by mirror-sync-only staged artifacts.
- Actor-only or no-task git checks must not fall back to historical sessions when no current task/session exists; in that state they must not require `ATM-Task` or `ATM-Session` trailers.
- Dogfood gap: `node atm.mjs git check --actor codex-main --json` in a framework-temp / no-task commit context must not require an old closed `TASK-AAO-0028` session trailer and must not guide the agent to write stale task/session trailers into the commit.
- Taskless framework-temp commits must be treated as actor-only attribution unless a current explicit task/session is supplied; they must not inherit a closed prior session through identity defaults, recent session hints, or trailer checks.
- Regression fixtures should use the `TASK-AAO-0036` / commit `5c95bad` shape: one synced task ledger file, one import event, and one task-import report.

## Deliverables

- Git governance wrapper support for mirror-sync-only staged artifacts.
- Pre-commit hook attribution logic that accepts mirror-sync-only without claim/session while keeping trailer and file-scope checks.
- Command-spec or validator coverage for the mirror-sync commit path.
- Regression fixture based on the `TASK-AAO-0036` / `5c95bad` artifact shape.
- Atomization ownership map update for touched command, hook, or validator paths.

## Validators

- npm run typecheck
- npm run validate:cli
- node --strip-types scripts/validate-governance-commands.ts
- node atm.mjs tasks import --from "../3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md" --dry-run --json
- node atm.mjs tasks import --from "../3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json
- git diff --check

## Acceptance Criteria

- A `mirror-sync-only` route can use the formal ATM commit wrapper without `--no-verify`.
- `atm git commit` accepts a staged set containing only the matching task's mirror-sync artifacts:
  - `.atm/history/tasks/<task>.json`
  - `.atm/history/task-events/<task>/*import*.json`
  - `.atm/history/reports/task-import/*.json`
- The mirror-sync commit path does not require claim, actor work session, claim lease, or task close because the route explicitly means `doNotDeliverHere`.
- Actor trailer, task trailer, staged-file scope, and task id correspondence are still checked.
- A staged unrelated `.atm/history/**` file is rejected.
- The wrapper does not request, generate, or hint at fake claim/session/lease data for mirror-sync-only commits.
- A closed, released, stale, or unrelated prior actor work session is ignored for mirror-sync-only commits unless the user explicitly supplies it as the current valid session for the same task.
- `git check`, `git commit`, and pre-commit do not treat stale historical session trailers as required trailers when no current task/session exists.
- Required trailers come only from the current explicit task, the current valid session, or the task id represented by the mirror-sync-only staged artifacts; historical session fallback is forbidden.
- Regression coverage includes an actor-only `node atm.mjs git check --actor codex-main --json` with a closed prior session and no current task. Expected result: no required `ATM-Task` or `ATM-Session`, no suggestion to reuse the old `TASK-AAO-0028` session trailer, and no stale trailer guidance.
- Regression coverage includes the post-`67e6ed3` source patch shape: a framework-temp commit with no current task and a closed prior actor work session. Expected result: actor-only trailers are sufficient, no stale closed-session trailer is required, and `git check` does not suggest adding `ATM-Task` / `ATM-Session` from the prior task.
- A taskless commit must never inherit a closed, released, or stale session from identity defaults, recent session lookup, or historical trailer parsing.
- Regression evidence uses the `TASK-AAO-0036` / commit `5c95bad` shape and proves the wrapper path succeeds without weakening normal delivery commits.

## Rollback

Revert this task commit. Mirror-sync imports remain supported, but agents must not treat `--no-verify` as the official path after rollback; the task should remain open until a safe wrapper path exists.

## Atomization Impact

- Owner atom/map: atm.git-governance-map
- Map updates: atomic_workbench/atomization-coverage/path-to-atom-map.json
- Any new validator fixture or helper introduced by this card must be mapped before closure.

## Notes

2026-05-27 | 狀態: planned | 驗證: pending | 變更: 開立 mirror-sync commit wrapper support 任務，來源為 TASK-AAO-0036 mirror-sync dogfood | 阻塞: none
2026-05-27 | 狀態: planned | 驗證: pending | 變更: 補入 source patch 67e6ed3 後發現的 taskless framework-temp commit 不得繼承舊 closed session 驗收 | 阻塞: none