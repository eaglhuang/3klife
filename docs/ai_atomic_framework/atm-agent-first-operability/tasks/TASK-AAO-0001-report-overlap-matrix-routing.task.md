---
doc_id: doc_other_1319
task_id: TASK-AAO-0001
title: "Overlap matrix 與路由裁決"
status: done
owner: atm-core
priority: P0
milestone: M1
depends_on:
  - "TASK-AAO-0000"
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
# TASK-AAO-0001 — Overlap matrix 與路由裁決

## Goal

重建 AAO 與 ASA/ATD/既有缺口的重疊矩陣，避免 agent 被 unrelated task route 誤導。

## Why

AAO 的第一個痛點是任務範圍不清，導致 next fallback 到 unrelated queue。這張卡要把裁決表寫清楚。

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

- 計畫書含 AAO/ASA/ATD overlap matrix。
- 每條路由都有保留、拆分或轉交判定。
- import dry-run 仍能找到 AAO 任務。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.planning-bridge-map`
- Map updates:
- `docs/ai_atomic_framework/atm-agent-first-operability/**`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
- Closure sync: ATM framework ledger already closed this task in commit `ce1e9cd` with closure packet `.atm/history/evidence/TASK-AAO-0001.closure-packet.json`; this card records the planning-side status alignment only.
