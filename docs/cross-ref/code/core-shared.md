<!-- 分片：cross-ref-code / core-shared -->
# 代碼索引分片：Core 其他目錄與 Shared

> 入口：`docs/cross-ref/cross-ref-code.md`（doc_index_0001）。欄位說明見入口。

#### Core Models (`assets/scripts/core/models/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| TroopUnit.ts | doc_spec_0012, doc_data_0001 | D: TroopStats, TroopUnit class; C: TroopType enum |
| GeneralUnit.ts | TBD_DOC_IDS（scan-required） | D: `GeneralConfig`, `GeneralUnit` class；`historicalAnecdote / bloodlineRumor / storyStripCells / crestHint / crestState` 欄位契約待 crossref-progress-scanner 補全 |
| AIPopulationConfig.ts | doc_tech_0009 §2.6 | D: AI 陣營人口管控設定介面（讀 ai-population-config.json）|
| FamilyBranchSummary.ts | doc_tech_0009 §2.6 | D: 已滅絕支系壓縮摘要（BranchCompactor 產出）|
| GeneralLifecycle.ts | doc_tech_0009 §2.6 | D/F: 武將資料生命週期分類 A/B/C/D |
| PersonRegistry.ts | doc_spec_0011, doc_tech_0009 | D: 扁平化血統樹 PersonRecord + BloodlineLink 邊表 |
| SpiritCard.ts | doc_tech_0009 | D: 已故武將魂卡快照（GeneralArchiver 建立）|
| BreedingRecordSchema.ts | doc_spec_0028 | 概: 結緣會話、子嗣的本機端與 Server 端紀錄格式（純邏輯，不依賴 cc） |
| DataSchemaEnumRules.ts | doc_tech_0013 | 概: §2-2 補充欄位中可機械驗證的列舉與跨欄位規則（純邏輯，不依賴 cc） |
| GachaConfig.ts | 未登錄：程式規格書.md §3.3 | 概: @spec-source → 程式規格書.md §3.3 |
| GeneObject.ts | doc_spec_0008, doc_spec_0016 | 概: 遺傳因子槽的結構、驗證與序列化（純邏輯，不依賴 cc） |
| GeneralGrowth.ts | doc_spec_0016, doc_spec_0018 | 概: 六色屬性依年齡階段修正（純邏輯，不依賴 cc） |
| GeneralMainSchema.ts | doc_tech_0013 | 概: 武將主結構（規格用語）的欄位契約與列舉驗證（純邏輯，不依賴 cc） |
| GeneralRole.ts | doc_spec_0008, doc_spec_0016 | 概: 職能雙軌分流（純邏輯，不依賴 cc） |
| GeneralSchema.ts | doc_spec_0008, doc_spec_0016 | 概: 武將最小資料結構驗證（純邏輯，不依賴 cc） |
| GeneralTitle.ts | doc_spec_0016 | 概: 稱號顯示格式與同名辨識（純邏輯，不依賴 cc） |
| GeneralVersion.ts | doc_spec_0005, doc_spec_0016 | 概: 同名武將版本表（SAME-01 / PROG-2-0422） |
| HeroBase.ts | 未登錄：程式規格書.md §3.1 | 概: @spec-source → 程式規格書.md §3.1 |
| MentorCard.ts | doc_spec_0027 | 概: MentorCard.ts |
| MentorSupportSchema.ts | doc_spec_0027 | 概: 教官支援卡（SUP_*）資料結構與解析（純邏輯，不依賴 cc） |
| SoulTransfer.ts | doc_spec_0005 | 概: 同名武將死亡後的戰魂寄宿（純邏輯，不依賴 cc） |
| SupportCardBase.ts | 未登錄：程式規格書.md §3.2 | 概: @spec-source → 程式規格書.md §3.2 |
| TigerTallyCard.ts | doc_spec_0012 | 概: （無檔頭說明） |

#### Shared Contracts (`shared/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| skill-runtime.ts | doc_spec_0038, doc_spec_0030, doc_tech_0013 | D: `SkillSourceType`, `BattleSkillTargetMode`, `BattleSkillTiming`, `TacticModuleType`, `UltimateEffectFamily`, `BattleSkillRequest`, `BattleSkillDefinitionDraft`, `SkillExecutionResult`；概: 戰法 / 奧義共用 runtime contract draft |
| protocols.ts | doc_tech_0013 | D: `ActionRecord`, `SyncRequest`, `SyncResponse` |

#### Core Data (`assets/scripts/core/data/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleBindData.ts | doc_ui_0001, BattleScene layouts | D: BattleStateData, UnitDisplayData, TallyUnitData, BattleActionData, BattleLogData; 概: BattleScene 動態 label 的 ViewModel 契約（DATA-1-0001，2026-04-05）|

