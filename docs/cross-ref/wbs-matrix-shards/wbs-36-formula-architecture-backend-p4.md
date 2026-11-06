# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.6 數值架構底層（4/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.6 數值架構底層（4/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.6 6. 數值、架構與底層支援 (Formula, Architecture & Backend) · 第 4/4 段

> 續上段（表頭重複）。工作包 BRAIN-09 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **BRAIN-09** | M11 | LLM Provider Router 與多層 Fallback（C-4/G-3） | server | 4 | ⚪ 未開始 | BRAIN-08 | deterministic/gemini/local_llama/vllm 依 NPC_LLM_PROVIDER_ORDER 切換並寫 providerTrace | 無實作 |  |
| **BRAIN-10** | M11 | 對話/情境/關鍵字 API（F-2~F-4）與 Prompt 組裝（G） | server | 3 | ⚪ 未開始 | BRAIN-09, BRAIN-05 | /v1/npc/context-options、keyword-options、dialogue 回應含 providerTrace/fallbackUsed/qualityWarnings | Cocos 端已呼叫這些路徑（NpcDialogueService.ts:147,156,186），但伺服器端不在 repo |  |
| **BRAIN-11** | M11 | 互動記憶 API M1-M4 與 M5 壓縮（F-6/C-6） | server | 4 | ⚪ 未開始 | BRAIN-10 | interaction-events/general-memory/memory/compress 可讀寫，四段全空時省略 playerGeneralMemory | server 端不在 repo；僅 docs/tech/npc-brain-memory/ 規格 |  |
| **BRAIN-12** | M10 | Cocos NpcDialogueService 與 GeneralList 對話測試入口（H/H-1） | ui | 3 | 🟢 已接線 | BRAIN-10 | 選武將才拉 keyword、按鈕才 POST dialogue、debug 顯示 evidenceRefs/fallbackUsed，並有單測與 mock server 驗收 | assets/scripts/core/services/NpcDialogueService.ts（274行，含 6 個 /v1/npc 呼叫）、ui/components/GeneralListComposite.ts；tests 無 NpcDialogueService 測試 |  |
| **BRAIN-13** | M11 | Cocos 互動記憶 adapter（M6）與事件回寫 | logic | 2 | 🟡 純邏輯 | BRAIN-11, BRAIN-12 | 對話完成後事件經 NpcMemoryAdapter 回寫 interaction-events | assets/scripts/core/dialogue/NpcMemoryAdapter.ts（58行），未見測試與全域事件系統接線 |  |
| **BRAIN-14** | M11 | SQLite-vec 離線降級、dialogue/stream、vLLM（後續階段，J/L-9） | server | 5 | ⚪ 未開始 | BRAIN-10 | 離線時可用 SQLite-vec 檢索；SSE 串流可用 | 規格標示第二階段；無實作 |  |
| **NPC-01** | M10 | Persona Card 資料 schema 與核心武將資料（I-1） | data | 3 | 🟡 純邏輯 | - | 核心武將 persona card 含 Core_Traits/Voice_Style/Relationship_Anchors/Safe_Fallback_Line/Golden_Lines 並過 schema 驗證 | [v7 核對 2026-10-14] NpcPersonaCard 資料結構與結構驗證（c34bd866，PROG-2-0461）與測試；無 src 呼叫端 |  |
| **NPC-02** | M10 | Context Option 情境鍵清單（長坂橋、桃園結義等） | data | 1 | ⚪ 未開始 | NPC-01 | 每位核心武將至少 3 個 contextKey 可由本地資料取得 | 無本地情境資料（僅透過中台 API 取得） |  |
| **NPC-03** | M6 | Offline Template Engine（STATIC_TEMPLATE slot filling） | logic | 3 | 🟡 純邏輯 | NPC-01 | 無中台時依模板與 slot 輸出 20~60 字台詞 | [v7 核對 2026-10-14] OfflineTemplateEngine 離線模板台詞引擎（28a43022，PROG-2-0462）與測試；PR #300 已併入；無 src 呼叫端 |  |
| **NPC-04** | M9 | Journal Reaction 日誌/晨報/派遣反應 | logic | 3 | ⚪ 未開始 | NPC-03 | 晨報與派遣結果可生成一句個性化反應 | grep Journal 在 assets 無結果（武將日誌系統亦未實作） |  |
| **NPC-05** | M9 | Utility AI 行為選擇與主動互動限流（F-1） | logic | 2 | 🟢 已接線 | NPC-01 | scoreNpcAction 五因子相乘，同登入窗只 1 則高權重互動 | 無實作 | 未開始→已接線；#1379 NpcUtilityAI 接 OfflineInteractionEvents |
| **NPC-06** | M10 | Personality Drift Guard（F-3） | logic | 2 | ⚪ 未開始 | NPC-01 | canAcceptGeneratedLine 檢查字數/現代語/未支持史實/toneTags，失敗回退 FALLBACK_LINE | 無實作 |  |
| **NPC-07** | M10 | Golden Line Set 與驗收樣本 | content | 2 | 🟡 純邏輯 | NPC-01 | 核心武將錨點台詞不可被覆蓋，附驗收樣本 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **NPC-08** | M11 | RAG Dialogue Hook 與 Unknown Event Capture（E-5/E-6） | logic | 3 | 🟡 純邏輯 | BRAIN-12, NPC-03 | 未命中情境寫入 Pending_Unknown_Events，連網時送中台 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **NPC-09** | M1 | NPC_Memory 本地 read model 與 UI 字串（H/I-2） | data | 2 | 🟢 已接線 | NPC-01 | Data.NPC_Memory 存讀檔，UI_NPC_* 字串入 i18n | i18n 無 UI_NPC_*；存檔無 NPC_Memory | 未開始→已接線；#1438 NpcMemoryReadModel 接 GameSession/PlayerSaveService |
| **NPC-10** | M11 | 生成結果回寫為可驗證摘要/可丟棄快取（K 節） | logic | 1 | ⚪ 未開始 | BRAIN-12 | 中台文字不直接當唯一真相，快取可清除 | 無實作 |  |
| **DS-14** | M0 | 存檔備份與壞檔自動退回上一份（讀檔失敗時退回最近一份有效備份） | logic | 3 | ✅ 已驗收 | DS-01 | 存檔寫入前保留上一份備份；主檔解析或驗證失敗時自動退回上一份並記錄；單元測試覆蓋壞檔與退回路徑 | [v14 核對 2026-10-21] 存檔備份與壞檔自動退回上一份（97217635，PROG-2-0885，#671）；PlayerSaveService 讀寫 _backupKey 並於讀檔失敗時退回，PlayerSaveBackup.test.ts 存在 |  |
