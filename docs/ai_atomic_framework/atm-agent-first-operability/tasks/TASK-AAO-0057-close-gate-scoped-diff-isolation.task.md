---
doc_id: doc_other_aao_0057
task_id: TASK-AAO-0057
title: "Close gate scoped diff isolation"
status: done
owner: atm-core
priority: P0
milestone: M16
depends_on:
  - "TASK-AAO-0006"
  - "TASK-AAO-0051"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/batch.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾 scoped diff isolation 修正 commit，連同相關之 atomization map 變更一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "新增或修改 tasks/close 指令之 scoped diff 檢驗機制，並更新 atom map。"
outOfScope:
  - "手動 reserve/promote/claim/close 繞過 batch lifecycle"
  - "手動修改 .atm/history/** 迴避治理"
  - "修改 unrelated 3KLife dirty files"
nonGoals:
  - "不建立第二套 task lifecycle"
  - "不繞過 ATM evidence gate"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---
# TASK-AAO-0057 — Close gate scoped diff isolation

## Goal

在關閉任務 (close) 或 checkpoint 時，實施「工作範圍差異隔離 (scoped diff isolation)」，避免無關的髒檔案 (dirty files) 或未追蹤檔案 (untracked files) 阻擋當前任務的順利關閉。

## Why

目前 ATM 治理要求在關閉任務時，工作區內不可以有任何無關的 active framework source diff，以防發生程式碼越界或漏掉審查。

但在實際的多人/多代理人協作（或是 IDE 背景編譯、測試跑出臨時檔案）時，常會因為工作區殘留非本任務範疇的變更（如其他 agent 或人類產生的無關 dirty 變更、或者是 IDE 產生的無關臨時 untracked files）而直接報錯 `ATM_TASK_CLOSE_FRAMEWORK_DIFF_ACTIVE` 阻擋 close。這導致 batch queue-head 任務無法順利收尾。

本任務旨在引入「變更隔離機制」，使 close/checkpoint 僅聚焦於任務自身申報之 scope，對無關變更進行安全隔離。

## Deliverables

- `packages/cli/src/commands/tasks.ts`
- `scripts/validate-task-ledger-governance.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
- `git diff --check`

## Acceptance Criteria

1.  **聚焦任務專屬 Scope 審查**：
    *   強化 close/checkpoint 的驗證邏輯，僅對當前任務申報的 `scopePaths` / `allowedFiles` 進行變更追蹤與 diff 審查。
2.  **隔離無關變更 (Scoped Isolation)**：
    *   當工作區內存在非當前任務所屬的無關變更（如其他 agent 或人類產生的無關 dirty 變更、或者是 IDE/編譯器產生的無關臨時 untracked files）時，close gate 應能夠將其安全隔離（isolate），不應直接報錯 `ATM_TASK_CLOSE_FRAMEWORK_DIFF_ACTIVE` 或類似的全域阻擋訊號。
3.  **嚴格防守 deliverables 完整性**：
    *   必須確保任務自身申報之 `deliverables` 與 `scopePaths` 變更是完整且符合規範的，隔離僅適用於「與本卡無關之無涉檔案變更」。
4.  **提供精確的隔離診斷輸出**：
    *   提供精確的隔離診斷輸出，明確指出哪些是隔離中的無涉變更，哪些是本卡真正應改但未改、或是不該改但改了的 scope 溢出變更。

## Rollback

Revert commit. If files were written, revert the scoped diff changes and validation maps.

## Atomization Impact

- **Owner atom/map**: `atm.task-ledger-governance-map`
- **Map updates**:
  - `atomic_workbench/atomization-coverage/path-to-atom-map.json`
