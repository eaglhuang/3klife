---
doc_id: doc_other_aao_0033
task_id: TASK-AAO-0033
title: "Final dogfood rerun 與雙 repo sync"
status: planned
owner: atm-core
priority: P0
milestone: M10
depends_on:
  - "TASK-AAO-0020"
  - "TASK-AAO-0021"
  - "TASK-AAO-0022"
  - "TASK-AAO-0023"
  - "TASK-AAO-0028"
  - "TASK-AAO-0032"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validate-atm-self-atomization.ts"
  - "atomic_workbench/reports/**"
  - "docs/ai_atomic_framework/atm-agent-first-operability/**"
  - "release/**"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "atomic_workbench/reports/aao-final-dogfood-report.json"
  - "docs/ai_atomic_framework/atm-agent-first-operability/AAO_FINAL_REPORT.md"
  - "release/**"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:atm-self-atomization"
  - "node atm.mjs doctor --json"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.release-readiness-map"
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
# TASK-AAO-0033 — Final dogfood rerun 與雙 repo sync

## Goal

收尾重跑 dogfood gates，建立 AAO final report，並同步 ATM 新版到 3KLife 與 3klife-npc-brain。

## Why

AAO 的目的不是多開卡，而是讓下一次 AI 使用 ATM 更順。最後要用雙 repo 同步與 dogfood rerun 驗證。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `atomic_workbench/reports/aao-final-dogfood-report.json`
- `docs/ai_atomic_framework/atm-agent-first-operability/AAO_FINAL_REPORT.md`
- `release/**`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm run validate:atm-self-atomization`
- `node atm.mjs doctor --json`

## Acceptance Criteria

- AAO final report 記錄分數與剩餘 gaps。
- ATM frozen runner build 完成並同步雙 repo。
- 3KLife 與 3klife-npc-brain 的 integration verify 通過。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.release-readiness-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
