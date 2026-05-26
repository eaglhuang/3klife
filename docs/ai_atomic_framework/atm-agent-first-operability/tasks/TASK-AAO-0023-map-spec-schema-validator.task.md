---
doc_id: doc_other_aao_0023
task_id: TASK-AAO-0023
title: "Map spec schema validator"
status: done
owner: atm-core
priority: P0
milestone: M8
depends_on:
  - "TASK-AAO-0006"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "atomic_workbench/maps/**"
  - "schemas/**"
  - "scripts/validate-map-spec-schema.ts"
  - "package.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "schemas/atom-map.schema.json"
  - "scripts/validate-map-spec-schema.ts"
  - "package.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-map-spec-schema.ts"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.atom-map-spec-map"
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
# TASK-AAO-0023 — Map spec schema validator

## Goal

替 atomic_workbench maps 建立 schema validator，讓全框架原子化產物不再靠人工目測。

## Why

全框架原子化要求 map 本身也要有 schema gate，否則 map 會逐步變成不可驗證 JSON。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `schemas/atom-map.schema.json`
- `scripts/validate-map-spec-schema.ts`
- `package.json`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `node --strip-types scripts/validate-map-spec-schema.ts`
- `npm run validate:cli`

## Acceptance Criteria

- validator 能驗 atomic_workbench/maps/*.json。
- schema 覆蓋 members/edges/qualityTargets/entrypoints。
- package script 同卡更新。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.atom-map-spec-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
