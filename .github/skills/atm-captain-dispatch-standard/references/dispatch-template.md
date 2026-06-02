# ATM Captain Dispatch Templates (派工單範例模板)

本文件提供 4 類核心派工情境的標準 Markdown 模版。Project Captain 在輸出派工單時，應直接複製並實例化（填入具體資料）以下模版。

---

## 模版 1：只讀複審單 (Read-only / Auditing / Spot-check)
* **適用情境**：針對已完成的任務進行程式碼抽查、日誌排查、語意/邏輯覆核、編碼災情盤點。不涉及任何代碼修改。

```markdown
```markdown
代號：[指派代理代號，如 006 或 Haiku]；模型：[建議執行模型]

### 任務
[TASK-XXXX] [只讀/複審] 盤點與複審 [某模組/功能名稱] 的 [具體問題]

### Repo
C:\Users\User\3KLife

### 背景白話
目前 [某功能] 出現了 [異常/完成交付]，我們需要一個只讀的代理來做深入的 [抽查/日誌排查/代碼複審]，找出是否有潛在的 [錯誤/BOM編碼損壞/邏輯漏洞]，並把結果整理回報給 Captain。

### 請做
只讀分析以下檔案，嚴禁做任何修改與寫入：
1. `[檔案路徑 1]` (行號 [X-Y]) — 盤點其 [變數/介面定義]
2. `[檔案路徑 2]` — 盤點與 [檔案 1] 的關聯
3. [日誌路徑，若有] — 篩選其中的 [特定 Error 關鍵字]

### 請回報
1. 是否有發現具體的程式邏輯/編碼問題？如果有，請提供精確的行號與原因。
2. 針對該問題的修補建議路線（預計需要修改哪些檔案？）。
3. 簡明的唯讀盤點報告。

### 禁止
- 絕對禁止對專案進行任何修改 (無寫入權限)。
- 絕對禁止呼叫任何帶有修改性質的 CLI 命令。
- 絕對禁止順手清理或 clean 未經授權的 untracked 檔案。

### 大白話補一句
眼睛張大只准看、不准動手，把有鬼的地方跟行號揪出來回報就對了！
```
```

---

## 模版 2：執行落地單 (Execution / Coding / Delivering)
* **適用情境**：已有明確規格與 allowedFiles 限制，指派代理進行功能開發、bug 修復、或單元測試代碼實作。

```markdown
```markdown
代號：[指派代理代號，如 007]；模型：[建議執行模型，如 Gemini 3.5 Flash]

### 任務
[TASK-XXXX] [執行/落地] 實作 [功能名稱] 核心邏輯

### Repo
[C:\Users\User\3KLife 或 C:\Users\User\AI-Atomic-Framework]

### 背景白話
前置的規劃與 allowedFiles 已經確認。現在需要你動手把 [功能名稱] 的核心邏輯與對應的 validator 寫出來，並確保能通過所有本機自動化驗證。

### 請做
請在嚴格的 `allowedFiles` 限制下進行代碼修改：
1. `[修改路徑 1]` — 實作 [某 class / function]
2. `[修改路徑 2]` — 新增/修改對應的 validator/test 檔案

## Context Map 4 層
### Primary (直接改)
- `[修改路徑 1]` — 實作主要業務邏輯。
### Secondary (受波及預警)
- `[相關參考路徑]` — 受 [修改路徑 1] 修改引用的關聯型別。
### Test Coverage
- `[測試路徑]` — 負責驗證本次實作。
### Patterns to Follow
- 參考 `[已存在的成熟檔案路徑]` 的寫法與代碼風格。

### 請回報
請以 7-8 段格式回報：
1. 路線選擇與實作細節。
2. atom_id 登記狀況（若有）。
3. 測試 case 列表。
4. 本機 validators 是否全綠 (yes/no)。
5. 產出的 commit SHA 與 commit 數量。
6. 是否有發生 scope drift 或設計取捨？
7. 是否確認沒有繞過 git hooks 驗證？

