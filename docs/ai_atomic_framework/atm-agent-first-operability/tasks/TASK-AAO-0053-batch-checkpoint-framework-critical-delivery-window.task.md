---
doc_id: doc_other_aao_0053
task_id: TASK-AAO-0053
title: "batch checkpoint 支援 framework critical delivery window"
status: planned
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "讓 batch checkpoint 支援 framework critical delivery window 流程，避免 batch queue-head 的 framework-critical 任務卡在互相矛盾的規則中。"
milestone: M16
depends_on:
  - "TASK-AAO-0037"
  - "TASK-AAO-0038"
  - "TASK-AAO-0047"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/batch.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/hook.ts"
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
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.batch-run-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "更新 batch checkpoint 與 hook 對應之 atom mapping。"
outOfScope:
  - "手動 reserve/promote/claim/close 繞過 batch lifecycle"
  - "手改 .atm/runtime/**"
  - "把 .atm/history/** 當作獨立功能交付物"
  - "修改 unrelated 3KLife dirty files"
nonGoals:
  - "不建立第二套 task lifecycle"
  - "不繞過 ATM evidence gate"
  - "允許只提交 .atm/history closure 而沒有 delivery commit linkage"
---
# TASK-AAO-0053 — batch checkpoint 支援 framework critical delivery window

## Goal

補全 ATM 的正式治理路徑，讓 `batch checkpoint` 支援 framework critical delivery window（或 historical-delivery 等價流程），解決當前 batch queue-head 下，因 `batch checkpoint` 流程與 framework critical source diff 檢測衝突，而導致沒有合法收尾路徑的問題。

## Why

當前 AI-Atomic-Framework 中的 `TASK-AAO-0052` (或類似的 framework-critical 任務) 已完成實作、validator 與 evidence，正處於準備 `batch checkpoint` 的階段。
但由於 `scripts/validate-task-ledger-governance.ts` 對 framework critical source diff 的嚴格防護，`batch checkpoint --actor GitHubCopilot --json` 會被 `ATM_TASK_CLOSE_FRAMEWORK_DIFF_ACTIVE` 錯誤代碼阻擋。

- **目前規定衝突點**：
  1. batch playbook 規定：在 `checkpoint` 成功前不應 commit 產物；
  2. framework close gate 規定：critical source diff 在 checkpoint 關閉前不可存在於 workspace。
- **目前的暫時繞過**：
  在 single-task 模式中，`tasks close` 支援 `--historical-delivery` 以允許在 commit 之後再關閉，但 `batch checkpoint` 缺乏對應的官方入口，使得 batch 佇列頭的任務一旦涉及 framework-critical 變更便會卡死。

本任務旨在新增官方支援的 `batch checkpoint` 治理路徑，讓 Agent 不需要手動跳去 `tasks close`，亦不需要違反 checkpoint-before-commit 規則。

## Deliverables

- `packages/cli/src/commands/batch.ts` (支援 `--historical-delivery <commit>` 或 `--delivery-commit <commit>`)
- `packages/cli/src/commands/hook.ts` (使 pre-commit 與 checkpoint window 得以感知對應的 critical diff 合法性)
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
- `git diff --check`

## Acceptance Criteria

1. **實例回歸測試**：
   - 以 `TASK-AAO-0052` 作為 dogfood 案例，進行完整流程回歸測試。
2. **清晰的引導診斷**：
   - 當 `batch checkpoint` 遇到 framework critical source diff 被阻擋時，必須回傳極其清晰的引導與診斷 (guidance)，指導 Agent 使用正確的指令收尾，不可讓 Agent 卡在互相矛盾的規則裡。
3. **正式 CLI 路徑**：
   - 提供正式的 CLI 參數路徑，例如 `batch checkpoint --historical-delivery <commit>` 或 `batch checkpoint --delivery-commit <commit>`，或等價的 governed delivery window，確保其行為與 `tasks close --historical-delivery` 對齊且安全。
4. **生命週期防禦**：
   - 依然不允許 Agent 透過手動 `reserve/promote/claim/close` 來繞過 batch lifecycle（這會使 batch queue 錯亂）。
5. **完整憑證連結**：
   - 不允許只提交 `.atm/history` 關閉記錄而沒有對應的 `delivery commit linkage`。
6. **環境安全性**：
   - 驗證命令至少涵蓋 typecheck、validate:cli、batch/checkpoint regression、git diff --check。
   - 整個實作與測試過程中，不可觸碰或弄髒當前 `TASK-AAO-0052` 已經 stage 的任何 changes。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- **Owner atom/map**: `atm.batch-run-map`
- **Map updates**:
  - `atomic_workbench/atomization-coverage/path-to-atom-map.json`
