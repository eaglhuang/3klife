---
doc_id: doc_other_aao_0021
task_id: TASK-AAO-0021
title: "Readable ref scorer 整合"
status: planned
owner: atm-core
priority: P0
milestone: M7
depends_on:
  - "TASK-AAO-0020"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/src/atomize-score.js"
  - "scripts/validate-atom-callsite-readability.ts"
  - "atomic_workbench/atomization-coverage/dogfood-score.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/src/atomize-score.js"
  - "atomic_workbench/atomization-coverage/dogfood-score.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:atom-callsite-readability"
  - "npm run validate:atomization-coverage"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.atomization-score-map"
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
# TASK-AAO-0021 — Readable ref scorer 整合

## Goal

讓 dogfood scorer 計入 atom-callsite-readability 的 semantic refs。

## Why

ASA-0013 已有 readability validator，但 scorer 沒吃到，導致 runAtm_with_readable_ref 永遠 0。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `scripts/src/atomize-score.js`
- `atomic_workbench/atomization-coverage/dogfood-score.json`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:atom-callsite-readability`
- `npm run validate:atomization-coverage`

## Acceptance Criteria

- scorer 能讀 readability validator/report。
- runAtm_with_readable_ref 指標不再固定為 0。
- 報告列出未被計入的 callsite 原因。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.atomization-score-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
