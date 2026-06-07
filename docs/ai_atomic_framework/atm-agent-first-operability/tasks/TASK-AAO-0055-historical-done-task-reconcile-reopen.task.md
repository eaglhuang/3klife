---
doc_id: doc_other_aao_0055
task_id: TASK-AAO-0055
title: "Historical done task reconcile / reopen closure sync"
status: done
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "為已完成但在實質 ledger 中缺關閉憑證之歷史任務提供 done task reconcile 治理路徑，避免 AI 代理人卡在 claim 與 close 互相衝突之生命週期死路中。"
milestone: M16
depends_on:
  - "TASK-AAO-0038"
  - "TASK-AAO-0051"
  - "TASK-AAO-0054"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
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
  notes: "回滾 reconcile/reopen 修正 commit，連同相關之 atomization map 變更一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "新增或修改 tasks/next 指令之 reconciliation 機制，並更新 atom map。"
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
# TASK-AAO-0055 — Historical done task reconcile / reopen closure sync

## Goal

在 ATM 中補全更直覺且安全的正式治理入口，新增 done task reconcile / reopen 類指令或流程，解決「規劃端為 `done`，但 target ledger 中缺 `closedAt` / `closurePacket` 狀態時，AI 代理人會卡在 lifecycle 死路」之問題，實現已完成歷史任務的平滑關閉。

## Why

目前以 `TASK-AAO-0054` 這種已由先前歷史 commit (如 `a343188`) 完成之任務為例：
- **半同步困境**：規劃卡（Planning Card）上是 `done`，但 target repo 首次 `import` 後，在實質 target ledger 裡因為沒有經歷正常的 checkpoint，因而呈現「無 `closedAt` / `closurePacket` 的半同步狀態」。
- **生命週期死路**：
  1. 代理人嘗試執行 `tasks close` 以補齊憑證與關閉，但 `tasks close` 要求該 task 必須處於 active `claim` 狀態；
  2. 代理人嘗試執行 `next --claim` 以鎖定該任務，但 `next --claim` 卻拒絕受理規劃端已經為 `done` 的任務。
- **繞過代價高**：在此之前，代理人必須手動執行一系列極其繁複且危險的繞過手段（如 `import --write --force --reset-open` 將其打回 open 狀態，再 claim，再 `tasks close --historical-delivery <commit>` 進行收尾）。

本任務旨在消除此流程死路，讓 ATM 的 `next` 能主動將此類 done task 導向協調路徑（reconcile/historical-sync route），而非引導至一般的開發 playbook。

## Deliverables

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/next.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
- `git diff --check`

## Acceptance Criteria

1.  **自動辨識並引導 Reconcile 路由**：
    *   當匯入的任務在規劃端標記為 `status=done`，但 target ledger 中 `closedAt` / `closurePacket` 缺失時，`next` 診斷中不可將其導向常規的 normal playbook，而是必須主動回傳 reconcile/historical-sync 路由指示。
2.  **明確且具備操作性的引導指令 (requiredCommand)**：
    *   ATM 必須在診斷訊息中提供極其明確且能直接執行的 `requiredCommand` (例如引導執行 `node atm.mjs tasks reconcile --task TASK-AAO-0054 --delivery-commit a343188a...` 或等價命令)，不得要求 AI 代理人手動強制 override / reset，亦不允許引導其手改 ledger JSON。
3.  **支援歷史遞交 commit 連結**：
    *   在 reconcile/historical-close 入口中，必須正式支援 historical delivery commit 連結參數 (例如 commit `a343188`)。
4.  **產出完整治理關閉憑證**：
    *   成功執行協調 (reconcile) 後，應順利在實質 ledger 內產生 closure packet、`closedAt`、`closedByActor`、`task-events` 以及 `evidence` 檔案，達成完整的治理閉環。
5.  **不可重複執行或修改 deliverables 原始碼**：
    *   協調流程僅進行憑證與 ledger 關閉資料同步，絕不允許要求或強迫代理人重複修改或建立 source deliverables 檔案。
6.  **與主線 active 任務完全隔離**：
    *   協調流程是獨立的 ledger 歷史關閉補登機制，不得與當前正在進行的常規 active task `claim` 流程相衝突，亦不應破壞 feature 分支的 hooks 防護。

## Rollback

Revert commit. If files were written, revert the CJS/next changes and validation maps.

## Atomization Impact

- **Owner atom/map**: `atm.task-ledger-governance-map`
- **Map updates**:
  - `atomic_workbench/atomization-coverage/path-to-atom-map.json`
