---
doc_id: doc_other_aao_0034
task_id: TASK-AAO-0034
title: "next explicit selector 與 routing memory"
status: planned
owner: atm-core
priority: P0
milestone: M11
depends_on:
  - "TASK-AAO-0001"
  - "TASK-AAO-0003"
  - "TASK-AAO-0024"
  - "TASK-AAO-0026"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/task-intent.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/task-intent.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
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
  ownerAtomOrMap: "atm.next-router-map"
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
# TASK-AAO-0034 — next explicit selector 與 routing memory

## Goal

把 next 從會自作主張的全域搜尋器，收斂成 selector-first 的治理導航；使用者明確指定 task / tasks / plan / family / batch 時必須優先。

## Why

next 的推薦很好用，但不該成為性能瓶頸，也不該把 unrelated 半成品或別人的卡塞給當前使用者。使用者的明確 selector 應該高於 prompt 猜測。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/task-intent.ts`
- `packages/cli/src/commands/command-specs/next.spec.ts`
- `scripts/validate-prompt-scoped-next.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-prompt-scoped-next.ts`

## Acceptance Criteria

- 新增或強化 `next --task`, `next --tasks`, `next --plan`, `next --family`, `next --batch` selector。
- 沒有 explicit selector 時才使用 prompt resolver；低信心或 unrelated fallback 必須回 selection-required / scope-not-found。
- 只有 active claim/batch/staged scope conflict/dependency/evidence/protected state 這類硬治理理由可以阻止切任務。
- 新增可追蹤 routing feedback memory，例如 accepted/rejected family 或 prompt alias，不用黑盒模型學習。
- next 使用 task index/cache，避免每次大範圍掃 repo 成為性能瓶頸。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.next-router-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

ATM 可以推薦工作順序，但不能擁有工作順序。它是導航，不是替使用者硬派任務的排程器。
