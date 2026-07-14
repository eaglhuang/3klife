<!-- doc_id: doc_plan_mem_root -->
# ATM 跨專案記憶治理計畫書

## Summary

MEM（Memory Governance）是把「AI 代理的長期記憶」納入 ATM 治理的主線。現況是：3KLife 已有一套運作良好的 keep 機制（`docs/keep.md` 索引入口 + `docs/keep.summary.md` 必讀摘要 + `docs/keep-shards/` 分片 + `tools_node/shard-manager.js` 索引重建），但它是**單一專案的章節式共識**；而各家 AI 代理（Claude Code、Codex、Copilot、Gemini）各自有廠商私有的記憶目錄，教訓散落、跨專案不通、無整併紀律。

本計畫**不重新發明記憶系統**：直接以 keep 機制為底座，仿照 Claude Code 已驗證的記憶原理（索引自動載入 + 一事實一檔 + 型別分類 + 主動寫入觸發 + 定期整併 skill + 過期提醒），把 keep 擴充成跨專案、事實粒度、可整併、可巡邏的記憶治理機制。

大白話說：keep-shards 是「憲法」（章節式共識，改得慢、讀得準）；本計畫補上「工作日誌的沉澱層」（事實粒度記憶筆記，寫得快、會過期、需要定期整併），並讓兩層之間有明確的升降級通道。

本文件是 MEM 的唯一規劃真相來源。任務卡放在 `tasks/`，全部使用 `atm-task-card-authoring` 合約格式（含 extraction-first `extractionCandidates` 欄位）。

## Scope Boundary

- Planning repo: `3KLife`
- Target repo: 依卡而定——3KLife 端（目錄契約、工具、registry）target 3KLife；skill 源頭模板端 target `AI-Atomic-Framework`
- 本計畫不動各廠商私有記憶目錄（如 `~/.claude/projects/*/memory/`）；那是各代理自己的快取層，本機制是**共享層**，兩層互補不互斥

## 設計原理（仿照 Claude Code 記憶機制的六個要件）

以下每個要件先寫 Claude Code 的原型，再寫對映到 keep 機制的落地方式。

### 1. 索引自動載入，內文按需讀取

- 原型：`MEMORY.md` 每則記憶一行（連結 + 一句 hook），每個 session 只自動載入索引；hook 品質決定未來找不找得到。
- keep 對映：`docs/keep.summary.md` 已扮演此角色（必讀 33 行導流）。擴充：記憶筆記層也要有自己的一行式索引段落，掛在 summary 內，同樣受 token 預算約束。**不新增第三份主文**。

### 2. 一事實一檔，帶機器可讀 frontmatter

- 原型：`fact_*.md` / `workflow_*.md` / `feedback_*.md`，frontmatter 含 name / description / type。
- keep 對映：新增 `docs/keep-memory/` 目錄，一則教訓一個檔案。與 keep-shards 的分工：**shards 收「是什麼」（架構、規則、共識），keep-memory 收「怎麼踩過坑」（操作直覺、陷阱、修法）**。frontmatter 契約：`name` / `description` / `type` / `updated` / `repo`（跨專案歸屬）/ `status`（active | superseded | retired）。

### 3. 型別分類

- 原型：user / feedback / project / reference 四類。
- keep 對映（調整為 ATM 語境）：
  - `gotcha`：踩坑 + 確認過的解法（如 CLI 陷阱、hook 誤判）——最高優先寫入。
  - `feedback`：人類指正過的工作方式，附 Why 與 How to apply。
  - `status`：重大收口快照（lane 全清、里程碑完成），會過期、整併時優先退役。
  - `reference`：外部資源指標。
  - 既有 keep-shards 章節即「consensus」型，不搬家。

### 4. 主動寫入觸發（不等人叫）

- 原型：踩坑確認解法後；重大狀態收口時；被指正時；推翻舊記憶時（回頭改或刪）。
- keep 對映：把觸發規範寫進 skill 鏈源頭模板（atm-handoff / atm-dispatch / atm-orient），使**任何廠商**的代理在收口與交接時都被提示執行寫入判斷。
- 不寫規則（與寫入觸發同等重要）：repo 已記錄的（backlog、task card、git history）不重複寫；只對當下對話有意義的不寫；**ATM 治理事實優先進 backlog / task card，keep-memory 只收 repo 正式文件不會收的操作直覺**。

### 5. 定期整併 skill

- 原型：Claude Code 的 `consolidate-memory` skill——三階段：盤點（讀索引 + 掃每檔）→ 整併（分離耐久與過期、合併重複、修相對時間為絕對日期、刪可重查的）→ 瘦身索引（預算內、一行一則）。
- keep 對映：新 skill `atm-memory-consolidate`，源頭放 AAF `templates/skills/`（TASK-AAO-FABLE-009 教訓：改安裝副本必同步源頭模板，否則重裝洗掉），經 `integration add` 展開給各廠商。整併終點跑 `node tools_node/shard-manager.js rebuild-index`（既有工具）+ 新的記憶契約驗證。
- 升降級通道：整併時若某條 gotcha 已穩定半年以上且屬「規則」性質 → 提案升級進 keep-shards 對應章節（人審）；shards 中已過期的敘述 → 降級為 status 型記憶或退役。

