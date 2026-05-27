<!-- doc_id: doc_other_1318 -->
# ATM Agent-First 可操作性優化計畫書

## Summary

AAO（Agent-First Operability）是 ATM 自我治理後的第二條主線。ASA 解決「框架本身是否被原子化、能否被量測」；AAO 解決「AI 真的照 ATM 做事時，入口、訊息、證據、batch、commit gate 是否好用」。

大白話說：ASA 是把 ATM 的骨架補齊；AAO 是讓 AI 用起來不要一直被絆倒，也不要因為流程太難而開始繞路。

本文件是 AAO 的唯一規劃真相來源。任務卡放在 `tasks/`，所有任務都使用新的 `atm-task-card-authoring` 合約格式。

## Scope Boundary

- Planning repo: `3KLife`
- Target repo: `AI-Atomic-Framework`
- Closure authority: target repo
- Planning paths are read-only context unless a task explicitly says it is a planning/doc task.
- Target work must be listed in `scopePaths` and `deliverables`.
- Any new script, CLI, validator, report, or artifact must update atomization ownership in the same task.

## Original AAO Baseline

AAO 0000-0008 are the original AAO baseline:

- M0: AAO docs initialization and ASA bridge index.
- M1: overlap matrix, CLI command surface, and `next` decision trail.
- M2: validator failure envelope and context slimming.
- M3: docs/schema/command drift and onefile budget.
- M4: roadmap backwrite and bridge closure.

These cards are preserved, but rewritten into the new contract format. AAO-0000 remains `done`. AAO-0001 has already been closed in the ATM framework ledger and is marked `done` here; AAO-0002 through AAO-0008 remain `planned` so they can be re-run consistently.

## Opus 4.7 實戰反饋承接

The first long-form dogfood run exposed several agent-facing pain points:

- Agents still guess lifecycle steps when the playbook is not state-aware.
- Scope amendment lacks a safe official CLI, so agents try to edit lock JSON.
- Evidence is too slow and too repetitive when validators are re-run per card.
- Pre-commit and checkpoint gates often block correctly, but error envelopes are not actionable enough.
- Planning docs and target repo paths can blur together in cross-repo flows.
- Batch state must be resumable, inspectable, and identified by batchId, not treated as a single repo-global blob.
- ASA score gaps now need follow-up tasks for scorer instrumentation, rollback proof, and map schema validation.
- `next` should be a selector-first navigation aid, not a global scheduler that hard-selects unrelated work.
- ATM command surface must stay concentrated and example-rich; too many scattered commands become an AI usability bug.

AAO M5-M11 turns that feedback into implementable tasks.

## Selector-First Next Principle

ATM can recommend work order, but it must not own the work order. User intent and explicit selectors come first:

- `next --task TASK-AAO-0010`
- `next --tasks TASK-AAO-0010,TASK-AAO-0011`
- `next --plan "<plan path>"`
- `next --family TASK-AAO`
- `next --batch <batchId>`

If no selector is provided, `next` may infer from prompt. If confidence is low, it must ask for selection instead of falling back to an unrelated task. Hard blocking is reserved for real governance risks: active claim in the same scope, active batch checkpoint debt, staged files owned by another active scope, dependency failure, protected state changes, or missing evidence.

## Command Surface Principle

ATM commands must be concentrated around a small agent-facing path:

- `next --prompt` / `next --claim`
- `batch status` / `batch checkpoint`
- `evidence validators --list` / `evidence run`
- `status`
- `tasks show --planning-doc` / `tasks scope --add`

Low-level lifecycle commands can remain for maintainers, but help and integration files must not teach them as the normal AI path. Every public command help page must include usage, required flags, examples, common mistakes, and related commands.

## Operating Premises

AAO changes are built on these premises:

- `next` is a selector-first navigation aid, not the owner of user work priority. Explicit user selectors such as `--task`, `--tasks`, `--plan`, `--family`, and `--batch` override heuristic queue picking.
- ATM may hard-block only for real governance risks: an active claim in the same scope, active batch checkpoint debt, staged files owned by another active scope, unmet dependency, protected `.atm/**` state mutation, or missing command-backed evidence.
- Planning repo paths are read-only context unless the task is explicitly a planning task. Target work must be listed in `scopePaths` and `deliverables`.
- Batch work is scoped by `batchId` and a fixed task set. Multiple batches may be active if target files do not overlap.
- Task cards are delivery contracts, not the objective. Work must produce non-`.atm/**` deliverables before closure.
- Public AI-facing commands should stay concentrated around `next`, `batch`, `evidence`, `status`, and focused `tasks show/scope` operations. Low-level lifecycle commands remain maintainer tools.
- Every new script, CLI, validator, report, artifact, or generated output must update atomization ownership in the same task.
- Framework source validation should use the frozen runner by default; source-first `atm.dev.mjs` is only for explicit ATM source validation.

