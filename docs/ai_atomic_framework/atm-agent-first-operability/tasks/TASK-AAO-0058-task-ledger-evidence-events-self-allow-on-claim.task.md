---
doc_id: doc_other_aao_0058
task_id: TASK-AAO-0058
title: "Task ledger/evidence/events self-allow on claim"
status: done
owner: atm-core
priority: P0
milestone: M16
depends_on:
  - "TASK-AAO-0012"
  - "TASK-AAO-0051"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - ".atm/history/tasks/TASK-AAO-0058.json"
  - ".atm/history/evidence/TASK-AAO-0058.json"
  - ".atm/history/evidence/TASK-AAO-0058.closure-packet.json"
  - ".atm/history/task-events/TASK-AAO-0058/**"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - ".atm/history/tasks/TASK-AAO-0058.json"
  - ".atm/history/evidence/TASK-AAO-0058.json"
  - ".atm/history/evidence/TASK-AAO-0058.closure-packet.json"
  - ".atm/history/task-events/TASK-AAO-0058/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-direction-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾 self-allow 修正 commit，連同相關之 atomization map 變更一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.task-direction-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "修改 task direction 鎖定邏輯以新增自動 self-allow 機制，並更新 atom map。"
outOfScope:
  - "手動 reserve/promote/claim/close 繞過 batch lifecycle"
  - "手動修改 .atm/history/** 迴避治理"
  - "修改 unrelated 3KLife dirty files"
nonGoals:
  - "不建立 second registry"
  - "不允許無限制擴展 allowedFiles"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---
# TASK-AAO-0058 — Task ledger/evidence/events self-allow on claim

## Goal

任務被 claim 或鎖卡時，其專屬的治理紀錄檔案（如 `.atm/history/tasks/<id>.json`、evidence 檔案、task-events 歷史紀錄）應自動納入 allowedFiles 機制，無需手動補申報。

## Why

在目前的嚴格 Scope 治理下，任何檔案寫入皆必須在 `taskDirectionLock.allowedFiles` 的白名單內。但每次 agent 在完成實作並寫入 evidence、更新 ledger status 或記錄 task-events 時，這些 ATM 內部的治理路徑往往不屬於任務的 deliverables/scope。

這導致 agent 在執行 `batch checkpoint`、`evidence run` 或 `tasks close` 時，容易因為這些治理紀錄檔案本身的變更而觸發 `ScopeLock` 越界阻擋，進而必須手動執行 `tasks scope --add` 將其補加入 allowedFiles 中。這是一種多餘且降低開發流暢度的重複性操作。

本任務旨在讓 ATM 在 claim 時，能自動將卡片自身的治理檔案路徑隱式地 self-allow。

## Deliverables

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/task-direction.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- `.atm/history/tasks/TASK-AAO-0058.json`
- `.atm/history/evidence/TASK-AAO-0058.json`
- `.atm/history/evidence/TASK-AAO-0058.closure-packet.json`
- `.atm/history/task-events/TASK-AAO-0058/**`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`
- `git diff --check`

## Acceptance Criteria

1.  **隱式治理路徑 Self-Allow**：
    *   在 claim 任務或建立 task direction lock 時，ATM 必須將該任務自身的治理變更路徑自動、隱式地加入到當前允許編輯的檔案清單 (`taskDirectionLock.allowedFiles`) 中。
2.  **治理檔案精確覆蓋**：
    *   自動加入之治理檔案路徑必須精確覆蓋：
        *   `.atm/history/tasks/<task-id>.json`
        *   `.atm/history/evidence/<task-id>.*`
        *   `.atm/history/task-events/<task-id>/**`
3.  **無感治理寫入體驗**：
    *   AI 代理人在執行 evidence 收集、中繼 checkpoint 或 close 任務時，不會因為這些 ATM 內部治理檔案的變更而被 `ScopeLock` 阻擋，免除手動執行 `tasks scope --add` 的冗餘操作。
4.  **確保 deliverables 邊界完整性**：
    *   此 self-allow 規則必須為 strict lock 模式之內建機制，不得破壞主線 source deliverables 的邊界防護，絕不允許漏掉任何實質代碼 source 變更審查。

## Rollback

Revert commit. If files were written, revert the self-allow changes and validation maps.

## Atomization Impact

- **Owner atom/map**: `atm.task-direction-map`
- **Map updates**:
  - `atomic_workbench/atomization-coverage/path-to-atom-map.json`
