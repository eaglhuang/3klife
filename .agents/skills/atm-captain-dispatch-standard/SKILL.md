---
name: atm-captain-dispatch-standard
description: Captain 派工規範與決策手冊。當 AI 進入隊長模式或進行派工/派任務語境時，遵照這套標準，產出可供人類直接轉貼、高度結構化、符合 token 經濟且能動態適應可用 Roster 的派工單。
---

# ATM Captain Dispatch Standard (派工規範手冊)

本技能定義了 **Project Captain (專案隊長) 模式**下「如何進行高效、低耗、無損派工」的實務標準與決策框架。

---

## 1. 派工單的核心目標 (Dispatch Core Goal)

* **無損轉交**：派工單的唯一目標是將任務無損地交給下一棒代理（Subagent）或外部執行代理，讓其能**直接、無歧義地執行**。
* **嚴禁「聊天摘要」**：派工單不是對使用者的聊天回覆或敷衍的進度報告，而是一份**具備高度約束力、可直接複製貼上執行的「工作合約」**。

---

## 2. 派工決策與 Roster 適性分派原則

Project Captain 應具備宏觀的資源排程與風險控制能力。在指派任務前，必須遵守以下 Roster 分派邏輯：

### 2.1 動態 Roster 盤點 (非寫死機制)
* **不強綁特定代號**：嚴禁將派工邏輯寫死為「必須存在 001 到 007」。
* **動態指派步驟**：
  1. **盤點可用資源**：確認當前會話中可指派的 Roster 及其所搭載之模型、專長技能。
  2. **適性分派能力**：按任務需求匹配對應的 Roster。
  3. **次佳替代方案**：若缺乏特定代理（例如缺乏 007），則指派擁有相近專長或搭載高階推理模型（如 004 或主代理）的次佳角色補位。

### 2.2 典型能力角色矩陣 (Capability Reference Matrix)
下表描述的是**能力角色**，不是固定代號。若當前 roster 剛好有對應代號，可把它視為範例對照；若沒有，Captain 應按能力尋找次佳替代。

| 能力角色 | 專長定位 | 派工策略與適用情境 | 當前 roster 範例對照（若存在） |
|---|---|---|---|
| **EXEC-FAST** | 快速實作與程式交付 | 執行代碼落地、明確的 bug 修復、常規功能重構。**不做模糊的策略判斷**。 | 例如 `007` |
| **JUDGE** | 複雜推理、決策與疑點裁決 | 架構設計評估、多方案對比與 ROI 權衡、人際關係與遊戲平衡演算法裁決。 | 例如 `004` |
| **SCOPE-AUDIT** | Scope Audit 與任務分袋 | 分析 dependency、定義變更檔案白名單、拆解 dual-agent 或 review lane。 | 例如 `005` |
| **INVENTORY** | 全域 inventory 與 Reviewer 挑選 | 進行慢速的 cross-reference 掃描、stale 資源分析與 reviewer shortlist 生成。 | 例如 `006` |
| **DOC-FILLER** | 文件維護、規格整理與 Validator 補位 | 處理 large docs 的分片重建、更新 Ledger、補齊測試用 fixture 與 schema 檔案。 | 例如 `001/002/003` |
| **MINI-RO** | 唯讀盤點、行號定位、簡單 preflight | 預先讀取大檔、過濾錯誤日誌、驗證 clean checkout。**最大化 token 節省**。 | 例如 Haiku / Flash |

### 2.3 可見代號綁定規則 (Visible Roster Binding)

* 能力角色如 `EXEC-FAST`、`JUDGE`、`SCOPE-AUDIT`、`INVENTORY`、`DOC-FILLER`、`MINI-RO` 只允許作為 Captain 內部派工判斷，不得直接出現在派工單第一行的 `代號` 欄位。
* 派工單輸出給人類轉貼時，`代號` 必須使用使用者提供或當前 roster 明確存在的人類可辨識代號，例如 `001`、`002`、`003`、`004`、`005`、`006`、`007`。
* 若 Captain 使用內建便宜小代理協助自己做唯讀盤點，除非使用者明確要求轉貼給該子代理，否則不應輸出成外部派工單；只需在隊長回報中簡短說明「已由內建 gpt-5.4-mini sidecar 完成唯讀盤點」。
* 若必須輸出給內建子代理，代號應使用人類可讀格式，例如 `子代理-01`、`子代理-02`。
* 禁止使用抽象能力角色或臨時變數作為可轉貼代號，例如 `MINI-RO-A`、`JUDGE`、`EXEC-FAST`、`SCOPE-AUDIT`、`DOC-FILLER`、`INVENTORY`。
* Captain 輸出派工單前，應先完成一張「能力角色 → 人類代號」綁定表，再把綁定後的代號填入每張派工單。
* 若本輪 roster 有變動，先更新綁定表，再產出派工單。

---

### 2.4 隊長派工前 Pre-flight：小型 Read-only 先內派

Captain 每次派工前必須先做一次分流判斷，避免把很小的查詢任務外派成大工單。

**預設規則**：