#### Core Config (`assets/scripts/core/config/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| Constants.ts | doc_data_0001, doc_spec_0012 | D: TurnPhase, Faction, TroopType, TerrainType, StatusEffect; C: GAME_CONFIG, TROOP_COUNTER_MAP, TROOP_DEPLOY_COST, SP_PER_KILL |
| UIConfig.ts | doc_ui_0027, doc_ui_0001, doc_spec_0002, doc_spec_0014 | D: UIID, LayerType; C: UIConfig 映射表 |
| UnitAssetCatalog.ts | doc_art_0003 | D: TroopUnitAssetEntry, HeroUnitAssetEntry; C: TROOP_UNIT_ASSET_CATALOG, HERO_UNIT_ASSET_CATALOG |
| VfxEffectConfig.ts | doc_tech_0015 | D: VfxEffectDef; C: DEFAULT_VFX_EFFECTS |
| CampaignStages.ts | doc_spec_0045 | 概: 全球征途三階段的列舉預留（純資料，不依賴 cc） |
| NumericalConfig.ts | doc_spec_0180 | 概: 數值常數集中化（NUM-04）：對應 assets/resources/data/numerical-config.json。 |
| OpeningFlowConfig.ts | doc_task_0153 | 概: @spec-source → PROG-2-0109 OPEN-01；docs/tasks/prog-opening-flow-tasks… |
| TallyCardCatalog.ts | doc_spec_0045 | 概: 虎符卡片目錄（不依賴 cc） |
| TerrainConfig.ts | doc_spec_0044 | 概: 地形修正值（REV-02）：對應 assets/resources/data/terrain.json。 |
| TigerTallySpecTactics.ts | doc_spec_0012 | 概: 虎符特殊戰法對照表（PROG-2-0928，TRP-15） |

#### Core Utils (`assets/scripts/core/utils/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| MaterialUtils.ts | doc_index_0011 §7 棄用 API 管理 | 概: setMaterialSafe wrapper |
| ParticleUtils.ts | doc_tech_0015 | D: ParticleOverride; F: applyParticleOverride |
| RarityResolver.ts | doc_tech_0009 §3.3 | F: maxStat / avg5 雙軸解析 rarityTier |
| CommercialRarityBand.ts | doc_spec_0008 | 概: 商業化 7 色稀有度分層（純邏輯，不依賴 cc） |
| UCUFLogger.ts | doc_ui_0026 | 概: UCUF 統一日誌系統 |

#### Core Managers (`assets/scripts/core/managers/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| GameSession.ts | doc_spec_0026, doc_spec_0027, doc_spec_0028 | 概: `learnTactic()` 擋 `NOT_GRADUATING`（未完成培育）與 `NOT_INSPIRED`（未觸發靈感）；入學需至少 1 位教官（PROG-2-1134）|
| GameManager.ts | doc_spec_0045 | D: GameMode enum; 概: 遊戲模式切換 |
| ServiceLoader.ts | doc_tech_0015 | 概: DI 容器（9+ 服務註冊） |
| UIManager.ts | doc_ui_0027, doc_ui_0001 | 概: 六層 UI 生命週期管理 |
| SceneManager.ts | doc_spec_0031 | 概: A→Loading→B 場景切換；新增 `boardRenderer` 視圖橋（registerBoardRenderer / getBoardRenderer），供 BattleScene ↔ UI 跨組件查詢 |

#### Core Storage (`assets/scripts/core/storage/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| DataStorageAdapter.ts | doc_tech_0009 | 概: 儲存後端抽象層（IndexedDB / SQLite 統一介面）|
| IndexedDbAdapter.ts | doc_tech_0009 | 概: DataStorageAdapter 的 Web 平台 IndexedDB 實作 |
| SqliteAdapter.ts | doc_tech_0009 | 概: DataStorageAdapter 的 Native 平台 SQLite stub |
| DataCatalog.ts | doc_tech_0009 | 概: L0 資料目錄，啟動時載入 generals-index.json |
| DataPageLoader.ts | doc_tech_0009 | 概: 分頁查詢器，L1–L5 分層載入 |
| GeneralSearch.ts | doc_tech_0009 | 概: 武將全文搜索（IndexedDB 查詢 + JS 過濾）|
| SchemaMigration.ts | doc_tech_0009 | 已退役（PROG-2-1373）：與 SaveVersion 重複，存檔遷移改用 SaveVersion |
| DataMounts.ts | doc_tech_0013 | 概: Root Save 的 `Data.*` 頂層掛載點骨架（純邏輯，不依賴 cc） |
| MemoryStorageAdapter.ts | doc_tech_0013 | 概: 記憶體版 DataStorageAdapter |
| SaveVersion.ts | doc_tech_0012, doc_tech_0013 | 概: 存檔的 semver 版號、逐版遷移鏈與規格 envelope（純邏輯，不依賴 cc） |

