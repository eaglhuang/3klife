---
doc_id: doc_other_1326
task_id: TASK-AAO-0008
title: "AAO roadmap backwrite 與 ASA bridge closure"
status: planned
owner: atm-core
priority: P1
milestone: M4
depends_on:
  - "TASK-AAO-0005"
  - "TASK-AAO-0006"
  - "TASK-AAO-0007"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/README.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-*.task.md"
deliverables:
  - "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md"
validators:
  - "node atm.mjs tasks import --from \"C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md\" --dry-run --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.planning-bridge-map"
  mapUpdates:
  - "docs/ai_atomic_framework/atm-agent-first-operability/**"
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
# TASK-AAO-0008 — AAO roadmap backwrite 與 ASA bridge closure

## Goal

把 baseline AAO 0001-0007 結果回寫計畫書，並標明和 ASA 後續卡的承接關係。

## Why

AAO baseline 不是孤立計畫，必須把結果回到原計畫，避免下個 agent 找不到脈絡。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`
- `docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md`

## Validators

- `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`
- `git diff --check`

## Acceptance Criteria

- 計畫書標明 baseline AAO 完成/未完成狀態。
- ASA bridge 不再宣稱 score-gated gap 已完成。
- tasks README 對應最新任務清單。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.planning-bridge-map`
- Map updates:
- `docs/ai_atomic_framework/atm-agent-first-operability/**`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
