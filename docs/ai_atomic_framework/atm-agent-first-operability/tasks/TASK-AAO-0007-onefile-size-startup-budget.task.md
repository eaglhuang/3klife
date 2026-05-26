---
doc_id: doc_other_1325
task_id: TASK-AAO-0007
title: "Onefile size / startup budget"
status: planned
owner: atm-core
priority: P1
milestone: M3
depends_on:
  - "TASK-AAO-0001"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/build-onefile-release.ts"
  - "scripts/validate-onefile-budget.ts"
  - "release/atm-onefile/**"
  - "package.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-onefile-budget.ts"
  - "package.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run build"
  - "node --strip-types scripts/validate-onefile-budget.ts"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.release-runner-map"
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
# TASK-AAO-0007 — Onefile size / startup budget

## Goal

替 release onefile 建立大小與啟動時間 budget，避免穩定 runner 越來越慢。

## Why

AI 實作慢的一部分來自每次冷啟都跑重 runner。這張卡先把 onefile 的大小和啟動成本量化。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `scripts/validate-onefile-budget.ts`
- `package.json`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run build`
- `node --strip-types scripts/validate-onefile-budget.ts`
- `npm run validate:cli`

## Acceptance Criteria

- validator 會輸出 size/startup budget。
- 超過 budget 時提供明確 remediation。
- release runner 與 dev runner 用途界線仍清楚。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.release-runner-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
