---
doc_id: doc_other_aao_0012
task_id: TASK-AAO-0012
title: "Direction lock allowedFiles 單一真相來源"
status: done
owner: atm-core
priority: P0
milestone: M5
depends_on:
  - "TASK-AAO-0010"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/hook.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/hook.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-direction-governance.ts --mode validate"
evidence:
  required: command-backed
  closedAt: "2026-05-27T10:41:10.763Z"
  closedByActor: "Augment"
  closureCommit: "f107b22a014902b4d7ef5d3b67e8173ee74a88f7"
  relatedCommits:
    - "ade527ba9e68c9ebf07da8761cf75836d6ea23fb"
    - "f107b22a014902b4d7ef5d3b67e8173ee74a88f7"
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.task-direction-map"
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
# TASK-AAO-0012 — Direction lock allowedFiles 單一真相來源

## Goal

移除 lock top-level files 與 embedded allowedFiles 的雙重真相，統一 scope 判定來源。

## Why

實戰中 top-level files 有檔案，但 taskDirectionLock.allowedFiles 沒有，AI 就猜要手改 JSON。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `packages/cli/src/commands/task-direction.ts`
- `packages/cli/src/commands/hook.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`

## Acceptance Criteria

- lock schema 明確只有一個 enforced allowedFiles。
- 舊 lock migration/repair 不破壞已存在 runtime。
- hook 與 checkpoint 使用同一 helper。


<!-- AAO-feedback-0012-lock-mtime -->
## Feedback Reinforcement Acceptance

- Lock integrity must include runtime mtime checking: if `.atm/runtime/locks/**/*.lock.json` changes after the last recorded ATM CLI lock/scope event, ATM reports `ATM_RUNTIME_LOCK_MANUAL_EDIT` and blocks the next governed mutation.
- The enforced `allowedFiles` source must be one canonical field; top-level lock file lists and embedded direction-lock lists must not diverge.
- Repair/migration may normalize old locks, but must write an auditable event or report so manual lock edits cannot hide in ignored runtime files.
<!-- /AAO-feedback-0012-lock-mtime -->


<!-- AAO-feedback-0012-frontload-deliverables -->
## Frontloaded Acceptance

- This task must implement the early fix for `initial allowedFiles from task deliverables`; AAO-0038 remains responsible for full import fidelity, but the speed-critical lock behavior lands here.
- `next --claim` / direction-lock creation must include every target-repo path from the task card `deliverables` array plus standard governance paths for that task.
- A declared deliverable must not require a later `tasks scope --add` before the agent can write it.
- Regression evidence must cover a task card with artifact/report deliverables and prove those deliverables appear in `taskDirectionLock.allowedFiles` immediately after claim.
<!-- /AAO-feedback-0012-frontload-deliverables -->
## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.task-direction-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
本任務已由 Augment 於 commit ade527b 與 f107b22 中完全實作並安全關閉。
