---
doc_id: doc_other_aao_0056
task_id: TASK-AAO-0056
title: "Framework task deliver-and-close macro"
status: done
owner: atm-core
priority: P0
milestone: M16
depends_on:
  - "TASK-AAO-0017"
  - "TASK-AAO-0051"
  - "TASK-AAO-0053"
  - "TASK-AAO-0055"
  - "TASK-AAO-0057"
  - "TASK-AAO-0058"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/batch.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/batch.ts"
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
  notes: "回滾 deliver-and-close macro 修正 commit，連同相關之 atomization map 變更一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "新增或修改 tasks/batch 指令之 macro 機制，並更新 atom map。"
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
# TASK-AAO-0056 — Framework task deliver-and-close macro

## Goal

把 delivery commit → git-head evidence → historical close → closure commit → git-head 收斂包成一個命令。

## Why

在 ATM 實戰中，AI 代理人或開發者需要經歷非常多繁複且順序敏感的手動步驟才能將一個任務安全關閉。若在 delivery commit、evidence 收集、歷史關閉與 closure commit 之間因為順序出錯（例如先 commit 卻忘了 checkpoint，或 checkpoint 失敗卻已經 stage 髒檔），會直接觸發 invariant 報錯。

本任務旨在提供一個高層級的 macro 命令，將這一系列繁瑣的收尾動作一鍵式收斂，大幅降低 AI 開發與 status sync 的操作複雜度。

## Deliverables

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/batch.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
- `git diff --check`

## Acceptance Criteria

1.  **一鍵式 Macro 命令整合**：
    *   ATM CLI 必須提供一個高層級 macro 指令（例如 `atm tasks deliver-and-close` 或等價 macro 命令），能將 feature 實作後的交付 (delivery) 與關閉 (closure) 流程一鍵式收斂。
2.  **自動化串接四核心步驟**：
    *   該命令應自動依序執行以下核心步驟：
        *   自動收集並暫存當前實作修改（或使用指定的 delivery commit 雜湊）。
        *   自動收集與生成符合規範的 `git-head evidence`，並驗證對應的 validators 通過。
        *   以 historical close 或等價安全通道執行關閉閉環。
        *   自動提交 closure commit 並更新 git-head ledger 歷史。
3.  **多重施工模式支援**：
    *   支援 Batch 施工模式與單卡 (Single-task) 施工模式的快速收尾，避免 AI 代理人在多次手動 commit / evidence 之間因為順序出錯而觸發 invariant 報錯。
4.  **防呆與中斷回滾機制**：
    *   具有完善的防呆與中斷修復機制，若其中一步失敗（如 validator 失敗），會明確指出阻擋原因並提供 rollback 指引。

## Rollback

Revert commit. If files were written, revert the macro changes and validation maps.

## Atomization Impact

- **Owner atom/map**: `atm.task-ledger-governance-map`
- **Map updates**:
  - `atomic_workbench/atomization-coverage/path-to-atom-map.json`
