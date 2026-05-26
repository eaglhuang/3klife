---
doc_id: doc_other_aao_0027
task_id: TASK-AAO-0027
title: "dev runner 提示"
status: planned
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "Prevents source/frozen runner mismatch from forcing --no-verify commits during ATM self-development."
milestone: M8
depends_on:
  - "TASK-AAO-0026"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "atm.mjs"
  - "atm.dev.mjs"
  - "README.md"
  - "AGENTS.md"
  - "packages/cli/src/commands/next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "README.md"
  - "AGENTS.md"
  - "packages/cli/src/commands/next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.runner-entrypoint-map"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "新增 script / CLI / validator 時，同卡必須更新 atomization ownership map，不把 ownership 留給後續卡。"
outOfScope:
  - "手改 .atm/runtime/**"
  - "把 .atm/history/** 當作功能交付物"
  - "修改 unrelated 3KLife dirty files"
nonGoals:
  - "不在本卡完成整個 AAO 計畫"
  - "不建立第二套 task lifecycle"
  - "不繞過 ATM evidence gate"
---
# TASK-AAO-0027 — dev runner 提示

## Goal

讓 framework repo 中 source-first 與 frozen runner 的差異更不容易踩坑。

## Why

Claude Code 在 framework repo 跑到未 build source，導致吃到半成品。入口需要更硬的 frozen/dev 分流提示。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `README.md`
- `AGENTS.md`
- `packages/cli/src/commands/next.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-prompt-scoped-next.ts`

## Acceptance Criteria

- framework repo next 輸出 runner mode。
- dev runner 只在 explicit source validation 時建議。
- agent integration docs 同步。


<!-- AAO-feedback-0027-runtime-warning -->
## Feedback Reinforcement Acceptance

- Runtime-level warning is required: when `node atm.mjs` is older than files under `packages/cli/src/**`, print a clear warning that the frozen runner may not include source changes.
- The warning must suggest either `npm run build` for release-runner validation or `node atm.dev.mjs` for explicit source-first framework validation.
- Documentation-only reminders are not sufficient acceptance for this task.
<!-- /AAO-feedback-0027-runtime-warning -->


<!-- AAO-early-unblocker-0027-source-frozen-consistency -->
## Early Unblocker Reinforcement

- Source-first validation and frozen-runner validation must produce compatible hook/gate decisions for the same staged files, or ATM must return a stable `ATM_RUNNER_SYNC_REQUIRED` diagnostic.
- If `atm.dev.mjs` or source hook passes but `node atm.mjs` frozen hook fails, ATM must not push the agent toward `--no-verify`; it must provide the required build/sync command and the files that prove the runner is stale.
- Runtime detection must compare source mtimes or source hash against `release/atm-onefile/atm.mjs` / pinned runner metadata and explain whether `npm run build`, `node atm.dev.mjs`, or internal release sync is the correct next action.
- Acceptance requires a regression where a source hook fix passes under `atm.dev.mjs`, frozen `atm.mjs` is stale, and the hook reports `ATM_RUNNER_SYNC_REQUIRED` instead of a generic pre-commit failure.
- After `npm run build`, `node atm.mjs` must use the refreshed onefile path and no longer disagree with source-first validation for the covered hook case.
<!-- /AAO-early-unblocker-0027-source-frozen-consistency -->

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.runner-entrypoint-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