### 禁止
- 絕對禁止使用 `--no-verify` 或 `--force` 進行提交。
- 絕對禁止修改 allowedFiles 以外的檔案，發現 scope 不符請立即停手回報。
- 絕對禁止順手重構無關的底層公用邏輯。

### 大白話補一句
照著既有範本的風格，把這兩個檔的邏輯寫得乾乾淨淨，跑完測試全綠就收工！
```
```

---

## 模版 3：Scope Audit 與分袋單 (Scope-locking / Task Slicing)
* **適用情境**：新任務進場，需要先鎖定受影響的檔案範疇、釐清相依性、拆解 dual-agent (雙代理) 工作流並規劃 AllowedFiles 嚴格白名單。

```markdown
```markdown
代號：[指派代理代號，如 005]；模型：[建議執行模型]

### 任務
[TASK-XXXX] [規劃/分袋] 進行 [新任務名稱] 的 Scope Audit 與雙代理工作流拆解

### Repo
C:\Users\User\3KLife

### 背景白話
我們收到了一個新任務 [任務名稱]，但直接動手開發容易引發 scope drift 與檔案污染。我們需要你先進行 scope 盤點與分析，並把任務拆解成安全的 Phase 0 (開卡) 與 Phase 1 (實作) 雙代理流程。

### 請做
1. 靜態分析與盤點 [任務名稱] 實作時「真正需要修改」的最小檔案集合。
2. 設計並產出 Phase 0 代理的 allowedFiles（嚴格限於 task.md 與 ledger shard JSON）。
3. 設計並產出 Phase 1 代理的 allowedFiles（限於 AAF 或 target_repo 真實要改的 source 與 evidence 檔案）。
4. 規劃專屬的 `Validator` 命令與 `Rollback` 復原方案。

### 請回報
1. 本次任務的最小 AllowedFiles 檔案白名單。
2. 建議的雙代理拆分方案（Phase 0 與 Phase 1 的 allowedFiles 規劃）。
3. 預計使用的 validator 測試指令與 rollback 說明。

### 禁止
- 絕對禁止修改任何業務程式碼 (本任務為純規劃與 audit)。
- 絕對禁止將規劃範圍擴大至不相干的 repo 或目錄。

### 大白話補一句
在大家動手寫程式之前，先把界線畫得清清楚楚，不要讓不該被改的檔案沾到髒污！
```
```

---

## 模版 4：文件與 Checklist 單 (Documentation / Shard Registry)
* **適用情境**：針對大型規格書、 keep 記憶文檔、Ledger shard 進行內容整併、索引重建、或任務卡 required-adjustment 補正。

```markdown
```markdown
代號：[指派代理代號，如 001]；模型：[建議執行模型]

### 任務
[TASK-XXXX] [文件/整理] 整併與更新 [某規格書/Keep分片/Ledger] 內容

### Repo
[C:\Users\User\3KLife 或 C:\Users\User\AI-Atomic-Framework]

### 背景白話
隨著開發決策的演進，我們的 [某文件/Keep分片/Ledger] 需要同步更新，以確保團隊記憶與最新的實務共識一致，避免後續代理讀到過期資訊。

### 請做
1. 讀取並分析最新共識來源：`[共識檔案路徑]`。
2. 更新目標文件分片：`[目標更新路徑]`，確保其採用台灣開發術語與繁體中文。
3. 若修改了 Keep 分片，請執行索引重建命令：
   `node tools_node/shard-manager.js rebuild-index docs/keep-shards`
4. 執行編碼防護檢查，確保文件沒有 UTF-8 BOM 或 FFFD mojibake 損壞。

### 請回報
1. 新增/修改的文件區段摘要。
2. 索引重建與編碼檢查的驗證結果 (PASS/FAIL)。
3. 更新後的 commit 訊息與狀態。

### 禁止
- 絕對禁止在文件修改中混入任何業務代碼修改。
- 絕對禁止使用非繁體中文或非台灣慣用開發術語。
- 絕對禁止直接將整份大檔灌入 prompt 中，必須按 shard 處理。

### 大白話補一句
把我們新講好的共識跟規則，整整齊齊地寫進手冊裡，別讓下一棒被舊規格坑了！
```
```
