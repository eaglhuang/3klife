---
doc_id: doc_other_aao_0071
task_id: TASK-AAO-0071
title: "ATM versioning semver helper rename hygiene patch"
status: planned
owner: atm-core
priority: P2
milestone: M17
depends_on:
  - "TASK-AAO-0070"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/plugin-governance-local/src/versioning.ts"
  - "packages/plugin-governance-local/src/index.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/plugin-governance-local/src/versioning.ts"
  - "packages/plugin-governance-local/src/index.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾會將 versioning.ts 的函式名稱還原，並回復 index.ts 匯出名稱。此修正不影響任何寫入儲存的資料庫狀態。"
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "在此 hygiene patch 中，正式將 packages/plugin-governance-local/src/versioning.ts 歸屬 ownership 對應加回 path-to-atom-map.json 中。"
outOfScope:
  - "實作 artifactVersionKind 或是任何 polymorphic 多型解析"
  - "將 dataVersion / artifactVersion 串接寫入 stores.ts 或 bootstrap 流程 (Slice 2 範圍)"
  - "修改已關閉的 TASK-AAO-0065 治理帳本歷史"
  - "amend 或修改已提交的歷史 commit 7d6b04c"
nonGoals:
  - "不要實作 artifactVersionKind 多型"
  - "不要把 Slice 2 的 write-path 串接做進來"
  - "不要修改 stores.ts 或是 core 裡的其他合約"
tags:
  - "hygiene-rename"
  - "framework-maintenance"
  - "refactor"
---

# TASK-AAO-0071 - ATM versioning semver helper rename hygiene patch

## 任務目標 (Goal)

本任務為 docs-only 新增的規劃卡，旨在針對 Slice 1 所建立的 `packages/plugin-governance-local/src/versioning.ts` 版本控制純邏輯 Helper 模組進行命名校正的衛生補丁 (hygiene patch)。

具體校正內容僅限於：
- `isValidVersionString` -> `isValidSemverVersionString`
- `compareVersions` -> `compareSemverVersions`

這是一張 Slice 2 的前置衛生刀，並非 Slice 2 本體，亦不會觸及 `artifactVersionKind` 的實作。

## 為什麼要做 (Why)

在 Slice 1 (`7d6b04c`) 的實作中，我們新增了 `versioning.ts` 作為純邏輯輔助函式。然而其中的 `isValidVersionString` 與 `compareVersions` 在命名上過於通用，但在邏輯上僅能處理語意化版本 (semver)。

若未來將 Git commit SHA 或是檔案 Content Hash (如 SHA-256) 當作 `artifactVersion` 輸入至這兩個輔助函式中，會引發錯誤判定（例如，`compareVersions('7d6b04c', 'abc1234')` 會因為無法解析成數字而回傳錯誤的相符結果）。

為了防範未來的隱形資料損毀，必須在此前置卡中完成精確的命名校正：
- 明確宣告 `dataVersion` 將固定採用 `semver` 規格。
- 確保輔助函式名稱帶有 `Semver` 字眼，以與未來 Slice 2 可能引入的多型 `artifactVersion` 區隔。
- `artifactVersion` 的多型機制與 `artifactVersionKind` 並不屬於本卡的處理範圍，將全數留待 Slice 2。

## 驗收標準 (Acceptance Criteria)

- 一張規劃任務卡 `TASK-AAO-0071` 成功建立於 `3KLife` 專案中，且透過 `node atm.mjs tasks import --from <path> --dry-run --json` 進行測試時回傳 `ok: true`，且無任何 `importDiagnostics`。
- 本卡的 `scopePaths` 與 `deliverables` 僅精確列出三個最小範圍檔案：`packages/plugin-governance-local/src/versioning.ts`、`packages/plugin-governance-local/src/index.ts`、`atomic_workbench/atomization-coverage/path-to-atom-map.json`。
- README 索引表中已成功加入 `TASK-AAO-0071` 之記錄，且 `status` 標註為 `planned`（不預先假裝已在 ATM ledger 關閉）。
- 代碼實作僅修正 semver 輔助函式的命名（含測試與呼叫面之對齊），無涉及任何 multi-kind 多型邏輯與 stores.ts 變更。

## 停止條件 (Stop Conditions)

- **停止條件 1**：若發現實作時需要將 `artifactVersionKind` 或是任何多型辨識器 (discriminator) 一併實作進來，立刻停止並回報，不可在此擴展範圍。
- **停止條件 2**：若發現修改範圍需要跨出允許檔案（例如修改 `stores.ts`、`core`、`cli/src/commands` 等），立刻停止並回報。
- **停止條件 3**：若發現需要去修訂已關閉的歷史 `TASK-AAO-0065` 或是嘗試 amend Commit `7d6b04c`，立刻停止並回報。
