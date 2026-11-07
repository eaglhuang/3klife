# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.6 數值架構底層（1/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.6 數值架構底層（1/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.6 6. 數值、架構與底層支援 (Formula, Architecture & Backend) · 第 1/4 段

> 涵蓋核心數值公式 (FormulaSystem)、數據結構規範、同步與斷線重連、熱更新、戰鬥數據管線 (GDP) 與 NPC 敘事大腦。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **DS-01** | M1 | Root Save 外殼：Player_ID/Save_Version/Last_Sync_Hash/Data/Action_Records 型別與讀寫 | data | 2 | ✅ 已驗收 | - | 存檔 round-trip 後五個頂層欄位完整保留且有單元測試 | [v6 核對 2026-10-14] Root Save 外殼與 semver 版號、遷移鏈、規格 envelope（578e8cc5，PROG-2-0334）；SaveVersion 呼叫端與測試 |  |
| **DS-02** | M1 | General 主結構欄位落地（Template_ID/Phase/Talent_Stats/Prowess_Stats/Genes/Ancestors_JSON/Profile_Presentation 等） | data | 3 | 🟢 已接線 | DS-01 | GeneralUnit 型別與 22 核心欄位契約、Talent/Prowess 雙軌制定案 | 已由 doc_spec_0320 確立 22 核心欄位契約、Talent/Prowess 雙軌制與 7 階段生命週期狀態機 | [v17.4 更正 2026-11-07] 純邏輯→已接線；規格 doc_spec_0320 定案 |
| **DS-03** | M1 | Save_Version 遷移鏈（MigrationService，semver 逐版升級） | logic | 2 | ✅ 已驗收 | DS-01 | 載入 1.0.0 舊檔會依序跑 Migration 後標記最新版，並有測試 | [v6 核對 2026-10-14] Save_Version 遷移鏈（578e8cc5，PROG-2-0334）；SaveVersion 呼叫端與測試 |  |
| **DS-04** | M1 | Data.* 子系統掛載點骨架（培育/結緣/教官/經濟/時間/治理/大廳/日誌/他國/官職等約 25 條路徑） | data | 3 | 🟢 已接線 | DS-01 | Root Data 預設值含全部掛載路徑，缺漏欄位由 Migration 補齊 | 已由 doc_spec_0319 確立 25 條 Data.* 掛載路徑與預設結構協議 | [v17.3 更正 2026-11-07] 純邏輯→已接線；規格 doc_spec_0319 定案 |
| **DS-05** | M7 | 共用技能資料流：seed library → save overlay → battle read model（shared/skill-runtime） | logic | 4 | 🟢 已接線 | DS-02 | UI 與戰鬥只吃 read model；Learned_Tactics/Ultimates overlay 疊加 seed 後產出 battleSkillId/unlockState | shared/skill-runtime.ts；shared/skill-runtime.schema.json；tests/BattleSkillExecutor.test.ts；tests/BattleSkillSourceTranslator.test.ts；assets/resources/data/master/tactic-library.json、ultimate-definitions.json |  |
| **DS-06** | M5 | 虎符/英靈卡/出征編制/Battle_State 最小 read model 與 2-1 約束 | data | 4 | 🟢 已接線 | DS-04 | Talisman_Inventory/Spirit_*/Sortie_Loadout/Battle_State 型別與唯一性驗證（三角色不重覆、一將一符一命）皆有測試 | [v6 核對 2026-10-14] 開戰前檢查戰場狀態 read model（75f6dcee，PROG-2-0248）；出征帳本與虎符 read model 接線 |  |
| **DS-07** | M1 | 2-2 補充欄位列舉驗證（Revelation_Level、Breeding_Mode、Default_Tab、Pool_Positioning 等 34 條） | logic | 3 | 🟢 已接線 | DS-04 | 所有列舉欄位寫入非法值被驗證器拒絕，附測試 | 已由 doc_spec_0319 確立全部 34 條列舉值（Coalition_State, Reserved_Tally_Bands 等）與跨欄位邊界 | [v17.3 更正 2026-11-07] 純邏輯→已接線；規格 doc_spec_0319 定案 |
| **DS-08** | M8 | Data.Inventory_Service 統一物件庫與 Tally/Spirit projection（2-1 §11） | data | 3 | 🟢 已接線 | DS-06 | 物件庫為 canonical，兩個 projection 由其推導且不重複存真相 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **DS-09** | M11 | NPC_Memory 最小 read model（SQLite-vec 路徑、Recall_Context、MVP 只存 Template_Slot_Values） | logic | 2 | 🟡 純邏輯 | DS-04 | 離線模板選句可讀寫 Recall_Context，Player_ID 綁定且不上傳完整存檔 | assets/scripts/core/dialogue/NpcMemoryAdapter.ts（58 行，ServiceLoader/GeneralListComposite 引用）；無 SQLite-vec |  |
| **DS-10** | M1 | Action_Records 離線佇列與轉蛋 GachaDrawRecord/GachaHistoryRecord | logic | 3 | 🟢 已接線 | DS-01 | 三種轉蛋 Action 寫入佇列，getRecentPullHistory 依時間戳降序回傳 | assets/scripts/core/services/ActionLogStore.ts；LocalGachaService.ts；ui/dev/GachaDevOverlay.ts；ui/panels/ActionLogDebugPanel.ts（無測試） |  |
| **DS-11** | M11 | 客戶端 Tx_Hash 滾動雜湊鏈 | logic | 2 | ✅ 已驗收 | DS-10 | 客戶端雜湊與伺服器 fixture 一致且 64 字元 hex | 整合樹 assets/scripts/core/systems/SyncHash.ts；tests/SyncContract.test.ts（雜湊與 fixture 比對） |  |
| **DS-12** | M11 | Server 事件重演與 Session_Secret 輪換驗證流程 | server | 4 | 🟢 已接線 | DS-11 | 竄改紀錄被拒、驗證成功回傳新 Secret 並清空本機佇列 | 整合樹 server/src/sync.ts（in-memory mock store）；tests/SyncContract.test.ts；master server/src/index.ts 僅舊版 POST /sync |  |
| **DS-13** | M11 | Server 資料表 users/save_snapshots 與靜態 Config 上 CDN | server | 3 | 🟡 純邏輯 | DS-12 | 資料庫建表與讀寫通過 smoke:db，Client 登入時以版號/MD5 核對靜態 JSON | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **TERM-01** | M0 | ID 命名契約驗證器（UID/Template_ID/Bloodline_ID/Gene_ID/V_PID/SIGIL/SPIRIT_TALLY/ATM-ID） | tool | 2 | 🟡 純邏輯 | - | validate 工具對 generals/gene-dictionary/bloodline-templates 的 ID 格式違規回報錯誤 | [v11 核對 2026-10-20] IdContractValidator 報告模式，已涵蓋 gene-dictionary 與血脈模板（73c8b848）；無 src 或工具呼叫端，尚未接入 CI |  |
| **TERM-02** | M0 | 稀有度與角色分類列舉（RarityTier 五級、characterCategory、商業七色 CommercialRarityBand） | data | 2 | ✅ 已驗收 | - | 雙軸 maxStat/avg5 判定結果與門檻檔一致，七色層不回寫戰力 | [v6 核對 2026-10-14] 商業化 7 色稀有度分層接線（53f27fd7，PROG-2-0320）；CommercialRarityBand 有呼叫端與測試 |  |
| **TERM-03** | M5 | 兵源模型名詞落地欄位（General_Fame/General_Rank/Command_Capacity/City_Troops/Sortie_Troop_Pool/Unit_Troop_Cost/Current_Troops/Recruit_Regen） | data | 3 | 🟢 已接線 | - | 型別與 JSON 皆含欄位，Sortie_Troop_Pool=min(帶兵上限,城市兵源,關卡上限) 有單元測試 | [v4 核對 2026-10-13] 將階/名聲欄位與 computeCommandCapacity 帶兵上限接線（PROG-2-0231） |  |
| **TERM-04** | M10 | 人物頁分頁與槽位名詞契約（將/屬/命/技/寶/兵、Destiny_Slot、Tally_Slot、StoryDock） | ui | 2 | 🟢 已接線 | - | Default_Tab 六值與本地化對應一致，寶頁不含英靈卡/虎符槽 | assets/scripts/ui/components/GeneralDetailOverviewMapper.ts；assets/scripts/ui/components/general-detail/GeneralDetailFormatters.ts；tools_node/validate-general-detail-ui.js |  |
| **TERM-05** | M0 | 任務卡 ID 系統代碼表與卡號格式檢查 | tool | 1 | 🟢 已接線 | - | 任務卡 frontmatter 的 ID 符合 {系統}-{子系統}-{4位流水} | tools_node/sync-task-briefs-from-cards.js；docs/agent-briefs/（compute-gate 掃描，未逐項核對格式） |  |
| **TERM-06** | M11 | 資料中心名詞對應實作（DataCatalog/PersonRegistry/BloodlineGraph/SaveSerializer/DeltaPatchBuilder/DataGrowthMonitor/LoreCache） | logic | 3 | 🟢 已接線 | - | 每個名詞皆有對應類別與一則單元測試 | PersonRegistry 被 BloodlineGraph、BreedingSystem、VirtualAncestorGenerator 匯入；PROG-2-1023（#829） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **TERM-07** | M7 | 虎符 Q61~Q65 裁決欄位約束（糧耗、Set 羈絆、無冷卻、無 TallyCategory） | logic | 2 | 🟢 已接線 | TERM-03 | TALLY_GRAIN_COST 與 SET_BONUS_DEFS 為單一常數來源，schema 不含 Cooldown_Turns/TallyCategory | 虎符裁決欄位約束測試；PROG-2-0917（#758） | [v17.3 更正 2026-11-07] 純邏輯→已接線；已由 doc_spec_0313 確立出征糧耗、無冷卻約束與單一常數來源 |
| **TERM-08** | M10 | UI 字串 Key 規則 UI_{SYSTEM}_{ACTION} 與 i18n 字典 | content | 2 | ⚪ 未開始 | - | UI 文案皆經 key 查表且 key 符合命名 | [v16.4 封鎖 blocked 2026-10-27] 命名待使用者裁決 ；無（未見 UI_ 前綴字典） |  |
| **TERM-09** | M7 | 天氣/場景名詞列舉（SUNNY/RAINY/FOG/WINDY/NIGHT/THUNDER、Scene_Preset_ID、Tile_Preset_ID） | data | 1 | 🟢 已接線 | - | 列舉在 tile-buffs/戰場資料中一致 | [v6 核對 2026-10-14] 天氣 enum 改為規格六種（9e24eabd，PROG-2-0343）；名詞列舉與場景 preset 未全部核對 |  |
