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

These cards are preserved, but rewritten into the new contract format. AAO-0000 remains `done`; AAO-0001 through AAO-0008 are reopened as `planned` so they can be re-run consistently.

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

## Task Roster

| Task | Title | Milestone | Status | Dependencies | Deliverables |
|---|---|---|---|---|---|
| `TASK-AAO-0000` | AAO 文件區初始化與 ASA bridge index | M0 | done | none | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/README.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md` |
| `TASK-AAO-0001` | Overlap matrix 與路由裁決 | M1 | planned | `TASK-AAO-0000` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md` |
| `TASK-AAO-0002` | CLI command spec / runner SSOT drift guard | M1 | planned | `TASK-AAO-0001` | `packages/cli/src/commands/command-specs.ts`<br>`scripts/validate-cli.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0003` | next decisionTrail JSON contract | M1 | planned | `TASK-AAO-0001`, `TASK-AAO-0002` | `packages/cli/src/commands/next.ts`<br>`scripts/validate-prompt-scoped-next.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0004` | Validator failure envelope 標準化 | M2 | planned | `TASK-AAO-0001` | `scripts/run-validators.ts`<br>`scripts/lib/validator-envelope.ts`<br>`packages/cli/src/commands/hook.ts` |
| `TASK-AAO-0005` | CLI context slimming wave 1 | M2 | planned | `TASK-AAO-0002`, `TASK-AAO-0003` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/next.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0006` | Docs / schema / command drift guard | M3 | planned | `TASK-AAO-0002`, `TASK-AAO-0004` | `scripts/validate-docs-command-drift.ts`<br>`docs/governance/command-surface.md`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0007` | Onefile size / startup budget | M3 | planned | `TASK-AAO-0001` | `scripts/validate-onefile-budget.ts`<br>`package.json`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0008` | AAO roadmap backwrite 與 ASA bridge closure | M4 | planned | `TASK-AAO-0005`, `TASK-AAO-0006`, `TASK-AAO-0007` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md` |
| `TASK-AAO-0009` | 匯入 Opus 4.7 feedback 與任務橋接 | M5 | planned | `TASK-AAO-0008` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md` |
| `TASK-AAO-0010` | 正式 tasks scope --add scope amendment CLI | M5 | planned | `TASK-AAO-0009` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0011` | Claim/checkpoint 忽略 unrelated untracked | M5 | planned | `TASK-AAO-0009` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/batch.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0012` | Direction lock allowedFiles 單一真相來源 | M5 | planned | `TASK-AAO-0010` | `packages/cli/src/commands/task-direction.ts`<br>`packages/cli/src/commands/hook.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0013` | Checkpoint partial-ok 訊息分層 | M5 | planned | `TASK-AAO-0011`, `TASK-AAO-0012` | `packages/cli/src/commands/batch.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0014` | State-aware batch playbook | M6 | planned | `TASK-AAO-0013` | `packages/cli/src/commands/next.ts`<br>`docs/governance/batch-playbook.md`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0015` | evidence validators --list | M6 | planned | `TASK-AAO-0014` | `packages/cli/src/commands/evidence.ts`<br>`packages/cli/src/commands/command-specs/evidence.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0016` | evidence run / --recent-run 快速入口 | M6 | planned | `TASK-AAO-0015` | `packages/cli/src/commands/evidence.ts`<br>`packages/cli/src/commands/command-specs/evidence.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0017` | Closure packet 缺 validator 的可操作修正 | M6 | planned | `TASK-AAO-0015` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/batch.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0018` | Neutrality scanner staged-only mode | M7 | planned | `TASK-AAO-0009` | `scripts/validate-neutrality-staged.ts`<br>`package.json`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0019` | Completion attestation schema | M7 | planned | `TASK-AAO-0017` | `schemas/completion-attestation.schema.json`<br>`scripts/validate-task-ledger-governance.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0020` | Public command coverage scorer 修正 | M7 | planned | `TASK-AAO-0002` | `scripts/src/atomize-score.js`<br>`atomic_workbench/atomization-coverage/dogfood-score.json`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0021` | Readable ref scorer 整合 | M7 | planned | `TASK-AAO-0020` | `scripts/src/atomize-score.js`<br>`atomic_workbench/atomization-coverage/dogfood-score.json`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0022` | Rollback-proof evidence | M7 | planned | `TASK-AAO-0016` | `schemas/rollback-proof.schema.json`<br>`scripts/validate-rollback-proof.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0023` | Map spec schema validator | M8 | planned | `TASK-AAO-0006` | `schemas/atom-map.schema.json`<br>`scripts/validate-map-spec-schema.ts`<br>`package.json` |
| `TASK-AAO-0024` | batch status 增強 | M8 | planned | `TASK-AAO-0014` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/command-specs/batch.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0025` | tasks show --planning-doc | M8 | planned | `TASK-AAO-0010` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0026` | atm status 綜覽 | M8 | planned | `TASK-AAO-0024`, `TASK-AAO-0025` | `packages/cli/src/commands/status.ts`<br>`packages/cli/src/commands/command-specs/status.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0027` | dev runner 提示 | M8 | planned | `TASK-AAO-0026` | `README.md`<br>`AGENTS.md`<br>`packages/cli/src/commands/next.ts` |
| `TASK-AAO-0028` | batch playbook 文件化 | M9 | planned | `TASK-AAO-0014` | `docs/governance/batch-playbook.md`<br>`templates/agent-pack/**`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0029` | Low-level task lifecycle deprecation | M9 | planned | `TASK-AAO-0014`, `TASK-AAO-0028` | `docs/DEPRECATIONS.md`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0030` | CRLF policy | M9 | planned | `TASK-AAO-0009` | `.gitattributes`<br>`docs/governance/line-ending-policy.md`<br>`scripts/validate-line-endings.ts` |
| `TASK-AAO-0031` | Background work pause advisory | M9 | planned | `TASK-AAO-0024` | `packages/cli/src/commands/status.ts`<br>`packages/cli/src/commands/handoff.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0032` | Artifact commit policy 收斂 | M9 | planned | `TASK-AAO-0019` | `docs/governance/artifact-commit-policy.md`<br>`packages/cli/src/commands/hook.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` |
| `TASK-AAO-0033` | Final dogfood rerun 與雙 repo sync | M10 | planned | `TASK-AAO-0020`, `TASK-AAO-0021`, `TASK-AAO-0022`, `TASK-AAO-0023`, `TASK-AAO-0028`, `TASK-AAO-0032` | `atomic_workbench/reports/aao-final-dogfood-report.json`<br>`docs/ai_atomic_framework/atm-agent-first-operability/AAO_FINAL_REPORT.md`<br>`release/**` |
| `TASK-AAO-0034` | next explicit selector 與 routing memory | M11 | planned | `TASK-AAO-0001`, `TASK-AAO-0003`, `TASK-AAO-0024`, `TASK-AAO-0026` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/task-intent.ts`<br>`packages/cli/src/commands/command-specs/next.spec.ts` |
| `TASK-AAO-0035` | Command surface consolidation 與 help examples | M11 | planned | `TASK-AAO-0002`, `TASK-AAO-0014`, `TASK-AAO-0029`, `TASK-AAO-0034` | `packages/cli/src/commands/command-specs/**`<br>`packages/cli/src/commands/help.ts`<br>`README.md` |

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

## Non-Goals

- Do not move AAO planning truth into `AI-Atomic-Framework/.atm/**`.
- Do not change ATM source as part of this planning rewrite.
- Do not commit unrelated 3KLife dirty files.
- Do not use planning mirror paths as target work unless a task explicitly allows it.