1. **隊長可直接回答的小問題**：主代理直接回答，不派工。
2. **小型 read-only 查詢**：例如 route check、scope check、`git log` / `git show --stat`、`rg`、單卡 collision 查詢、單一 closure packet 快速定位，優先派 **1-3 個內建 `gpt-5.4-mini` 子代理**平行查；`2 個` 只是常見預設，不是固定變數。不要優先外派到 001-007。
3. **中大型 read-only 盤點**：跨多 repo、大量檔案、需要長時間 inventory，才考慮 `006` 或外部 read-only 工單。
4. **複雜審核 / scope audit / 架構裁決**：交給 `004` / `005` 或外部 AI，因為這類任務需要獨立判斷與可追溯審核。
5. **實作 / claim / commit / close**：交給最適合的外部執行代理，例如 `007`，或依 roster 現況分配。

**內建子代理命名**：

* 對內可稱 `子代理-01`、`子代理-02`、`子代理-03`；實際數量由 Captain 依面向數、獨立性、token 與 wall time 斟酌。
* 若只是 Captain 自己用來查證，不輸出成可轉貼派工單；回報時只簡短寫「已由 N 個 `gpt-5.4-mini` 子代理完成 read-only 查證」。
* 若使用者要求可轉貼內容，才輸出子代理派工單，且第一行使用 `代號：子代理-01` 這種人類可讀代號。

**外部 AI 的保留用途**：

* 需要複雜審核驗證。
* 需要與 Captain 子代理平行進行其他工作。
* Captain 內建子代理已用光或不適合。
* 需要實作面工單、claim、commit、close、PR 或跨工具執行。

大白話：小查詢先用隊長自己的便宜小兵，派幾個看問題有幾個獨立面向；外部 AI 留給重審、實作、或真的需要多線並行的戰場。

---

## 3. Token 經濟與節省規範 (Context & Token Economics)

為了避免 context 爆炸與重複資訊造成的 token 浪費，Project Captain 必須遵循以下「唯讀與單一故事線」原則：

* **一事一單**：一張派工單只做一件核心的主事。嚴禁混單（例如將「分析現況」、「代碼落地」與「事後複審」塞進同一張單）。
* **唯讀優先，但小事不外派**：在尚未完全摸清 code diff 或 scope 之前，預設指派廉價代理進行唯讀盤點（grep/行號/Preflight）；若範圍很小，優先使用 1-3 個內建 `gpt-5.4-mini` 子代理，不要消耗外部 roster。
* **可直接轉貼**：派工單必須獨立在專屬的 Markdown Code Block 中，不含多餘的開場白與寒暄，方便使用者「一鍵複製」轉貼。
* **減少散文與冗詞**：使用條列式、表格與指令結構。避免長篇大論的文字描述。
* **固定欄位結構**：依循標準派工單欄位，排除與該次任務無關的資訊。
* **避免背景資訊重複**：不要在派工單中重複黏貼大型 `README`、`keep.md` 或無關的專案背景，僅提供任務執行必需的 minimum context。
* **保留 rosters 記憶**：隊長應維持一份「本輪 roster 綁定表」，記錄每個人類代號當前對應的能力角色與任務，方便後續接球與交接，不要把記憶藏在散亂聊天裡。

---

## 4. 派工單標準欄位規格 (Standard Fields Specification)

Project Captain 輸出的每一份派工單，**必須**精確包含以下 8 個欄位，缺一不可：

1. **第一行回報格式**：
   * **格式**：`回報第一行必須是：代號：<人類 roster 代號>；模型：<實際執行模型>`
   * **目的**：強制執行者於首輪釐清自身定位與模型能力。
   * **硬規則**：這一行**必須是整份派工單的第一行**，且必須完整寫成 `回報第一行必須是：代號：<人類 roster 代號>；模型：<實際執行模型>`，不可刪除、不可延後到第二段。
   * **硬規則**：`<人類 roster 代號>` 必須使用使用者提供的代號，例如 `001` 到 `007`。
   * **硬規則**：不得使用 Captain 內部能力角色名稱，例如 `MINI-RO`、`JUDGE`、`EXEC-FAST`。
   * **硬規則**：若派給內建便宜子代理，必須使用 `子代理-01` 這類人類可讀代號，不得使用抽象變數。
   * **目的補充**：Captain 應能只看第一行就知道「這張單派給誰、現在是不是正確的人接球」。
2. **任務 (Task ID & Title)**：
   * **格式**：`[TASK-XXXX] <簡明任務名稱>`
   * **說明**：必須包含明確的 Task ID，且已於 ledger 完成查重。
3. **Repo**：
   * **格式**：指出工作目標專案（如 `C:\Users\User\3KLife` 或 `AI-Atomic-Framework`）。
4. **背景白話 (Context Summary)**：
   * **說明**：用 2-3 句最精簡、非技術性的白話文解釋「為什麼要做這個」。
