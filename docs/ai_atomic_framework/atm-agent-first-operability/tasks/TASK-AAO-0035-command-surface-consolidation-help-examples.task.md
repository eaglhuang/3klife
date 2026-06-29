---
doc_id: doc_other_aao_0035
task_id: TASK-AAO-0035
title: "Command surface consolidation 與 help examples"
status: done
owner: atm-core
priority: P0
milestone: M11
depends_on:
  - "TASK-AAO-0002"
  - "TASK-AAO-0014"
  - "TASK-AAO-0029"
  - "TASK-AAO-0034"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/command-specs/**"
  - "packages/cli/src/commands/command-specs.ts"
  - "packages/cli/src/commands/help.ts"
  - "packages/cli/src/commands/next.ts"
  - "README.md"
  - "docs/DEPRECATIONS.md"
  - "docs/governance/command-surface.md"
  - "templates/**"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/command-specs/**"
  - "packages/cli/src/commands/help.ts"
  - "README.md"
  - "docs/governance/command-surface.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.cli-command-spec-map"
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
completed_at: "2026-06-29T11:10:30.324Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-06-29T11:10:30.324Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-06-29T11-10-30-324Z-close-4bfe66636813"
lastTransitionAt: "2026-06-29T11:10:30.324Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1a2d170709a56760bf1b7da6a7e5238ae45d23c7"
---
# TASK-AAO-0035 — Command surface consolidation 與 help examples

## Goal

收斂 ATM 指令入口，讓 AI 優先看到少量主入口與完整 help/examples，降低指令發散造成的操作漂移。

## Why

ATM 指令太多會讓 AI 亂掉。命令可以保留給 maintainer，但 agent-facing 入口要集中：next、batch checkpoint、evidence、status、tasks show/scope 等少數主線。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `packages/cli/src/commands/command-specs/**`
- `packages/cli/src/commands/help.ts`
- `README.md`
- `docs/governance/command-surface.md`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`

## Acceptance Criteria

- help spec 必須完整列 usage、required flags、examples、common mistakes、related command。
- agent-facing help 要優先展示短路徑 playbook，不把 low-level lifecycle 當主流程。
- 低階命令標為 maintainer/internal/deprecated guidance，但不破壞既有相容性。
- `node atm.mjs <command> --help` 對主要命令都能回可操作範例。
- command surface 文件與 command-specs 由 validator 防 drift。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.cli-command-spec-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

這張卡處理的是易用性與認知負擔，不是放寬治理。硬 gate 留著，但入口要少、help 要清楚。
