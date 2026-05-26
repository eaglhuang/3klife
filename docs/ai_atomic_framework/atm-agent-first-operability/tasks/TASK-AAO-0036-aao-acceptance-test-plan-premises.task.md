---
doc_id: doc_other_aao_0036
task_id: TASK-AAO-0036
title: "AAO acceptance test plan 與前提固化"
status: planned
owner: atm-core
priority: P0
milestone: M12
depends_on:
  - "TASK-AAO-0033"
  - "TASK-AAO-0034"
  - "TASK-AAO-0035"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md"
deliverables:
  - "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md"
validators:
  - "node atm.mjs tasks import --from \"C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md\" --dry-run --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾本卡的 planning docs commit；不需要改動 AI-Atomic-Framework source。"
atomizationImpact:
  ownerAtomOrMap: "atm.planning-bridge-map"
  mapUpdates: []
  notes: "本卡是 planning/doc 固化任務，不新增 framework script / CLI / validator；若後續把 acceptance plan 轉成 validator，必須在該實作卡更新 atomization ownership map。"
outOfScope:
  - "修改 AI-Atomic-Framework source"
  - "手改 .atm/runtime/**"
  - "把 planning docs mirror 到 target repo"
  - "提交 unrelated 3KLife dirty files"
nonGoals:
  - "不實作 AAO 0034/0035 的 source changes"
  - "不替代各任務卡自己的 validators"
  - "不關閉整個 AAO 計畫"
---
# TASK-AAO-0036 — AAO acceptance test plan 與前提固化

## Goal

把 AAO 的前提、驗收測試計畫、rollout/regression 方法集中固化回主計畫，避免後續 AI 只看到分散的 validators，卻不知道整條 AAO lane 的完成標準。

## Why

Opus 4.7 反饋與後續討論已經轉成多張任務卡，但「整體怎麼驗收」原本只分散在各卡的 validators、Scope Boundary、Non-Goals。這會讓後續 AI 誤以為只要關卡就算完成。0036 的目的就是把總驗收面寫清楚：先有前提，再有場景測試，再有 rollout/regression。

## Implementation Contract

- Planning context lives in `3KLife`; this card is explicitly a planning/doc card, so its deliverables are 3KLife planning paths.
- Do not modify `AI-Atomic-Framework` source in this card.
- Keep the plan readable by humans while preserving machine-readable task card fields.
- If later work turns this acceptance plan into executable validators, that work must be opened as a separate framework source task with atomization ownership updates.

## Deliverables

- `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`
- `docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md`
- `docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md`

## Validators

- `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`
- `git diff --check`

## Acceptance Criteria

- 主計畫包含 `Operating Premises`，明確寫出 selector-first、batchId、planning/target repo 分離、command surface、atomization ownership 等前提。
- 主計畫包含 grouped `Acceptance Test Plan`，覆蓋 planning import、selector routing、batch/checkpoint、scope amendment、evidence/closure、hook/commit、score/atomization、human UX。
- 主計畫包含 rollout/regression 與 execution priority，讓後續 AI 知道先修什麼、最後怎麼驗收。
- `tasks/README.md` 列出 `TASK-AAO-0036`。
- Import dry-run 能找到 0036，且不 fallback 到 unrelated task。

## Rollback

Revert the planning docs commit. Because this card does not modify framework source, rollback should not require build or release sync.

## Atomization Impact

- Owner atom/map: `atm.planning-bridge-map`
- Map updates: none for this planning-only card.
- If this plan later becomes executable validator code, that implementation task must update `atomic_workbench/atomization-coverage/path-to-atom-map.json` in the same card.

## Notes

0036 是「把驗收標準放到明面上」的卡，不是新增治理負擔。它的價值是讓下一個 AI 不需要從 36 張任務卡裡猜整體通關標準。