## Acceptance Test Plan

AAO is accepted by running scenario tests, not by checking that task cards were closed. Each implementation task keeps its own validators, and the full AAO lane must also satisfy these grouped checks:

1. Planning import and card contract
   - `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json` discovers all AAO cards.
   - All `TASK-AAO-*.task.md` files include `scopePaths`, `deliverables`, `validators`, `evidence.required`, `rollback`, and `atomizationImpact`.
   - `git diff --check` passes for the AAO planning files.
2. Selector-first routing
   - `next --task <id>` resolves that exact task or returns not-found.
   - `next --tasks <id,id>` preserves user order and does not sort or widen the scope.
   - `next --plan <path>` and `next --family <family>` resolve only matching cards.
   - Low-confidence prompts return selection-required or scope-not-found; they must not fallback to unrelated open tasks.
3. Batch and checkpoint flow
   - `next --claim --tasks ...` creates a `batchId` and freezes taskIds.
   - `batch status --batch <id>` shows queue head, checkpoint debt, changed files, and next command.
   - `batch checkpoint --batch <id>` closes only the queue head, advances the queue, and writes command-backed closure evidence.
   - Stale locks from the previous queue head are cleaned or explained with a required command.
4. Scope and lock amendments
   - A missing artifact path returns a scope-expansion-required diagnostic, not an invitation to edit lock JSON.
   - `tasks scope --add` records an auditable amendment and updates the lock allowedFiles single source of truth.
   - Direct edits to `.atm/runtime/locks/**` remain blocked by tool and commit gates.
5. Evidence and closure usability
   - `evidence validators --list` explains valid validator names for the current task.
   - `evidence run` / `--recent-run` can attach command-backed evidence without rerunning expensive validators unnecessarily.
   - Failed command runs cannot be counted as validation passes.
   - Missing validator closure errors include a concrete requiredCommand.
6. Hook and commit gates
   - Neutrality scanning is staged-only where appropriate.
   - Artifact commit policy blocks standalone static artifacts but allows proper task/evidence context.
   - CRLF policy is deterministic and fixable.
   - Protected ATM runtime/history edits are blocked unless produced by official CLI commands.
7. Score and atomization gates
   - Public command coverage reads command specs.
   - Readable reference scoring counts semantic refs from the validator output.
   - Rollback-proof evidence is schema-validated.
   - Atom map/spec schema validation passes for new ownership updates.
8. Human-facing UX
   - `atm status` summarizes current repo/channel/batch/task blockers.
   - `tasks show --planning-doc` links a task back to its plan and feedback source.
   - Help output includes usage, examples, common mistakes, and related commands for primary public commands.

### End-to-End Agent Journey Scenario

AAO acceptance test plan must include one complete governed agent journey scenario that verifies the cross-task workflow across scope amendment, evidence, checkpoint, commit window, and next claim. Passing the eight grouped checks above is necessary but not sufficient; the AAO lane is only accepted when this single end-to-end scenario also passes, because the most common production failures live in the seams between these checks.

Scenario steps and expected behavior:

1. `next --claim --task X`
   - Expected: claim succeeds, `taskDirectionLock.allowedFiles` already contains every path declared in the task card `deliverables` (AAO-0012 / AAO-0038 frontloaded).
2. Agent attempts to write outside declared deliverables.
   - Expected: pre-write detection (AAO-0010) blocks the write with `ATM_SCOPE_AMENDMENT_SUGGESTED` and prints the exact `node atm.mjs tasks scope --add ... --json` command.
3. `tasks scope --add file1,file2,file3`
   - Expected: creates exactly one `scope-amendment-event` (atomic, multi-path), updates the single SSOT `allowedFiles`, and is auditable via task-events.
4. Agent writes the now-allowed files.
   - Expected: writes succeed and are within the amended scope.