### 6. 過期提醒與預算巡邏

- 原型：Claude Code 讀舊記憶時系統注入「此記憶已 N 天，可能過時，斷言前先驗證」提醒；索引有 200 行 / 25KB 硬預算。
- keep 對映：`updated` 欄位 + 巡邏工具（advisory 不阻擋）：超過門檻天數的 `status` 型記憶列入整併候選；summary 記憶索引段落超出行數預算時警告。接上 3KLife 既有 encoding guard 慣例（中文檔案防 mojibake）。

## 跨專案機制

單一 repo 的 keep 解決單一專案；跨專案靠一份輕量 registry：

- `docs/keep.registry.md`（住 3KLife，因 3KLife 是 planning/協調中樞）：每個參與 repo 一行——repo 名、keep 入口路徑、keep-memory 目錄路徑、負責 lane。
- 各 repo 自持自己的 keep 入口與 keep-memory 目錄（AAF 端英文、遵守 INV-ATM-007；3KLife 端繁中）。
- `atm-orient` skill 源頭模板加一步：偵測目前 repo → 查 registry → 導流到正確的 keep 入口。代理跨 repo 工作時不再靠猜。
- 跨 repo 通用的教訓（如 ATM CLI 操作陷阱）寫在該教訓「發生地」的 keep-memory，registry 讓其他 repo 的代理可達；不做集中式大倉（避免第二真相來源）。

## 已知現況

- `docs/keep.md` 已拆 4 分片 + summary，token 預算紀律已建立（P0 Context Budget 章）。
- `tools_node/shard-manager.js`（826 行）已有 rebuild-index 能力；本計畫工具卡**不**把記憶管理塞進它（extraction-first：新工具獨立成檔）。
- ATM 已有 `ATM_BUG_OPTIMIZATION_BACKLOG.md` 收治理缺陷——keep-memory 不與其重疊：backlog 收「框架要修什麼」，keep-memory 收「操作者怎麼避開」。
- AAF 端 skill 分發鏈已確認：`templates/skills/*.skill.md`（源頭）→ `integration add` → 各廠商安裝副本；`validate:skill-templates` 驗源頭。
- Claude Code 私有記憶（`~/.claude/projects/*/memory/`）2026-07-13 已整併過一輪，其中可共享的 ATM 操作教訓（close/claim 陷阱、雙隊長並行陷阱）是 keep-memory 的第一批遷移素材。

## Milestones

### Milestone 0：契約與目錄落地（TASK-MEM-0001）

`docs/keep-memory/` 目錄 + README 契約（frontmatter 欄位、型別定義、命名慣例、寫入/不寫觸發清單）+ 首批 3-5 則種子記憶（從 Claude Code 私有記憶遷移可共享的 ATM 操作教訓）+ `keep.summary.md` 掛索引段落。純 3KLife docs，不動工具。

### Milestone 1：工具（TASK-MEM-0002）

`tools_node/memory-manager.js`（獨立新檔，不塞 shard-manager）：`validate`（frontmatter 契約 + 型別 + updated 格式）、`rebuild-index`（重建 summary 記憶段落，一行一則）、`stale-report`（過期候選清單，advisory）。

### Milestone 2：skill 鏈（TASK-MEM-0003、TASK-MEM-0004）

- 0003：`atm-memory-consolidate` skill 源頭模板 + AAF 安裝副本（三階段整併流程 + 升降級通道 + 終點跑 memory-manager）。
- 0004：主動寫入觸發契約寫進 `atm-handoff` / `atm-dispatch` / `atm-orient` 源頭模板（收口與交接時強制執行「該寫嗎」判斷，含不寫規則）。

### Milestone 3：跨專案 registry（TASK-MEM-0005）

`docs/keep.registry.md` + 各 repo entry 規範 + `atm-orient` 模板導流步驟。

### Milestone 4：巡邏（TASK-MEM-0006）

staleness 與索引預算巡邏接入日常（advisory）：memory-manager stale-report 接 Captain 例行 patrol；summary 記憶段落預算檢查。依賴 0002。

## 驗收原則

- 每張卡 command-backed evidence；工具卡附最小回歸（validate 對壞 frontmatter 要紅）。
- 全程不建第二真相來源：索引只有 summary 一份、共識只有 shards 一份、缺陷只有 backlog 一份。
- 中文檔案全程過 encoding guard；AAF 端交付物英文（INV-ATM-007）。
- 完成定義：任一廠商代理在新 session 冷啟動，讀 summary → 按需讀 keep-memory 單檔，能在不考古 git log 的情況下避開已記錄的坑；整併 skill 跑一輪後索引仍在預算內。
