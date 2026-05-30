# D2 Adapter Spec — atm-markdown-task-source Plugin 接入評估報告

本評估報告旨在分析 3KLife 專案庫如何接入 AAF 上游的 `atm-markdown-task-source` plugin，以逐步替換既有的 `tools_node/task-card-opener.js`，並為後續生命週期狀態（`status` 欄位）的徹底去中心化（移出 Markdown）奠定基石。

---

## 1. 現況盤點：tools_node/task-card-opener.js 行為列表

既有的 `task-card-opener.js` 是 3KLife adopter 端高度特化的任務卡維護工具，其核心行為與職責如下：

### A. 輸入與解析 (CLI Inputs)
- 接受複數 CLI 參數（如 `--id`, `--next-id-prefix`, `--title`, `--acceptance`, `--deliverables`, `--write`, `--assign-doc-id`）。
- 支援 `--recipe` 參數，以便將 UI 產線的 recipe 配置直接委派給 `compile-recipe-to-task-card.js` 進行編譯。

### B. 核心處理流程
1. **參數驗證**：校驗必填項，防範 ID 指定與遞增流水號（`next-id-prefix`）的邏輯衝突。
2. **自動流水號分配**：透過 `taskAdapter.reserveNextTaskId` 查詢 adopter 本地 ledger 狀態，動態分配下一個可用編號（如 `ATM-2-0005`）。
3. **任務上鎖機制 (3KLife 硬規則 #0)**：在 `in-progress` 狀態下，調用 `taskAdapter.promoteReservationToLock` 進行本地上鎖保護；若發生異常則主動釋放（`releaseReservedTaskId`）。
4. **Markdown 樣式渲染**：根據任務類型（例如 `HARN-` 系列）與參數，渲染出特化的 Markdown 樣式（包含 `agent-briefs` 的 `classic`、`harn-rich` 或 `generic`）。
5. **doc_id 自動註冊**：若啟用 `--assign-doc-id`，在寫入 Markdown 後，呼叫 `doc-id-registry` 分配並回寫全域唯一的 `doc_id`。
6. **Ledger 分片更新**：載入並回寫 `docs/tasks/tasks-*.json`，動態重新計算分片 summary（統計 `done` / `in_progress` / `open` / `total` 數值）。

### C. 呼叫與依賴處
- `ui-vibe-pipeline` 生產管線。
- 各個 Agent 於 Phase 0 開卡時手動呼叫，或自動化指令整合。

---

## 2. 上游 Plugin 介面對照：atm-markdown-task-source Hook 機制

上游 AAF 的 `AtmMarkdownTaskSourcePlugin` 實現了標準的 `ExternalTaskSourcePlugin` 介面，其暴露的三個主要 Hook 與 `task-card-opener.js` 的職責對照如下：

### A. `parse(input: ExternalTaskSourceInput)`
- **上游行為**：讀取 Markdown 原始文字，利用 `extractFrontMatter` 提取 frontmatter 物件（含 `task_id`, `contextMap` 等），並將剩餘內容切為 `body`。
- **對照職責**：對應 `task-card-opener.js` 對既有 `.task.md` 檔案的讀取與 frontmatter 解析邏輯。

### B. `validate(parsed: ParsedExternalTask)`
- **上游行為**：校驗 frontmatter 資料。檢查 `task_id` 格式、驗證 `contextMap.primary` 檔案是否存在且非空、驗證 `deliverables` 是否存在。回寫 diagnostics 診斷報告。
- **對照職責**：對應 `task-card-opener.js` 的 frontmatter 語意合理性檢查。
- **Advisory 警告機制結合**：AAF 的 `validate` 在非嚴格模式下，會回傳 diagnostics 警告級別。在 Git hook (pre-commit) 中僅會以 stderr 形式輸出 advisory 警告，絕不阻擋 commit，與 3KLife 的 advisory 提醒精神完美契合。

### C. `generate(intent: ExternalTaskGenerationIntent)`
- **上游行為**：接收 templateKey 與 fields，調用 `loadTemplate` 與 `applyIntent` 生成標準的 YAML frontmatter 與任務卡 skeleton markdown。
- **對照職責**：對應 `task-card-opener.js` 內部的 `buildMarkdown`、`buildAgentBriefsHarnRichMarkdown` 等樣式渲染與骨架建構職責。

---

## 3. Gap 分析表

| 職責 (Responsibility) | 3KLife task-card-opener.js | AAF atm-markdown-task-source | 行為差異 / 解決策略 |
| :--- | :--- | :--- | :--- |
| **自動 ID 分配與任務鎖** | 整合本地 `taskAdapter` 與 `task-lock.js`，具備 adopter 本地上鎖功能。 | **無** (上游為純無狀態 plugin，不涉及 adopter 本地上鎖)。 | **保留 adopter 外掛**：ID 分配與任務鎖屬於 3KLife 本地治理邏輯，應由 3KLife CLI wrapper 在呼叫上游 plugin 生成任務前後進行包裝。 |
| **特化 Markdown 樣式** | 支援 `harn-rich` (含 INPUT/OUTPUT_CONTRACT、ROLLBACK_HINT 等) 與 `classic`、`generic`。 | 標準 `generate` 僅支援上游通用模板，未預載 3KLife 特化欄位。 | **模板移植與配置化**：將 3KLife 特有的 `harn-rich` 格式移植為上游 plugin 的支援模板，或透過 generator parameters 傳遞自訂結構。 |
| **Ledger 分片與 Summary 更新** | 讀寫並更新 `docs/tasks/tasks-*.json`，重新計算 done/in_progress 等統計。 | **無** (不涉及 index/summary 統計)。 | **下游處理**：分片寫入與統計屬於 3KLife 的專案結構維護，由 3KLife CLI wrapper 或 post-hook 指令接續處理。 |
| **`doc_id` 自動分配** | 整合 `doc-id-registry` 自動分配 `doc_id`。 | **無**。 | **整合於下游 CLI**：由 3KLife CLI 指令在生成任務卡後，接續執行 `doc-id-registry` 處理。 |

---

## 4. 切換策略 3 種比較

為了安全替換 3KLife 的核心開卡機制，我們對評估了以下三種切換策略：

### A. Big-Bang (一刀換)
- **說明**：直接廢棄 `task-card-opener.js`，將 3KLife 所有開卡與驗證指令全部改為上游 AAF plugin 驅動。
- **優缺點**：切換迅速、代碼無殘留；但風險極高，若上游解析器在特化 frontmatter (如 `contracts` / `harness_evidence`) 上有解析 bug，會直接中斷所有 Agent 的併發開發流。

### B. Shadow (雙跑、上游 Advisory) — 🌟 推薦選擇
- **說明**：保留 `task-card-opener.js` 的核心寫入與 ID 分配，但在其內部「悄悄引入」上游 `atm-markdown-task-source` plugin。每次執行開卡時，同時跑舊邏輯與新 plugin，並將 plugin 的驗證結果作為 advisory warning 輸出於 CLI 中。
- **優缺點**：**零風險**。在不破壞現有 Agent 生產力的前提下，於真實開發場景中測試上游 plugin 的相容性，充分收集相容性數據。
- **選定理由**：3KLife 目前有多個 Agent 在不同 worktree 下併發開發，任何破壞性變更都可能引發連鎖 pre-commit 阻擋。Shadow 雙跑能提供最安全的過渡驗證期。

### C. Progressive (漸進式切換)
- **說明**：先切換 parse Hook，穩定後切換 validate Hook，最後才切換 generate 骨架生成。
- **優缺點**：粒度細緻；但多次切換會增加 adapter 維護成本，且 parse 和 validate 本身密不可分。

---

## 5. 風險清單（含 status 欄位處理）

### A. `status` 欄位同步衝突風險（核心痛點）
- **現狀風險**：目前 3KLife 任務卡的 frontmatter 含有 `status: <open|in_progress|done>`，同時 `tasks-*.json` 中也維護著對應任務的 `status`。這導致生命週期狀態在 Markdown 與 JSON 間存在「雙向同步」的冗餘，Agent 常常需要手動進行 status mirror commit，容易引發狀態不一致或 Git 衝突。
- **三條路徑評估**：
  1. **保留路徑**：繼續維持雙向同步，依靠 adapter 進行強制檢查。高成本、無法根本解決問題。
  2. **衍生路徑**：引入自動化雙向 sync 工具。會讓本地 cli 變得無比臃腫。
  3. **移除路徑 (推薦)**：**完全將 `status` 欄位自 Markdown 任務卡中移除**。Markdown 僅作為「靜態契約 (Contracts, Deliverables, Acceptance)」的載體；而動態的「生命週期狀態」完全交由 `.atm/history/tasks/*.json` 與 adopter 本地 ledger 統一管理。這能徹底消除冗餘同步，實現狀態去中心化！

### B. 富簡報 (Harn-Rich) 語意相容風險
- **說明**：3KLife 的 `harn-rich` 格式包含非標準的 `contracts` 和 `harness_evidence` 物件，上游 plugin 在 parse 時若未做好相容，可能會將這些特化 YAML scalar 誤判為無效欄位，導致 `tasks import` 失敗。

---

## 6. 0093 / 0094 拆分提案

為了解耦實作並降低切換風險，建議將後續工作拆分為兩卡：

### 📌 TASK-AAO-0093: Plugin 接入與 Shadow 雙跑實作
- **範圍**：
  - 在 3KLife 專案庫中引入 `@ai-atomic-framework/plugin-sdk` 與 `atm-markdown-task-source` 依賴。
  - 改造 `task-card-opener.js`，在其內部導入上游 plugin 進行 shadow 驗證與解析。
  - 將上游 plugin 的 validate 結果以 advisory warning 形式在開卡時輸出。
- **依賴**：`TASK-AAO-0092` (本設計文件)。

### 📌 TASK-AAO-0094: Status 欄位移除與全面切換扶正
- **範圍**：
  - 全面將 `status` 欄位自 3KLife 任務卡 Markdown 中移除，生命週期狀態完全由 AAF ledger 和 `tasks-*.json` 接管。
  - 廢棄 `task-card-opener.js` 舊有生成邏輯，全面扶正上游 plugin 的 `parse` / `validate` / `generate` 機制。
  - 清理 shadow 雙跑相關的暫存代碼。
- **依賴**：`TASK-AAO-0093`。
