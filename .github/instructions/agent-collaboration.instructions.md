<!-- doc_id: doc_ai_0009 -->
﻿---
applyTo: "**"
---

# Agent Collaboration Protocol

## 三道防線

> **Harness Engineering 原則**：所有品質驗證優先使用「計算型感測器」（CPU 確定性驗算），而非依賴 LLM 推論。
> 閘門失敗訊息已格式化為 Agent 可直接讀取的修正指引，錯誤即是下一輪 prompt 的起點。

### 防線 1: Pre-flight Gate（開工前）

> ⛔ **硬規則 #0（不可省略）**：接到任務卡後，動手之前先鎖卡：
> ```bash
> node tools_node/task-lock.js check <task-id>   # 確認無衝突
> node tools_node/task-lock.js lock <task-id> <agent-name>  # 上鎖
> ```
> 並立即更新任務卡 frontmatter：`status: in-progress` / `started_at: <RFC3339>` / `started_by_agent: <agent-name>`
> 違反此規則視為無效接手。完整流程見 `docs/agent-briefs/Readme.md (doc_ai_0023)` §鎖卡流程。

1. 讀 `docs/keep.summary.md (doc_index_0012)` (doc_index_0012)
2. **[強制] 執行計算型健康掃描與邊界檢查**：
   確認專案現況，若有既有違規需在修改前知悉：
   ```bash
   node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop
   node tools_node/compute-gate.js --gates import-boundary --agent-feedback
   ```
3. 執行 `node tools_node/check-context-budget.js --changed`（若可用）
4. **鎖定任務卡**（見硬規則 #0）→ `node tools_node/task-lock.js lock <task-id> <agent-name>`
5. 確認要修改的檔案列表，記錄在 session memory

### 防線 2: In-flight Guard（工作中）

- 修改 `.ts` 檔 → 每次儲存後執行 `node tools_node/compute-gate.js --gates ts-syntax eslint-rules`
- 修改 fragment → 先跑 `node tools_node/build-fragment-usage-map.js --query <ref>` 確認影響範圍
- 修改 layout → 先跑對應的 regression check（若存在）
- 修改 skin → 先跑 `node tools_node/validate-ui-specs.js --strict`
- 修改 task JSON → 必須已 lock 才准改
- token 超 18k → 強制 summarize；超 30k → hard-stop
- **[強制] 新增 import → 必須確認目標模組在允許清單內**（`check-import-boundaries.js` 規則）

### 防線 3: Post-flight Checkpoint（收工前）

1. **⛔ [強制] 執行標準閘門並達成 0 違規**：
   任何提交（Commit）前，必須執行以下指令並確認輸出為「All gates passed」且違規數歸零：
   ```bash
   node tools_node/compute-gate.js --profile standard --agent-feedback
   ```
   **嚴禁在有邊界違規（import-boundary violations）的情況下提交代碼。**

2. `node tools_node/check-encoding-touched.js <changed-files...>`
3. `node tools_node/validate-ui-specs.js --strict --check-content-contract`
4. 若改了 layout/fragment → 執行對應 regression check
5. `node tools_node/task-lock.js unlock <task-id> <agent-name>`（若有鎖定）
6. `node tools_node/report-turn-usage.js --changed --emit-final-line`（若可用）

### 自動偵測問題清單（Compute Gate 感測項目）

執行以下指令可取得完整問題清單供 Agent 閱讀：

```bash
# 快速（3s）：TS 語法 + 編碼 + ESLint 規則
node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop

# 完整（30s）：全部 10 個感測器
node tools_node/compute-gate.js --profile full --agent-feedback --no-stop

# 模組邊界違規清單
node tools_node/check-import-boundaries.js --fix-hint

# ESLint 問題清單
node tools_node/check-eslint-rules.js --fix-hint

# 韁繩健康報告（五維度評分）
node tools_node/harness-health-report.js
```

## Task Locking 規則

- **鎖定先到先贏**：同一 task 同時只允許一個 Agent 鎖定
- **鎖定者才能解鎖**：unlock 必須由 lock 時同一 agent-name 執行
- **查詢不需鎖定**：`task-lock.js check` 和 `task-lock.js list` 可隨時執行
- **忘記解鎖**：`finalize-agent-turn.js` 會自動嘗試 unlock

## Task Card 開立硬規則

- 所有新的 Markdown 任務卡，一律先遵守 `docs/agent-briefs/Readme.md (doc_ai_0023)` 的「硬規則 / 開新任務卡流程 / 鎖卡流程」，再落到實際檔案。
- 任務卡 ID、卡號、系統代碼與子系統編號，一律以 `docs/遊戲規格文件/系統規格書/名詞定義文件.md (doc_spec_0008)` 為唯一來源，不得在其他文件或 skill 內另起命名規則。
- 除非是修既有卡的極小錯字或使用者明確要求手工低階修補，否則不得直接手寫新任務卡；必須先走 `task-card-opener` skill 的決策流程。
- `task-card-opener` 的責任包含：判斷任務屬於哪個 shard/系統、建立或回寫對應 Markdown 卡、同步更新對應 JSON shard/manifest、補齊 `started_at` / `started_by_agent` / `notes` 等協作欄位。
- 若任務屬於 UI 流程，仍維持 `docs/ui-quality-tasks/*.json` 為可編輯 shard，並在更新後執行 `node tools_node/build-ui-task-manifest.js`；這條規格不變。
- 若任務屬於 `docs/tasks/tasks-*.json` 分片（如 `UI-* / PROG-* / DC-* / DATA-*`），建立或更新條目時同樣必須先走 `task-card-opener` skill，再編輯對應分片。

## Handoff 規則

- 結束回合時，handoff 摘要必須包含：
  - 修改了哪些檔案
  - 做了什麼決策
  - 是否有 blocker
  - 下一步建議
- 下一個 Agent 入場時：
  - 先 `task-lock.js check <task-id>` 確認無衝突
  - 讀上一份 handoff 摘要
  - 驗證前一位 Agent 宣稱的修改與實際 diff 一致

## Conflict Resolution

- 同一檔案衝突：先 lock 者優先；後到者等待或改 scope
- Task 衝突：拆 subtask → 各自 lock 子 task
- 規格矛盾：回寫 `docs/遊戲規格文件/正式規格矛盾審查.md (doc_spec_0001)` (doc_spec_0001) → 人類仲裁