5. **請做 (Scope of Work / AllowedFiles)**：
   * **硬規則**：Context Map 是**風險型必填欄位**，不是所有派工單都無腦必填。若本單具有 scope drift 風險，`### 請做` 欄位**必須先包含 Context Map 4 層**，不得只用一般 `allowedFiles` 清單替代。
   * **必填情境**：跨 repo；Phase 1 實作；source / evidence / ledger / release / artifact 任兩類同時出現；claim / close / commit / PR；cleanup / reconciliation；scope audit / 分袋；或 Captain 判斷存在 scope drift 風險。
   * **可省略情境**：純問答、單一 task id collision check、單一 route check、1-2 個明確檔案的小型 read-only 查詢、或純 Phase 0 例行開卡且只限 task card + ledger/shard。
   * **固定格式**：
     ```text
     ── Context Map ──
     Primary（直接改 / 直接查）：
       - <檔路徑> — <為何改或為何查>
     Secondary（可能波及，預警 scope drift）：
       - <相關檔> — <關係：型別引用 / hook 驗證 / CI 鏈接 / 污染風險>
     Test Coverage：
       - <test 或 validator 檔> — <測什麼>；若無 → 標「新建 validator 即代測試」或「只讀查證，無測試」
     Patterns to Follow（精確 reference 路徑）：
       - 沿用 <具體檔路徑> (TASK-AAO-XXXX) 的 <什麼風格>
     ```
   * **檔案數提示**：`allowedFiles` 或檢查目標超過 2 個時，通常應使用 Context Map；但最終判準是風險面向，不是單純檔案數。
   * **禁止**：不得把 Context Map 放到「背景白話」或「補充引用」裡假裝完成；不得只寫「沿用既有 Context Map」而沒有列出本輪 Primary / Secondary / Test Coverage / Patterns。
   * **目的**：讓派工單的 scope 邊界直接長在欄位格式裡，而不是靠隊長臨場記得。
6. **請回報 (Deliverables & Return Format)**：
   * **格式**：必須使用固定編號條列回報，先結論、再變更、再驗證、再狀態、再風險、再下一步、最後補一句大白話；不得寫成散文，也不得跳項。若是只讀任務，也要照這個順序回報，只是把變更欄位縮成觀察摘要。
7. **禁止 (Invariants / Constraints)**：
   * **說明**：明文列出本次執行絕對禁止的行為（如：嚴禁 status mirror、嚴禁動無關檔案、嚴禁順手重構等）。
8. **大白話補一句 (One-line Takeaway)**：
   * **說明**：用一句極度直白、口語的台灣話，戳中這個任務最關鍵的靈魂或防雷提示。

### 4.1 派工前綁定表（Roster Binding Snapshot）

Captain 在輸出派工單前，應先維護一份簡短的「能力角色 → 人類 roster 代號」綁定表。這張表是**隊長內部記憶**，用來記錄誰現在做什麼，不是外部派工單本體。

建議格式：

| 人類代號 | 能力角色 | 模型 | 當前任務 |
|---|---|---|---|
| `001` | `DOC-FILLER` | `gpt-5.4-mini` | 文件 / ledger / checklist |
| `002` | `VALIDATOR` | `gpt-5.4-mini` | validator / CI / failure triage |
| `003` | `DOC-FILLER` | `gpt-5.4-mini` | PR body / handoff / 摘要 |
| `004` | `JUDGE` | `gpt-5.4` | 架構裁決 / 路線判斷 |
| `005` | `SCOPE-AUDIT` | `gpt-5.4-mini` | scope audit / 分袋 |
| `006` | `INVENTORY` | `gpt-5.4-mini` | 慢速 inventory / 抽查 |
| `007` | `EXEC-FAST` | `Gemini 3.5 Flash` | 快速執行 / worktree / PR 預備 |
| `子代理-01` | `MINI-RO` | `gpt-5.4-mini` | 隊長內建唯讀 sidecar |

若 roster 有變動，只更新這張表，不要把內部能力角色直接寫進對外派工單第一行。

---

## 5. 臨界點：什麼情況下不適合派工？

Project Captain 應避免過度派工。若符合以下情況，應直接由主代理當下執行，不應開單派工：
1. **自己已能直接回答的小問題**：如單純的規格查詢、代碼釋義或名詞解釋。
2. **不值得拆解的極小操作**：如修改一個變數 typo、跑一次簡單的 git command 或查看單一檔案。
3. **缺少前置判斷的高風險任務**：如果當前 dependency 不清、scope 嚴重漂移，派工只會造成下級代理做白工。此時隊長應先指派唯讀偵察，或直接 askUser 進行疑點裁決。

---

## 6. 接線與協作指南 (Integration)

* **與 `ai-role-router` 接線**：
  * 當使用者喚醒「Project Captain/隊長/派工」模式時，主代理必須載入本 skill 作為派工格式的最高指導原則。
* **與 `atm-dispatch` 接線**：
  * 當需要生成可轉貼派工單時，主代理必須呼叫本 skill，套用標準 8 欄位規格與 token 經濟三軌分流。
* **模版調用**：
  * Captain 在起草派工單時，應參考同目錄下的 `references/dispatch-template.md`，挑選最契合當前任務屬性的模版進行實例化。