#### Core Services (`assets/scripts/core/services/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| SaveSerializer.ts | doc_tech_0009 | 概: 存檔序列化 + 壓縮管線（欄位縮寫 → Msgpack → Gzip）|
| GeneralArchiver.ts | doc_tech_0009 | 概: 武將資料封存服務（DataStorageAdapter 注入）|
| BattleLogArchiver.ts | doc_tech_0009 | 概: 戰鬥日誌封存服務 |
| DataGrowthMonitor.ts | doc_tech_0009 | 概: 資料成長量監控 |
| DataLifecycleScheduler.ts | doc_tech_0009 | 概: 資料生命週期排程（老舊資料清理）|
| DeltaPatchBuilder.ts | doc_tech_0009 | 概: 增量更新補丁產生器 |
| PendingDeleteStore.ts | doc_tech_0009 | 概: 待刪除資料暫存（軟刪除機制）|
| SeasonalRollup.ts | doc_tech_0009 | 概: 季度數據彙整 |
| BloodlineGraph.ts | doc_spec_0011 §E, doc_spec_0028 §K | 概: 祖先查詢、14 人祖譜、共同祖先距離、子嗣登記 |
| BranchCompactor.ts | doc_tech_0009 §2.6 | 概: 已滅絕支系壓縮（年底由 DataLifecycleScheduler 觸發）|
| BreedingQuotaEnforcer.ts | doc_tech_0009 §2.6 | 概: AI 繁殖配額（IBreedingGate hook、支系與全局人口預算）|
| ActionLogStore.ts | doc_tech_0013 | 概: （無檔頭說明） |
| BreedingService.ts | doc_spec_0028 | 概: 結緣與名冊 / 血統圖的接線（純邏輯，不依賴 cc） |
| GachaWalletRules.ts | doc_spec_0042 | 概: 轉蛋扣款規則（純邏輯，不依賴 cc） |
| LeadGeneralSelectRules.ts | doc_spec_0045 | 概: 大廳「選主將」清單分頁（純邏輯，不依賴 cc） |
| LegacyService.ts | doc_spec_0018, doc_spec_0027 | 概: 退役、死亡歸檔與季結資料生命週期的接線（純邏輯，不依賴 cc） |
| LocalGachaService.ts | doc_spec_0042 | 概: 轉蛋的存放處（保底表與錢包，由呼叫端接到存檔）；沒有時只存在記憶體中，例如載入畫面的預覽服務。 |
| NpcDialogueService.ts | doc_spec_0176 | 概: （無檔頭說明） |
| NurtureService.ts | doc_spec_0026, doc_spec_0027 | 概: 培育會話管理與名冊接線（純邏輯，不依賴 cc） |
| PlayerDeckRules.ts | doc_spec_0045 | 概: 玩家出戰卡組的純規則（不依賴 cc） |
| PlayerRosterService.ts | doc_spec_0016, doc_spec_0045 | 概: （無檔頭說明） |
| PlayerSaveService.ts | doc_spec_0034, doc_tech_0013 | 概: 玩家長局存檔快照（純邏輯，不依賴 cc） |
| PlayerSaveTableRows.ts | doc_tech_0013, doc_spec_0045 | 概: 存檔快照 → 六表列的映射與驗證（MVP-12，PROG-2-0880，純 TS，不連線） |
| StarterRosterService.ts | doc_spec_0031 | 概: @spec-source → 新手開場規格書.md §6、§7.2、§8 |
| UnveilingService.ts | doc_spec_0043 | 概: 宿命分流的玩家選擇（純邏輯，不依賴 cc） |

#### Core Serialization (`assets/scripts/core/serialization/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| GzipCodec.ts | doc_tech_0009 | 概: Gzip 壓縮/解壓編解碼器 |
| MsgpackCodec.ts | doc_tech_0009 | 概: MessagePack 序列化編解碼器 |

#### Core / Dialogue (`assets/scripts/core/dialogue/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| NpcMemoryAdapter.ts | doc_spec_0176, doc_spec_0177 | 概: （無檔頭說明） |

#### Shared (`assets/scripts/shared/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleEntryParams.ts | doc_index_0007 | 概: 統一的戰場入口參數。 |
| BattleSkillPresentation.ts | doc_spec_0038, doc_ui_0001 | 概: （無檔頭說明） |
| CommonEnums.ts | doc_spec_0040, doc_tech_0015 | 概: 全域共享的基礎列舉 |
| SkillRuntimeContract.ts | doc_spec_0038, doc_spec_0030 | 概: Shared skill runtime draft contracts. |
| TallyCardContract.ts | doc_spec_0012 | 概: 虎符適性資料（TRP-13，全部選填；缺的欄位用預設：地形 B、無家族、無性別偏好、無史實羈絆）。 |

#### Shared / Interfaces (`assets/scripts/shared/interfaces/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| IBattleUIComponents.ts | doc_ui_0001 | 概: 戰場相關 UI 元件的抽象介面集合，用於解除 Battle 模組對 UI 具體實作的依賴。 |
| IUIInterfaces.ts | doc_ui_0049 | 概: 通用 UI 管理介面，用於解除 Core 對 UI 具體實作的依賴。 |