5. Validator runs and evidence is captured through cached command runs.
   - Expected: `evidence run` / `--recent-run` (AAO-0016) records command, exit code, stdout/stderr sha256, and reuses cached command runs when inputs are unchanged. Failed command runs cannot be marked as validation passes; diagnostic / expected-failure evidence is recorded separately.
6. `evidence missing --task X`
   - Expected: lists remaining validator/evidence gaps with one concrete `requiredCommand` per gap (AAO-0017), distinguishing absent, failed, stale, and diagnostic-only evidence.
7. Agent completes missing evidence.
   - Expected: re-run validators or attach diagnostic evidence; closure packet `validationPasses` is filled.
8. `batch checkpoint --hold`
   - Expected: closes current task but does not auto-claim the next task; `batch status` reports held state and resume command (AAO-0041).
9. Commit close artifacts (deliverables + `.atm/history/tasks/<X>.json` + evidence + task-events).
   - Expected: checkpoint commit window (AAO-0037) lets the just-closed task's artifacts pass pre-commit even after the queue has advanced; artifact commit policy (AAO-0032) classifies the commit by trailer + checkpoint window.
10. `next --claim` for the next task.
    - Expected: must not auto-advance while previous-task checkpoint debt or pending commit window exists (AAO-0047); only claims after debt is cleared, and the new lock again contains task-card deliverables verbatim.

This scenario must explicitly cover the integration boundaries for `TASK-AAO-0010`, `TASK-AAO-0012`, `TASK-AAO-0014`, `TASK-AAO-0016`, `TASK-AAO-0017`, `TASK-AAO-0037`, `TASK-AAO-0038`, `TASK-AAO-0041`, and `TASK-AAO-0047`. A regression in any one of those tasks must surface as a failure in this scenario, not only as a unit-level acceptance miss.

Implementation of an executable validator that replays this scenario (for example `scripts/validate-aao-agent-journey.ts`) is out of scope for `TASK-AAO-0036` and must be opened as a separate framework source task with atomization ownership updates (candidate: extend `TASK-AAO-0047`, or open `TASK-AAO-0048` if scope review requires a dedicated card).

## Rollout And Regression Plan

- Implement AAO in dependency order unless the user explicitly selects a narrower task or task range.
- Each task must keep its commit small and include its atomization map update when it touches framework scripts, validators, reports, artifacts, or CLI commands.
- After M5-M12 land, rerun the grouped acceptance tests before `TASK-AAO-0033` final dogfood and sync.
- `TASK-AAO-0036` owns this cross-cutting acceptance plan and must be updated whenever a later task changes the expected acceptance surface.

## Execution Priority

- P0: prevent AI from editing locks/runtime manually, committing before checkpoint, or being routed to unrelated tasks.
- P1: reduce speed pain by improving evidence reuse, status visibility, and state-aware playbooks.
- P2: improve scorer instrumentation and final dogfood reports.
- P3: polish documentation, examples, and long-term command-surface ergonomics.
## Milestones

| Milestone | Theme | Tasks |
|---|---|---|
| M0 | AAO planning baseline | AAO 0000 |
| M1 | Route clarity and command surface SSOT | AAO 0001-0003 |
| M2 | Agent-readable errors and context slimming | AAO 0004-0005 |
| M3 | Drift guards and runner budget | AAO 0006-0007 |
| M4 | Baseline roadmap closure | AAO 0008 |
| M5 | Real feedback repair line | AAO 0009-0013 |
| M6 | State-aware playbook and evidence speed | AAO 0014-0017 |
| M7 | Score instrumentation and attestation | AAO 0018-0022 |
| M8 | Inspectability commands and map schema | AAO 0023-0027 |
| M9 | Integration docs, deprecation, hygiene, artifact policy | AAO 0028-0032 |
| M10 | Final dogfood and sync | AAO 0033 |
| M11 | Selector-first routing and command-surface consolidation | AAO 0034-0035 |
| M12 | Acceptance test plan and premises closure | AAO 0036 |
| M13 | Checkpoint / import / audit / sandbox repair | AAO 0037-0040 |
| M14 | Batch interruption and planning-root controls | AAO 0041-0044 |
| M15 | Throughput acceleration and safe parallelism | AAO 0045 |
| M16 | Validator noise and throughput unblockers | AAO 0046-0047, 0050-0055 |
| M17 | Atom health test extensibility | AAO 0048-0049 |

## Task Roster

