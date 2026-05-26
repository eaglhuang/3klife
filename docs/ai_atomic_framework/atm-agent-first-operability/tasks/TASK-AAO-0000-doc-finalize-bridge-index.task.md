---
doc_id: doc_other_1327
task_id: TASK-AAO-0000
title: "AAO 文件區初始化與 ASA bridge index"
status: done
owner: atm-core
priority: P0
milestone: M0
depends_on:[]
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/README.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-*.task.md"
deliverables:
  - "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/README.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-*.task.md"
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
# TASK-AAO-0000 — AAO 文件區初始化與 ASA bridge index

## Goal

保留 AAO 文件區初始化成果，改用新格式描述，不重新執行既有 done 工作。

## Why

這張卡是 AAO 的歷史入口。它要保持 done，避免重跑舊初始化，但格式必須跟後續卡一致。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`
- `docs/ai_atomic_framework/atm-agent-first-operability/README.md`
- `docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md`
- `docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-*.task.md`

## Validators

- `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`
- `git diff --check`

## Acceptance Criteria

- TASK-AAO-0000 frontmatter 使用新欄位。
- status 保持 done。
- 不要求重新產生 upstream source diff。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.planning-bridge-map`
- Map updates:
- `docs/ai_atomic_framework/atm-agent-first-operability/**`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