| Task | Title | Milestone | Status | Dependencies | Deliverables |
|---|---|---|---|---|---|
| `TASK-AAO-0000` | AAO 文件區初始化與 ASA bridge index | M0 | done | none | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/README.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md` |
| `TASK-AAO-0001` | Overlap matrix 與路由裁決 | M1 | done | `TASK-AAO-0000` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md` |
| `TASK-AAO-0002` | CLI command spec / runner SSOT drift guard | M1 | planned | `TASK-AAO-0001` | `packages/cli/src/commands/command-specs.ts`<br>`scripts/validate-cli.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0003` | next decisionTrail JSON contract | M1 | planned | `TASK-AAO-0001`, `TASK-AAO-0002` | `packages/cli/src/commands/next.ts`<br>`scripts/validate-prompt-scoped-next.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0004` | Validator failure envelope 標準化 | M2 | planned | `TASK-AAO-0001` | `scripts/run-validators.ts`<br>`scripts/lib/validator-envelope.ts`<br>`packages/cli/src/commands/hook.ts` |
| `TASK-AAO-0005` | CLI context slimming wave 1 | M2 | planned | `TASK-AAO-0002`, `TASK-AAO-0003` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/next.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0006` | Docs / schema / command drift guard | M3 | done | `TASK-AAO-0002`, `TASK-AAO-0004` | `scripts/validate-docs-command-drift.ts`<br>`docs/governance/command-surface.md`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0007` | Onefile size / startup budget | M3 | done | `TASK-AAO-0001` | `scripts/validate-onefile-budget.ts`<br>`package.json`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0008` | AAO roadmap backwrite 與 ASA bridge closure | M4 | planned | `TASK-AAO-0005`, `TASK-AAO-0006`, `TASK-AAO-0007` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md` |
| `TASK-AAO-0009` | 匯入 Opus 4.7 feedback 與任務橋接 | M5 | planned | `TASK-AAO-0008` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md` |
| `TASK-AAO-0010` | 正式 tasks scope --add scope amendment CLI | M5 | done | `TASK-AAO-0009` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0011` | Claim/checkpoint 忽略 unrelated untracked | M5 | planned | `TASK-AAO-0009` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/batch.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0012` | Direction lock allowedFiles 單一真相來源 | M5 | done | `TASK-AAO-0010` | `packages/cli/src/commands/task-direction.ts`<br>`packages/cli/src/commands/hook.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0013` | Checkpoint partial-ok 訊息分層 | M5 | done | `TASK-AAO-0011`, `TASK-AAO-0012` | `packages/cli/src/commands/batch.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0014` | State-aware batch playbook | M6 | done | `TASK-AAO-0013` | `packages/cli/src/commands/next.ts`<br>`docs/governance/batch-playbook.md`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0015` | evidence validators --list | M6 | planned | `TASK-AAO-0014` | `packages/cli/src/commands/evidence.ts`<br>`packages/cli/src/commands/command-specs/evidence.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0016` | evidence run / --recent-run 快速入口 | M6 | planned | `TASK-AAO-0015` | `packages/cli/src/commands/evidence.ts`<br>`packages/cli/src/commands/command-specs/evidence.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0017` | Closure packet 缺 validator 的可操作修正 | M6 | planned | `TASK-AAO-0015` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/batch.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0018` | Neutrality scanner staged-only mode | M7 | planned | `TASK-AAO-0009` | `scripts/validate-neutrality-staged.ts`<br>`package.json`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0019` | Completion attestation schema | M7 | planned | `TASK-AAO-0017` | `schemas/completion-attestation.schema.json`<br>`scripts/validate-task-ledger-governance.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0020` | Public command coverage scorer 修正 | M7 | done | `TASK-AAO-0002` | `scripts/src/atomize-score.js`<br>`atomic_workbench/atomization-coverage/dogfood-score.json`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0021` | Readable ref scorer 整合 | M7 | done | `TASK-AAO-0020` | `scripts/src/atomize-score.js`<br>`atomic_workbench/atomization-coverage/dogfood-score.json`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0022` | Rollback-proof evidence | M7 | planned | `TASK-AAO-0016` | `schemas/rollback-proof.schema.json`<br>`scripts/validate-rollback-proof.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0023` | Map spec schema validator | M8 | planned | `TASK-AAO-0006` | `schemas/atom-map.schema.json`<br>`scripts/validate-map-spec-schema.ts`<br>`package.json` |
| `TASK-AAO-0024` | batch status 增強 | M8 | done | `TASK-AAO-0014` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/command-specs/batch.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0025` | tasks show --planning-doc | M8 | planned | `TASK-AAO-0010` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0026` | atm status 綜覽 | M8 | planned | `TASK-AAO-0024`, `TASK-AAO-0025` | `packages/cli/src/commands/status.ts`<br>`packages/cli/src/commands/command-specs/status.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0027` | dev runner 提示 | M8 | planned | `TASK-AAO-0026` | `README.md`<br>`AGENTS.md`<br>`packages/cli/src/commands/next.ts` |
| `TASK-AAO-0028` | batch playbook 文件化 | M9 | planned | `TASK-AAO-0014` | `docs/governance/batch-playbook.md`<br>`templates/agent-pack/**`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0029` | Low-level task lifecycle deprecation | M9 | planned | `TASK-AAO-0014`, `TASK-AAO-0028` | `docs/DEPRECATIONS.md`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0030` | CRLF policy | M9 | planned | `TASK-AAO-0009` | `.gitattributes`<br>`docs/governance/line-ending-policy.md`<br>`scripts/validate-line-endings.ts` |
| `TASK-AAO-0031` | Background work pause advisory | M9 | planned | `TASK-AAO-0024` | `packages/cli/src/commands/status.ts`<br>`packages/cli/src/commands/handoff.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0032` | Artifact commit policy 收斂 | M9 | planned | `TASK-AAO-0019` | `docs/governance/artifact-commit-policy.md`<br>`packages/cli/src/commands/hook.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0033` | Final dogfood rerun 與雙 repo sync | M10 | planned | `TASK-AAO-0020`, `TASK-AAO-0021`, `TASK-AAO-0022`, `TASK-AAO-0023`, `TASK-AAO-0028`, `TASK-AAO-0032` | `atomic_workbench/reports/aao-final-dogfood-report.json`<br>`docs/ai_atomic_framework/atm-agent-first-operability/AAO_FINAL_REPORT.md`<br>`release/**` |
| `TASK-AAO-0034` | next explicit selector 與 routing memory | M11 | done | `TASK-AAO-0001`, `TASK-AAO-0003`, `TASK-AAO-0024`, `TASK-AAO-0026` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/task-intent.ts`<br>`packages/cli/src/commands/command-specs/next.spec.ts` |
| `TASK-AAO-0035` | Command surface consolidation 與 help examples | M11 | planned | `TASK-AAO-0002`, `TASK-AAO-0014`, `TASK-AAO-0029`, `TASK-AAO-0034` | `packages/cli/src/commands/command-specs/**`<br>`packages/cli/src/commands/help.ts`<br>`README.md` |
| `TASK-AAO-0036` | AAO acceptance test plan 與前提固化 | M12 | planned | `TASK-AAO-0033`, `TASK-AAO-0034`, `TASK-AAO-0035` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md` |

## New Task Card Contract

Every AAO card must include:

- `scopePaths`: files the agent may change.
- `deliverables`: real non-`.atm/**` outputs.
- `validators`: commands that prove the work.
- `evidence.required: command-backed`.
- `rollback`: how to undo the work.
- `atomizationImpact`: owner atom/map and map updates.

Old fields have been retired:

| Old field | New field |
|---|---|
| `allowed_files` | `scopePaths` |
| `blocked_by` | `depends_on` |
| `upstream_repo` | `target_repo` |
| `forbidden_files` | `outOfScope` |
| `non_goals` | `nonGoals` |

## Validation

Planning validation:

```shell
node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json
git diff --check
```

Implementation validation is task-specific and listed in each task card.

The grouped acceptance test plan above is the release-level acceptance surface for AAO. TASK-AAO-0036 owns keeping that surface explicit as the plan evolves.

## Non-Goals

- Do not move AAO planning truth into `AI-Atomic-Framework/.atm/**`.
- Do not change ATM source as part of this planning rewrite.
- Do not commit unrelated 3KLife dirty files.
- Do not use planning mirror paths as target work unless a task explicitly allows it.

## M13 Checkpoint / Import / Audit / Environment Repair Line

This follow-up line was opened after the AAO practical feedback run exposed four workflow blockers that are still too easy for agents to trip over.

| Task | Theme | Why it exists |
|---|---|---|
| `TASK-AAO-0037` | Batch checkpoint commit window | Checkpoint can advance the queue before the previous task has been committed, causing the next lock to misjudge the previous task commit. |
| `TASK-AAO-0038` | Task import contract fidelity | Markdown task cards contain the real `scopePaths`, `target_repo`, and closure authority, but import can reduce that contract too much. |
| `TASK-AAO-0039` | Planning-only ledger audit boundary | Planning tasks owned by 3KLife should not become target-repo audit blockers in AI-Atomic-Framework. |
| `TASK-AAO-0040` | Sandbox git process diagnostics | Codex-style sandbox `git` EPERM failures must be reported as environment issues with retry guidance, not confused with ATM gate failures. |

M13 is intentionally narrow. It does not redesign ATM; it patches the handoff points that made real agents slow or confused: checkpoint-to-commit, task import fidelity, planning/target authority, and sandbox diagnostics.

## M14 Batch Interruption / Planning Root / Resume Controls

This line folds the latest practical feedback into the AAO plan without redesigning ATM. The rule is simple: if the problem is a missing acceptance criterion, strengthen the existing task; if the problem is a new user-visible command or state, open a small focused task.

### Existing Task Reinforcements

| Feedback | Task | Reinforcement |
|---|---|---|
| next is not smart enough / routing must be user-overridable | `TASK-AAO-0034` | Selector-first routing, plan-name/range/family matching, routing memory, and no unrelated fallback. |
| Scope amendment discovered too late | `TASK-AAO-0010` | Pre-write `ATM_SCOPE_AMENDMENT_SUGGESTED` plus atomic multi-path `tasks scope --add`. |
| Initial lock misses declared deliverables | `TASK-AAO-0012` early fix, `TASK-AAO-0038` fidelity finish | `TASK-AAO-0012` makes claim-time allowedFiles include task-card deliverables; `0038` later preserves the full import contract. |
| Low-level lifecycle can create bad locks | `TASK-AAO-0029` | AI-facing low-level lifecycle is blocked or requires explicit maintainer override; no incomplete locks by default. |
| Expected failing gates need evidence | `TASK-AAO-0016` | Diagnostic / expected-failure evidence is separate from validation passes. |
| Playbook only handles batch | `TASK-AAO-0014` | Playbook covers batch, single-task, and explicit task-list modes. |
| Completion attestation is not closed-loop | `TASK-AAO-0019` | Scanner validates attestation schema and closure-packet hashes. |
| Background pause is only prose | `TASK-AAO-0031` | Add active-session state and `atm status --background-safe`. |
| Artifact policy is abstract | `TASK-AAO-0032` | Add a decision table and hook diagnostics tied to table rows. |
| Dev runner warning is too weak | `TASK-AAO-0027` | Add runtime warning when frozen runner is older than source. |
| Lock edits can hide in ignored runtime files | `TASK-AAO-0012` | Detect lock mtime changes without matching ATM CLI events. |
| Evidence gaps are discovered too late | `TASK-AAO-0017` | Add pre-close `evidence missing --task` diagnostics. |

### New Focused Tasks

| Task | Theme | Why it exists |
|---|---|---|
| `TASK-AAO-0041` | `batch checkpoint --hold` | Close the current task without immediately claiming the next one, preserving a clean commit window. |
| `TASK-AAO-0042` | `batch repair / continue` | Recover interrupted batches with one diagnostic command instead of manual runtime edits. |
| `TASK-AAO-0043` | Planning repo root resolver | Stop baking fragile `../3KLife/...` paths into locks and routing records. |
| `TASK-AAO-0044` | `batch skip / resume` | Temporarily skip externally blocked tasks without pretending they are done. |

M14 keeps the AAO bias toward small patches. It does not introduce a second task model and does not weaken gates; it makes the legal path easier to find.
<!-- AAO-feedback-latest-abandon-eperm -->
### Latest Practical Feedback: Abandon/Queue Reuse and Sandbox Validator Diagnostics

Two additional findings are folded into existing cards instead of opening new cards:

- `TASK-AAO-0042` now explicitly owns the stale queue problem: after `batch abandon`, `next --claim` must not revive the abandoned batch/queue. Repair should replace the current manual cleanup chain.
- `TASK-AAO-0040` now explicitly owns `validate:cli` sandbox git temp-workspace EPERM diagnostics. The fix is better classification and a concrete rerun path, not treating the task as failed.

This avoids another re-batch caused by adding more task ids while still preserving the feedback in the AAO source of truth.
<!-- /AAO-feedback-latest-abandon-eperm -->

<!-- AAO-feedback-throughput-acceleration -->
## M15 Throughput Acceleration / Safe Parallelism

The latest AAO run confirmed that batch mode currently saves lifecycle bookkeeping, not the whole cost of understanding, validating, evidence capture, checkpoint, and commit. This line makes both Normal and Batch faster first, then adds optional subagent planning only where it is safe.

| Priority | Owner task | Improvement |
|---|---|---|
| 1 | `TASK-AAO-0024` | `batch current --compact` and `batch status --compact` return only the queue head, allowed files, validators, checkpoint debt, and next command. |
| 2 | `TASK-AAO-0034` | `next --claim` is idempotent for an active batch head and cannot claim the next task before checkpoint. |
| 3 | `TASK-AAO-0016` | Validator cache and evidence auto-capture remove repeated hash/manual evidence work. |
| 4 | `TASK-AAO-0015` | Validators are tiered as focused, batch, milestone, or release gates. |
| 5 | `TASK-AAO-0040` | Sandbox EPERM diagnostics provide the repair command on first failure. |
| 6 | `TASK-AAO-0045` | Optional subagent/parallel execution is allowed only for non-overlap tasks after the earlier speed fixes land. |

This sequence keeps ATM safe: the fast path is better state and evidence automation, not weaker gates.
<!-- /AAO-feedback-throughput-acceleration -->

## P0 Early Unblockers For AAO Batch Throughput

These tasks are promoted ahead of their original milestones because they directly unblock current AAO batch execution:

| Task | Why it is early P0 |
|---|---|
| `TASK-AAO-0037` | Prevents `batch checkpoint` from advancing the queue and then letting the next direction lock block the previous task commit. |
| `TASK-AAO-0027` | Prevents `atm.dev.mjs` source validation and frozen `atm.mjs` hook behavior from disagreeing silently; stale runner must become `ATM_RUNNER_SYNC_REQUIRED`, not a `--no-verify` path. |
| `TASK-AAO-0034` | Keeps `next --intent` and explicit selectors scoped to the requested AAO family/batch instead of falling back to unrelated tasks or prematurely claiming the next task. |
| `TASK-AAO-0040` | Turns sandbox/git EPERM into actionable environment diagnostics so agents do not waste a full validator cycle before rerunning elevated. |
| `TASK-AAO-0046` | Carries the post-0004 follow-up for separating baseline validator noise from current-task failures. |
| `TASK-AAO-0050` | Classifies stale framework-mode locks from completed tasks and returns the safe release-then-fresh-claim command instead of asking agents to guess. |
| `TASK-AAO-0051` | Gives mirror-sync-only ledger imports a formal ATM commit wrapper path so agents do not need `git commit --no-verify` after a valid mirror sync. |
| `TASK-AAO-0052` | Makes validator fixture task ids obviously TEST-TASK-* so they do not read like real task cards. |
| `TASK-AAO-0053` | 讓 `batch checkpoint` 支援 framework critical delivery window 流程，避免 batch queue-head 的 framework-critical 任務因互相矛盾的規則而卡住。 |
| `TASK-AAO-0054` | 優化非任務協作流與 pre-push 的平行協作隔離，防止 feature 分支推送被 hooks 誤攔截，並避免自然語言誤判路徑提示。 |
| `TASK-AAO-0055` | 解決 done task 缺失實質憑證時的 claim/close 互鎖死路，提供直覺的 tasks reconcile / reopen 官方協調入口。 |
| `TASK-AAO-0056` | 一鍵式 deliver-and-close macro 機制，整合交付、憑證生成、歷史關閉與 commit 歷源。 |
| `TASK-AAO-0057` | close/checkpoint 實施 scoped diff 隔離，避免無關髒變更或 untracked 臨時檔阻擋任務收尾。 |
| `TASK-AAO-0058` | 任務 claim 時自動將自身的 .atm/history/tasks/<id>.json、evidence 與 task-events 納入 allowedFiles。 |

Implementation guidance: complete these before continuing deeper AAO feature work unless the current batch has already safely passed the corresponding friction point.


## M16 Validator Baseline Noise Follow-up

| Task | Title | Milestone | Status | Depends | Target surface |
|---|---|---|---|---|---|
| `TASK-AAO-0046` | Validator baseline noise diagnostics | M16 | done | `TASK-AAO-0004`, `TASK-AAO-0015`, `TASK-AAO-0017` | `scripts/run-validators.ts`<br>`scripts/lib/validator-envelope.ts`<br>`packages/cli/src/commands/hook.ts` |
| `TASK-AAO-0050` | Framework stale lock cleanup guidance | M16 | done | `TASK-AAO-0040` | `packages/cli/src/commands/framework-development.ts`<br>`packages/cli/src/commands/hook.ts`<br>`packages/cli/src/commands/guard.ts` |
| `TASK-AAO-0051` | Mirror-sync commit wrapper support | M16 | done | `TASK-AAO-0038` | `packages/cli/src/commands/git-governance.ts`<br>`packages/cli/src/commands/hook.ts`<br>`packages/cli/src/commands/command-specs/git.spec.ts` |
| `TASK-AAO-0052` | Validator fixture task id clarity | M16 | planned | `TASK-AAO-0046` | `scripts/validate-task-ledger-governance.ts`<br>`scripts/validate-cli.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0053` | batch checkpoint 支援 framework critical delivery window | M16 | planned | `TASK-AAO-0037`, `TASK-AAO-0038`, `TASK-AAO-0047` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/hook.ts`<br>`packages/cli/src/commands/command-specs/batch.spec.ts` |
| `TASK-AAO-0054` | 非任務協作流與 git hook pre-push 隔離優化 | M16 | done | `TASK-AAO-0040`, `TASK-AAO-0046` | `packages/cli/src/commands/hook.ts`<br>`packages/cli/src/commands/next.ts`<br>`scripts/validate-git-hooks-enforcement.ts`<br>`scripts/validate-prompt-scoped-next.ts` |
| `TASK-AAO-0055` | Historical done task reconcile / reopen closure sync | M16 | planned | `TASK-AAO-0038`, `TASK-AAO-0051`, `TASK-AAO-0054` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`scripts/validate-task-ledger-governance.ts` |
| `TASK-AAO-0056` | Framework task deliver-and-close macro | M16 | planned | `TASK-AAO-0051`, `TASK-AAO-0053`, `TASK-AAO-0055` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/batch.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0057` | Close gate scoped diff isolation | M16 | planned | `TASK-AAO-0006`, `TASK-AAO-0051` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/batch.ts`<br>`scripts/validate-task-ledger-governance.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0058` | Task ledger/evidence/events self-allow on claim | M16 | planned | `TASK-AAO-0012`, `TASK-AAO-0051` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/task-direction.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |


## M16 P0 Throughput Acceleration Bundle

| Task | Title | Milestone | Status | Depends | Target surface |
|---|---|---|---|---|---|
| `TASK-AAO-0047` | P0 throughput acceleration bundle | M16 | done | `TASK-AAO-0024`, `TASK-AAO-0027`, `TASK-AAO-0034`, `TASK-AAO-0037`, `TASK-AAO-0040`, `TASK-AAO-0046` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/hook.ts`<br>`scripts/run-validators.ts` |


## M17 Atom Health Test Extensibility

M17 turns atom health testing into a first-class ATM extension point.

ATM already has important validation pieces: schema checks, delegated validation commands, map equivalence, edge contract entry points, evidence reports, and CI-friendly validators. The missing product layer is a clean way for adopter repositories to plug in their own atom tests and a default vocabulary for the most common health checks.

| Task | Title | Milestone | Status | Depends | Target surface |
|---|---|---|---|---|---|
| `TASK-AAO-0048` | TestRunnerPlugin interface for atom health | M17 | planned | `TASK-AAO-0015`, `TASK-AAO-0016`, `TASK-AAO-0023`, `TASK-AAO-0035`, `TASK-AAO-0047` | `packages/plugin-sdk/src/index.ts`<br>`packages/plugin-sdk/src/test-runner.ts`<br>`packages/core/src/manager/test-runner.ts`<br>`packages/cli/src/commands/test.ts` |
| `TASK-AAO-0049` | Default atom health test gates | M17 | planned | `TASK-AAO-0048`, `TASK-AAO-0015`, `TASK-AAO-0016`, `TASK-AAO-0023` | `packages/core/src/manager/test-runner.ts`<br>`packages/core/src/test-runner/**`<br>`schemas/test-report.schema.json`<br>`docs/ADAPTER_GUIDE.md` |

The key product promise is precise: ATM does not magically prove all business logic correct. It makes atom health checks explicit, repeatable, extensible, and hard to skip when AI edits code.
