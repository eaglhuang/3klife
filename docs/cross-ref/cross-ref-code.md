<!-- doc_id: doc_index_0001 -->
# Cross-Reference: 代碼索引（代碼 ↔ 規格書 雙向映射）

> 這是 doc_index_0007 的 B 節分片。完整索引見 `docs/cross-reference-index.md (doc_index_0007)` (doc_index_0007)。
> 最後更新請參考母檔 Header。
>
> **doc_id 查詢**：用 `node tools_node/resolve-doc-id.js <搜尋詞>` 查文件代號，或瀏覽 `docs/doc-id-registry.md (doc_other_0006)` (doc_other_0006)。
> ⚠️ **壓縮版（doc_id 索引）**：中文名稱已移除，查詢名稱請用 resolve-doc-id.js。人類可讀進度 → `docs/cross-ref/cross-ref-進度.md (doc_index_0017)` (doc_index_0017)

## B. 代碼索引（代碼 ↔ 規格書 雙向映射）

### B-1. 代碼 → 規格書

> 每個 .ts 檔對應的規格書來源，標示資料結構(D) / 公式(F) / 常數(C) / 概念(概) 的引用類型。

#### Core Systems (`assets/scripts/core/systems/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| NurtureSystem.ts | doc_spec_0026, doc_spec_0027 | F/概: `inspiredTacticIds()` 取得本場教官靈感觸發戰法清單（PROG-2-1134 畢業區戰法來源）|
| TacticLearning.ts | doc_spec_0026, doc_spec_0038 | F/概: 培育戰法學習判定（`hasMatchingGreenFactor`、`learnTacticInto`、`tacticLearnThreshold`），綠因子半價（PROG-2-1132）|
| InspiredTacticMap.ts | doc_spec_0027, doc_spec_0038 | D/概: `INSPIRED_TACTIC_MAP`（17 個靈感戰法 TAC_* → 中文名＋現有 8 招戰法庫 id）、`toLibraryTacticId`、`inspiredTacticName`；戰場組槽與畢業兌換名稱共用（PROG-2-1135）；測試 `tests/InspiredTacticMap.test.ts` |
| FormulaSystem.ts | doc_data_0001, doc_spec_0012 | F: calculateDamage, getCounterMultiplier, calculateHeal, calculateGeneralAttack, getCritChance, getDodgeChance, rollCrit, rollDodge; D: DamageContext, GeneralCombatParams; C: COUNTER_MULTIPLIER, GENERAL_BASE_CRIT_CHANCE, GENERAL_MAX_CRIT_CHANCE, GENERAL_CRIT_DAMAGE_MULTIPLIER, GENERAL_BASE_DODGE_CHANCE, GENERAL_MAX_DODGE_CHANCE |
| BattleSystem.ts | doc_spec_0040, doc_data_0001 | D: TurnSnapshot, TurnPhase; C: INITIAL_DP, DP_PER_TURN, GRID_LANES, GRID_DEPTH |
| BuffSystem.ts | doc_spec_0010 | D: BuffEntry, StatusEffect; 概: 狀態效果管理 |
| ActionSystem.ts | doc_spec_0038, doc_spec_0030 | D: SkillDef, ActionStep, ActionContext; 概: 技能時間軸演出 |
| EventSystem.ts | doc_tech_0015 | 概: Pub/Sub 事件匯流排 |
| PoolSystem.ts | doc_tech_0015 | 概: 物件池回收管理 |
| ResourceManager.ts | doc_tech_0013, doc_tech_0015, doc_art_0003 | 概: JSON/Prefab/SpriteFrame 載入與快取 |
| EffectSystem.ts | doc_tech_0015 | 概: VFX 生命週期管理 |
| AudioSystem.ts | doc_tech_0015 | 概: BGM/SFX 混音管理 |
| FloatTextSystem.ts | doc_tech_0015 | D: FloatTextType; C: FLOAT_CONFIGS |
| I18nSystem.ts | doc_tech_0015, doc_art_0003 | 概: 多語系載入框架與字型目錄治理 |
| MaterialSystem.ts | doc_art_0003, doc_index_0011 §7 | D: OutfitConfig, ShaderEntry; 概: 材質實例與 Shader warmup |
| MemoryManager.ts | doc_tech_0015 | D: AssetRecord; 概: 資產追蹤與釋放 |
| CurveSystem.ts | doc_tech_0015 | 概: 非線性數值曲線（AnimationCurve 對等） |
| NetworkService.ts | doc_tech_0013 | 概: Web/Native 離線網路狀態偵測 |
| SyncManager.ts | doc_tech_0013 | 概: 離線 Action Log 佇列與 HMAC 背景同步 |
| **server/src/index.ts** | doc_tech_0013 | 概: 後端驗證引擎 (Event Replay) 原型 |
| AccelerateCard.ts | doc_spec_0032 | 概: 加速卡縮短剩餘時間（純邏輯，不依賴 cc）。 |
| AiDifficultyTable.ts | doc_data_0002 | 概: AI 難度表的解析與驗證（純邏輯，不依賴 cc） |
| AiDuelDecision.ts | doc_data_0002 | 概: 防守方是否接受單挑（純邏輯，不依賴 cc） |
| AiProfiles.ts | doc_data_0002 | 概: AI Profile 八種行為模板的解析與驗證（純邏輯，不依賴 cc） |
| AiSpCharge.ts | doc_data_0001, doc_data_0002 | 概: AI 武將擊殺充能的難度倍率（純邏輯，不依賴 cc） |
| AiStatScaling.ts | doc_data_0001, doc_data_0002 | 概: AI 武將屬性、EP、精力與轉生次數的縮放（純邏輯，不依賴 cc） |
| AncestorTreeLayout.ts | doc_ui_0012 | 概: 命頁左半區 14 人祖先圖的節點位置與 detail peek 文字（純邏輯，不依賴 cc） |
| AptitudeDialogue.ts | doc_spec_0041 | 概: 適性台詞選擇與佔位替換（純邏輯，不依賴 cc） |
| ArenaScore.ts | doc_spec_0007, doc_spec_0041 | 概: 競技場參考戰力積分（純邏輯，不依賴 cc） |
| AutoNurture.ts | doc_spec_0026 | 概: 自動培育（NUR-14，純邏輯，不依賴 cc） |
| AwakeningTitle.ts | doc_spec_0011 | 概: 覺醒名號判定（純邏輯，不依賴 cc） |
| BagDomain.ts | doc_spec_0174 | 概: 統一物件庫的顯示分域（純邏輯，不依賴 cc）。 |
| BattleAptitude.ts | doc_spec_0041, doc_data_0001 | 概: 戰場適性修正引擎（純邏輯，不依賴 cc） |
| BattleLeaderboard.ts | doc_spec_0019 | 概: 武將戰績排行榜：依傷害、擊殺或守護力排序（純邏輯，不依賴 cc） |
| BattleLeaderboardView.ts | doc_spec_0019 | 概: 戰績排行榜的列資料與文字（純邏輯，不依賴 cc）（PROG-2-0957） |
| BattleModifiers.ts | doc_spec_0012, doc_data_0001 | 概: 總戰力的地形、天氣攻防查表與虎符適性修正（純邏輯，不依賴 cc） |
| BattlePowerPrediction.ts | doc_data_0001 | 概: 雙方總戰力比值的勝率預判（純邏輯，不依賴 cc） |
| BattlePowerRating.ts | doc_data_0001 | 概: 主將帶隊總戰力 calculateBattlePowerRating（純邏輯，不依賴 cc） |
| BattleRecordStats.ts | doc_spec_0019 | 概: 武將戰績：單場表現統計、勝率、里程碑、退役評分、戰績面板資料（純邏輯，不依賴 cc） |
| BattleRetreat.ts | doc_spec_0018 | 概: 部隊撤退的擲骰結算（純邏輯，不依賴 cc） |
| BattleRoster.ts | doc_spec_0016, doc_spec_0025, doc_spec_0026, doc_spec_0045, doc_data_0001 | 概: 名冊武將出戰、戰後結算（純邏輯，不依賴 cc） |
| BattleSeasonStats.ts | doc_spec_0019 | 概: 武將賽季戰績：賽季分段累加與切換重置（純邏輯，不依賴 cc） |
| BattleSnapshot.ts | doc_spec_0019 | 概: 單場戰報快照與單場 MVP、最高傷害（純邏輯，不依賴 cc） |
| BattleSpecialActions.ts | doc_spec_0009, doc_spec_0010 | 概: 戰場「特定動作」偵測，純邏輯，不依賴 cc |
| BattlefieldRecon.ts | doc_spec_0041 | 概: 出戰前環境偵察（純邏輯，不依賴 cc） |
| BloodlineBeast.ts | doc_spec_0008, doc_spec_0011, doc_ui_0012 | 概: 命紋靈獸的資料結構與覺醒傾向判定（純邏輯，不依賴 cc） |
| BloodlineConnections.ts | doc_ui_0009 | 概: 血統樹先祖連線的幾何計算（純邏輯，不依賴 cc）。 |
| BloodlineCurve.ts | doc_ui_0009 | 概: 血統樹父子連線的貝茲曲線計算（純邏輯，不依賴 cc） |
| BloodlineGuarantee.ts | doc_spec_0026 | 概: 世家血脈保底（純邏輯，不依賴 cc） |
| BloodlineInfusion.ts | doc_spec_0005, doc_spec_0023 | 概: 血脈灌注（純邏輯，不依賴 cc） |
| BloodlineMerge.ts | doc_spec_0005 | 概: 血脈歸宗的因子移植（純邏輯，不依賴 cc） |
| BloodlineNodeCards.ts | doc_ui_0009 | 概: 血統樹 14 位先祖的節點卡資料映射（純邏輯，不依賴 cc）。 |
| BloodlineRightPanelLayout.ts | doc_spec_0022, doc_ui_0012 | 概: 命頁右半區六塊資訊欄的固定順序與英靈卡命槽操作（純邏輯，不依賴 cc） |
| BloodlineStoryDockLayout.ts | doc_ui_0012 | 概: 命頁故事抽屜（StoryDock）的三態切換與版面高度（純邏輯，不依賴 cc） |
| BloodlineTransmissionUltimate.ts | doc_ui_0012 | 概: 五階血脈傳承奧義的階段邏輯（純邏輯，不依賴 cc） |
| BloodlineTreeBinding.ts | doc_ui_0009 | 概: 把 14 張先祖卡對應到 bloodline-tree-main.json 的節點名稱（純邏輯，不依賴 cc）。 |
| BloodlineTreeSlots.ts | doc_spec_0028, doc_ui_0031 | 概: 結緣畫面 14 人血統樹的格位排列（純邏輯，不依賴 cc） |
| BloodlineUltimateRoster.ts | doc_ui_0012 | 概: 把五階血脈傳承奧義套回名冊武將的純函式（不依賴 cc） |
| BlueFactorInheritance.ts | doc_spec_0180 | 概: 藍色 3 星因子的繼承機率（純邏輯，不依賴 cc） |
| BossGuardSummon.ts | doc_spec_0049 | 概: Boss 親衛隊召喚觸發判定（WBS v7 LVL-11，PROG-2-0599） |
| BreedingBirthRecord.ts | doc_spec_0028 | 概: 結緣成功時產生本機端紀錄（BRD-12，純函式，不依賴 cc） |
| BreedingBirthRecordSave.ts | 未登錄：結緣系統-shards/shard-b.md §I；PROG-2-1146 出生 | 概: （無檔頭說明） |
| BreedingSystem.ts | doc_spec_0028, doc_spec_0045, doc_spec_0011, doc_data_0001 | 概: 結緣（配種）規則與子嗣生成（純邏輯，不依賴 cc） |
| CellarProtection.ts | doc_spec_0032 | 概: 地窖保護（純邏輯，不依賴 cc） |
| ChildFactorExpectation.ts | doc_spec_0006, doc_spec_0010 | 概: 父母因子推得子嗣的預期因子分布（純邏輯，不依賴 cc） |
| ChildMagistrate.ts | doc_spec_0037 | 概: 子嗣擔任郡城縣令的加成規則（純邏輯，不依賴 cc） |
| ChildOfficialPosts.ts | doc_spec_0037 | 概: 非培育子嗣內政職位的產出公式（純邏輯，不依賴 cc）。 |
| ChildUltimateAwaken.ts | doc_spec_0030 | 概: 子嗣奧義覺醒的機率與繼承紀錄（純邏輯，不依賴 cc） |
| CombatCrit.ts | doc_spec_0039 | 概: 暴擊判定與暴擊傷害（純邏輯，不依賴 cc） |
| ComboAttackKin.ts | doc_spec_0024 | 概: 相鄰格有義兄弟時，合攻觸發率的計算（純邏輯，不依賴 cc） |
| CountdownIconView.ts | doc_spec_0031 | 概: 主畫面趕路倒數圖示的文字與按鈕狀態（純邏輯，不依賴 cc）。 |
| CountdownManager.ts | doc_spec_0031, doc_tech_0008 | 概: 趕路倒數的純邏輯，不依賴 cc。 |
| CrestStyle.ts | doc_ui_0009 | 概: 祖紋命篆的視覺樣式解析（純邏輯，不依賴 cc）。 |
| DailyNewsEngine.ts | doc_spec_0025 | 概: 三國日報（純邏輯，不依賴 cc） |
| DailySubsidy.ts | doc_spec_0032 | 概: 每日補貼的判定與入帳（純邏輯，不依賴 cc） |
| DaughterComingOfAge.ts | doc_spec_0003 | 概: 子嗣女兒 14 歲及笄分流（純邏輯，不依賴 cc） |
| DelegateAi.ts | doc_spec_0040 | 概: 委任 AI 四級部署策略（純邏輯，不依賴 cc） |
| DesertVitality.ts | doc_spec_0041 | 概: 沙漠地形的每回合精力消耗（純邏輯，不依賴 cc） |
| DestinyGacha.ts | 未登錄：WBS v5 OPEN-05（宿命轉蛋：無限重置十連抽、初始名將鎖定與確認）；G | 概: 宿命轉蛋的純狀態機，不依賴 cc。 |
| DestinyOpening.ts | 未登錄：WBS v5 OPEN-05 接 OPEN-01（宿命轉蛋接上新手開場流程）；P | 概: 把宿命轉蛋接上開場流程控制器，純 TS，不依賴 cc。 |
| DestinyPool.ts | doc_spec_0031 | 概: 宿命轉蛋的專用六人池與接新局入口，純 TS，不依賴 cc。 |
| DestinyShop.ts | doc_spec_0042 | 概: 天命商店：大保底兌換（純邏輯，不依賴 cc） |
| DiscoveryProgress.ts | doc_spec_0009 | 概: 玩家 discoveryLevel 的經驗值與升級（純邏輯，不依賴 cc） |
| DispatchCatalog.ts | doc_spec_0015 | 概: 暫定派遣任務清單與派遣板列（JRN-03 第三段，PROG-2-1179） |
| DispatchJobs.ts | doc_spec_0015 | 概: 派遣任務狀態：派遣、到期結算、冷卻（純邏輯，不依賴 cc）。 |
| DispatchQuality.ts | doc_spec_0015 | 概: 派遣品質評分與品質區間（純邏輯，不依賴 cc）。 |
| DomesticAutoGovernance.ts | doc_spec_0037 | 概: 內政任務格的自動指派（純邏輯，不依賴 cc） |
| DomesticPresenter.ts | 未登錄：WBS v3 MVP-10 與 MVP 內政 5 大任務 UI 顯示；Domes | 概: 內政 5 大任務面板的顯示資料，純 TS，不依賴 cc。 |
| DomesticTasks.ts | doc_spec_0008, doc_spec_0032, doc_spec_0037, doc_spec_0045 | 概: 基礎內政 5 大任務（每季選一項，產出資源）純邏輯，不依賴 cc。 |
| DungeonRescue.ts | doc_spec_0151 | 概: 地下城救美任務結果（純邏輯，不依賴 cc） |
| EquipmentBonus.ts | doc_spec_0017 | 概: 裝備的品質加成範圍與合入武將面板數值（純邏輯，不依賴 cc）。 |
| EraReset.ts | doc_spec_0020, doc_spec_0034 | 概: 時代更迭觸發與保留/重置清單（純邏輯，不依賴 cc） |
| ExtremeTaskDrop.ts | doc_spec_0036 | 概: 極限任務掉落表與抽樣（純邏輯，不依賴 cc）。 |
| FactorAwakening.ts | doc_spec_0013, doc_spec_0010, doc_spec_0009 | 概: 因子覺醒（解鎖）規則，純邏輯，不依賴 cc |
| FactorHexPanel.ts | doc_spec_0031 | 概: 六色因子六角圖與解鎖特效的資料（純邏輯，不依賴 cc） |
| FactorInheritance.ts | doc_spec_0010, doc_spec_0011, doc_spec_0045 | 概: 子嗣從 14 人祖譜繼承因子（純邏輯，不依賴 cc） |
| FactorMask.ts | doc_spec_0009, doc_spec_0010 | 概: 因子視覺遮罩與發現等級（純邏輯，不依賴 cc） |
| FactorMaskState.ts | doc_spec_0009 | 概: locked 是尚不可見，並非覺醒旗標。沿用 FactorMask 的文字與未知色系規則。 |
| FactorTacticLinkage.ts | doc_spec_0010 | 概: 因子與戰法／地形的連動規則（純邏輯，不依賴 cc） |
| FactorTagTokens.ts | doc_spec_0010 | 概: 六色因子標籤的字串 key 與色碼 token（純資料，不依賴 cc） |
| FactorVisibility.ts | doc_spec_0009 | 概: 單因子的發現門檻，全專案共用這一條規則（FactorMask 與 FactorVisibility 都呼叫它）： |
| FamilyOverviewHotspot.ts | doc_spec_0002, doc_spec_0022 | 概: 世家總覽熱點與分支捷徑的顯示規則與分組（純邏輯，不依賴 cc）。 |
| FarewellLetterInbox.ts | doc_spec_0025 | 概: 傭兵告別信與收件匣（純邏輯，不依賴 cc）。 |
| FateBlessing.ts | doc_spec_0010, doc_spec_0035 | 概: 紫色因子戰場效果「天命加護」（純邏輯，不依賴 cc） |
| FatigueFailureRate.ts | doc_spec_0180 | 概: 體力比例對應的失敗率（純邏輯，不依賴 cc） |
| FemalePoolRefresh.ts | doc_spec_0131 | 概: 傭兵池女武將 8 小時刷新與抽取（純邏輯，不依賴 cc） |
| FemaleSource.ts | doc_spec_0003 | 概: 女性武將的來源與品質欄位（純邏輯，不依賴 cc） |
| FemaleSourcePresenter.ts | doc_spec_0003 | 概: 女武將資訊頁的來源標籤（純邏輯，不依賴 cc） |
| FemaleSystemState.ts | doc_spec_0151 | 概: 女性來源系統的存檔狀態（純邏輯，不依賴 cc） |
| FertilityBoost.ts | doc_spec_0036 | 概: 安胎藥的受孕率倍率（純邏輯，不依賴 cc）。 |
| FirstBattleTutorial.ts | doc_spec_0031 | 概: 首戰教學戰的提示順序（純邏輯，不依賴 cc） |
| FriendBorrow.ts | doc_spec_0027 | 概: 好友借用教官（MENT-14，純邏輯，不依賴 cc） |
| FunLineLibrary.ts | doc_spec_0004 | 概: 趣味台詞彩蛋庫與使用規則（純資料與查詢，不依賴 cc） |
| GachaCurrency.ts | doc_spec_0042 | 概: 轉蛋貨幣分流與扣款規則（純邏輯，不依賴 cc） |
| GachaDraw.ts | doc_spec_0042 | 概: 轉蛋抽取引擎：依規格稀有度機率抽一位武將（純邏輯，不依賴 cc） |
| GachaPoolGuide.ts | doc_spec_0042 | 概: 雙池定位文案與死亡傳承提示（純邏輯，不依賴 cc） |
| GachaSyncRecord.ts | doc_spec_0042 | 概: 各池抽卡記錄的伺服端形狀與同步校驗（純邏輯，不依賴 cc，不連線） |
| GameClock.ts | doc_spec_0034 | 概: 季度制遊戲時鐘（純邏輯，不依賴 cc） |
| GearDefinitions.ts | doc_spec_0174 | 概: 一般裝備定義表（provisional，純資料，不依賴 cc）。 |
| GearEquipFlow.ts | doc_spec_0174 | 概: 一般裝備穿戴與卸下的純邏輯（不依賴 cc）。 |
| GearPageSlots.ts | doc_spec_0174, doc_ui_0012 | 概: 寶頁一般裝備 2x3 格位的檢視模型（純邏輯，不依賴 cc）。 |
| GearPickerView.ts | doc_spec_0174, doc_ui_0012 | 概: 寶頁格位點擊後的選取清單檢視模型（純邏輯，不依賴 cc）。 |
| GeneCatalyst.ts | doc_spec_0011 | 概: 呼叫端負責提供已退役武將與對應因子的機率；不挑因子、不消耗媒介。 |
| GeneralAging.ts | doc_spec_0034, doc_spec_0018 | 概: 武將每季增齡與壽命結算（純邏輯，不依賴 cc） |
| GeneralArtPaths.ts | 未登錄：使用者裁定 2026-10-25（頭像要能隨立繪迭代、立繪走標準路徑）；PROG | 概: 武將立繪／頭像的資源路徑規則（純邏輯，不依賴 cc） |
| GeneralBackpack.ts | doc_spec_0017, doc_spec_0174 | 概: 武將個人背包的六個裝備欄位、解鎖狀態與放入檢查，純邏輯，不依賴 cc。 |
| GeneralBackpackView.ts | doc_spec_0174 | 概: 由統一物件庫推導單一武將的一般裝備背包（純邏輯，不依賴 cc）。 |
| GeneralCommandPanel.ts | doc_ui_0012 | 概: 將頁「名聲 / 官職 / 統領軍勢」區塊的列資料（純邏輯，不依賴 cc） |
| GeneralCoreFields.ts | doc_tech_0011 | 概: 武將 25 核心欄位的覆蓋檢查（純邏輯，不依賴 cc） |
| GeneralReadModel.ts | doc_ui_0012 | 概: 人物頁 Data Read Model 映射層（純邏輯，不依賴 cc）。 |
| GeneralStage.ts | doc_spec_0016, doc_spec_0018 | 概: 武將生命週期狀態機（出生→開獎→成年→巔峰→衰老→退役）純邏輯，不依賴 cc。 |
| GeneralTallySummary.ts | doc_spec_0012, doc_ui_0030 | 概: 人物頁「虎符戰記摘要」次卡的三行文字（純邏輯，不依賴 cc） |
| GeneralVersionDiff.ts | doc_spec_0005 | 概: 同名版本的初始因子對比（純邏輯，不依賴 cc） |
| GeneralVersionGallery.ts | doc_spec_0005, doc_spec_0016 | 概: 同名武將版本圖鑑（SAME-01 項 5 / PROG-2-0707，純邏輯，不依賴 cc） |
| GiftAffection.ts | 未登錄：傭兵系統規格書／遊戲系統：結緣與送禮（送禮增加好感，好感越高轉化機率越高）；FE | 概: 送禮好感度與轉化機率加成（純邏輯，不依賴 cc） |
| GovernanceAssignment.ts | doc_spec_0037 | 概: 太守府內政任務的武將指派服務（純邏輯，不依賴 cc）。 |
| GovernorHallView.ts | doc_spec_0037 | 概: 太守府治理頁的文字與數值（純邏輯，不依賴 cc）。 |
| HallAutoAssign.ts | doc_spec_0002 | 概: 委任流程與委任回看紀錄（純邏輯，不依賴 cc）。 |
| HallCharacterPresenter.ts | 未登錄：WBS v5 HALL-07（武將點位刷新池）；HallCharacterRol | 概: 大廳武將點位的刷新狀態與列資料，純 TS，不依賴 cc。 |
| HallCharacterRoll.ts | 未登錄：WBS v3 HALL-07（武將點位刷新池：rollHallCharacter | 概: 大廳武將點位的加權抽樣與刷新間隔判斷，純 TS，不依賴 cc。 |
| HallMissionBoard.ts | doc_spec_0002 | 概: 大廳雙牆任務板的可見性過濾、已接取置頂與重算時機，純邏輯，不依賴 cc。 |
| HallMissionBoardPresenter.ts | 未登錄：WBS v3 HALL-01（大廳資料模型）、HALL-03（雙牆任務板可見性與 | 概: 大廳任務牆的顯示資料，純 TS，不依賴 cc。 |
| HallMissionDispatch.ts | doc_spec_0002 | 概: 大廳任務派遣條件與成敗判定（純邏輯，不依賴 cc） |
| HallMissionSettlement.ts | doc_spec_0002, doc_spec_0014 | 概: 大廳任務結算轉官職經驗、晉升提示文案（純邏輯，不依賴 cc） |
| HallSyncSnapshot.ts | doc_spec_0002 | 概: 大廳狀態的伺服端同步列（純邏輯，不依賴 cc，不連線） |
| HallTaskIntel.ts | doc_spec_0002 | 概: 任務情報度與委任狀態的判斷（純邏輯，不依賴 cc）。 |
| HallVolunteer.ts | doc_spec_0002 | 概: 大廳「自告奮勇」彩蛋的判定、排序與成功率加成，純 TS，不依賴 cc。 |
| HereditaryKeep.ts | doc_spec_0037 | 概: 世襲主城保護與背水一戰（純邏輯，不依賴 cc）。 |
| HiddenFactorAwakening.ts | doc_spec_0019 | 概: 里程碑達成時把隱藏因子寫進武將基因（純邏輯，不依賴 cc） |
| HistoricalPairs.ts | doc_spec_0024 | 概: 史實相性配對表（KIN-02）與爆發力／受孕率接線（KIN-04）。 |
| HybridSkill.ts | doc_spec_0011 | 概: 混種戰法觸發判定（純邏輯，不依賴 cc） |
| InitialGeneralShowcase.ts | doc_spec_0031 | 概: 六位初始名將的展示卡與登場台詞資料（純邏輯，不依賴 cc）。 |
| InitialHeroTable.ts | doc_tech_0008 | 概: 初始六名將資料表的驗證與鍵值推導，純 TS，不依賴 cc。 |
| InventoryProjection.ts | 未登錄：Data Schema 文件 §2-2 #11 與 §2-1a（統一物件庫為 c | 概: 統一物件庫 Inventory_Service 推導虎符與英靈卡視圖（純邏輯，不依賴 cc）。 |
| InventoryRecordBridge.ts | 未登錄：Data Schema 文件 §2-1a（統一物件庫為 canonical）；W | 概: 虎符卡轉成統一物件庫的 TALLY 列，並讀回存檔的列（純邏輯，不依賴 cc）。 |
| ItemBagView.ts | doc_spec_0036 | 概: 道具背包的檢視模型（純邏輯，不依賴 cc）。 |
| ItemEffectDispatcher.ts | doc_spec_0036 | 概: 道具效果派發（純邏輯，不依賴 cc）。 |
| ItemExpiry.ts | doc_spec_0036 | 概: 限時道具到期判定與回收（純 TS，不依賴 cc）。 |
| ItemRefreshEffect.ts | doc_spec_0036 | 概: 刷新券的效果（純邏輯，不依賴 cc）。 |
| ItemShopPricing.ts | doc_spec_0032 | 概: 道具購買的定價與餘額判斷，純 TS，不依賴 cc。 |
| ItemUseFlow.ts | doc_spec_0036 | 概: 道具使用流程（純邏輯，不依賴 cc）。 |
| JobChange.ts | doc_spec_0043 | 概: 20 歲轉職（追加副職）純邏輯，不依賴 cc。 |
| JobChangeWiring.ts | doc_spec_0043 | 概: 20 歲轉職的名冊接線（純邏輯，不依賴 cc） |
| JournalEvents.ts | doc_spec_0015 | 概: 遊戲事件轉成武將日誌條目（純邏輯，不依賴 cc）。 |
| JournalLog.ts | doc_spec_0015 | 概: 武將日誌主檔的寫入與查詢（純邏輯，不依賴 cc）。 |
| JournalReaction.ts | doc_spec_0176 | 概: 日誌條目的一句武將反應（離線模板，純邏輯，不依賴 cc）。 |
| KinDynamicRelations.ts | doc_spec_0024 | 概: 家族關係（動態關係）：事件建立與存檔快照（KIN-06）。 |
| KinRelation.ts | doc_spec_0024 | 概: 家族關係（史實相性）系統：關係 Schema（KIN-01）與相性標籤引擎（KIN-03）。 |
| LateBloomClue.ts | doc_spec_0033 | 概: 大器晚成線索（純邏輯，不依賴 cc） |
| LegacyAchievement.ts | doc_spec_0025 | 概: 世代成就判定（RET-07）。純邏輯，不依賴 cc。 |
| LegacyArena.ts | doc_spec_0018 | 概: 演武聖境：死亡名將的精華快照與付費復活（純邏輯，不依賴 cc） |
| LegendaryMentoring.ts | doc_spec_0027 | 概: 名將傳道（MENT-15，純邏輯，不依賴 cc） |
| LifeScriptCopy.ts | doc_spec_0018 | 概: 壽命與階段劇本文案的 Key 與參數（LIFE-13，純邏輯，不依賴 cc） |
| LifespanCost.ts | doc_spec_0018 | 概: 回傳新狀態與事件，不改輸入、不用亂數、不寫入存檔。 |
| LifespanSave.ts | doc_spec_0015, doc_spec_0037 | 概: 領地治理（指派、領地、日誌）的讀檔校正（純邏輯，不依賴 cc）。 |
| LifespanWiring.ts | doc_spec_0018 | 概: 主動指令的壽命消耗接線與超齡隨機死亡（純邏輯，不依賴 cc） |
| LimitedPoolSchedule.ts | doc_spec_0042 | 概: 限定池的上下架時間窗與本期限定角色（純邏輯，不依賴 cc）。 |
| LoadoutCheck.ts | doc_spec_0049 | 概: 推薦戰法三態檢核（WBS v7 LVL-04，PROG-2-0598） |
| LobbyHubSchema.ts | doc_spec_0002 | 概: 大廳資料（Lobby_Hub）的型別與結構驗證，純邏輯，不依賴 cc。 |
| LobbyThemeResolver.ts | doc_spec_0002 | 概: 大廳晝夜與節慶三層的解析（純邏輯，不依賴 cc）。 |
| LoginStreak.ts | doc_spec_0025 | 概: 連續登入統計（純邏輯，不依賴 cc）。 |
| LongevityPill.ts | doc_spec_0018, doc_spec_0032 | 概: 延壽丹延長武將壽命上限與扣道具（純邏輯，不依賴 cc） |
| LuckBloodlineMutation.ts | doc_spec_0035 | 概: 運氣 ≥95 的「血統變異」（LUK-06 效果 2，PROG-2-0877，純邏輯，不依賴 cc） |
| LuckEventRate.ts | doc_spec_0035 | 概: 運氣（LUK）對隨機事件觸發率的修正（純邏輯，不依賴 cc） |
| LuckFateInheritance.ts | doc_spec_0035 | 概: 運氣 =100 的「天命傳承」（LUK-06 效果 3，PROG-2-0878，純邏輯，不依賴 cc） |
| LuckTacticCopy.ts | doc_spec_0035 | 概: 運氣 ≥80 的「戰法強制複製」（LUK-06 效果，PROG-2-0874，純邏輯，不依賴 cc） |
| LuckThresholds.ts | doc_spec_0035 | 概: 運氣特殊門檻判定（LUK-06）。 |
| LuckVisibility.ts | doc_spec_0035 | 概: 運氣（LUK）屬性的前期隱藏與顯示文字（LUK-01，純邏輯，不依賴 cc） |
| MainTargetPanelText.ts | doc_ui_0009 | 概: 主角區詞條列的文字格式（純邏輯，不依賴 cc） |
| MainTargetPanelView.ts | doc_spec_0009, doc_ui_0009 | 概: 血統樹底部主角區的資料整理（純邏輯，不依賴 cc） |
| MentorBoundary.ts | doc_spec_0027 | 概: 教學職能邊界的執行期檢查（MENT-11，純函式，不依賴 cc） |
| MentorBreakthrough.ts | doc_spec_0027 | 概: 教官卡星等突破與重複卡判定（純邏輯，不依賴 cc） |
| MentorCardTabs.ts | doc_spec_0027 | 概: 教官卡詳情三頁籤與星等鎖頭（MENT-13，純邏輯，不依賴 cc） |
| MentorDeck.ts | doc_spec_0027 | 概: 培育入場的教官編成：最多 5 格，每格放一張教官卡或留空。純 TS，不依賴 cc。 |
| MentorInspiration.ts | doc_spec_0027 | 概: 戰法靈感事件觸發引擎（純邏輯，不依賴 cc） |
| MentorOverflow.ts | doc_spec_0027 | 概: 教官卡溢出轉化（純邏輯，不依賴 cc） |
| MentorSources.ts | doc_spec_0027, doc_spec_0151 | 概: 教官卡五來源標記與持有清單（純邏輯，不依賴 cc） |
| MentorSupportCatalog.ts | doc_spec_0027 | 概: 教官支援卡目錄（純邏輯，不依賴 cc） |
| MentorSynergy.ts | doc_spec_0027 | 概: 師友羈絆（MENT-12，純邏輯，不依賴 cc） |
| MercenaryAffection.ts | doc_spec_0132 | 概: 傭兵試用期間的每日好感（結義進度的一部分）純邏輯，不依賴 cc。 |
| MercenaryBattleRecord.ts | doc_spec_0025, doc_spec_0029 | 概: 試用傭兵出戰後的進度寫入（純邏輯，不依賴 cc） |
| MercenaryBond.ts | doc_spec_0045, doc_spec_0132 | 概: 推進一天：每日 bond +1、daysLeft −1；第 6 天結束時發 trial-complete。 |
| MercenaryBondPermanent.ts | doc_spec_0132 | 概: 傭兵結義後轉為永久武將的點數扣除與數值快照，純邏輯，不依賴 cc。 |
| MercenaryDeparture.ts | doc_spec_0132 | 概: 傭兵試用到期的退場與 30 天冷卻純邏輯，不依賴 cc。 |
| MercenaryFarewellPresenter.ts | 未登錄：WBS v3 MERC-05（退場流程與告別信）；文字鍵 UI_MERC_FAR | 概: 傭兵離隊告別信的文字組裝，純邏輯，不依賴 cc。 |
| MercenaryIllustration.ts | doc_spec_0025, doc_spec_0029 | 概: 傭兵插畫五階段（純邏輯，不依賴 cc） |
| MercenaryPanelView.ts | doc_spec_0029 | 概: 傭兵面板的文字與按鈕狀態（純邏輯，不依賴 cc）。 |
| MercenaryPoolPresenter.ts | doc_spec_0132 | 概: 傭兵列表的顯示資料（倒數、結義進度、按鈕可否），純 TS，不依賴 cc。 |
| MercenaryRoster.ts | 未登錄：WBS v3 MERC-04（結義轉永久）、MERC-12（數值快照）；PM 修 | 概: 傭兵結義後寫入武將名冊的純邏輯計算，不依賴 cc。 |
| MercenarySaveModel.ts | doc_spec_0132 | 概: 傭兵存檔包（試用狀態、薪水狀態、冷卻紀錄）的序列化與讀檔校正，純邏輯，不依賴 cc。 |
| MercenaryTrialDay.ts | doc_spec_0132 | 概: 試用中傭兵的單日推進：倒數 −1、結義進度 +1，同日好感 +10（上限 60），純邏輯，不依賴 cc。 |
| MercenaryTrialTicket.ts | doc_spec_0132 | 概: 使用試用券產生 Trial 傭兵，純邏輯，不依賴 cc。 |
| MercenaryUpkeep.ts | doc_spec_0132 | 概: 傭兵每日薪水（黃金＋美酒）與欠薪凍結純邏輯，不依賴 cc。 |
| MilestoneRewards.ts | doc_spec_0019 | 概: 里程碑達成後的獎勵內容（純邏輯，不依賴 cc） |
| MilitaryReserve.ts | doc_spec_0040, doc_spec_0032, doc_data_0001 | 概: 玩家城市兵源與糧草儲備（純邏輯，不依賴 cc） |
| MonthlyCard.ts | doc_spec_0032 | 概: （無檔頭說明） |
| MorningReport.ts | doc_spec_0015 | 概: 晨報摘要：每次登入把上次登入後新增的日誌挑 1~3 則高優先條目（純邏輯，不依賴 cc）。 |
| NewPlayerOpening.ts | doc_spec_0031 | 概: 新玩家開場的幕序與第一幕文字，純 TS，不依賴 cc。 |
| NpcDialogueHook.ts | doc_spec_0176 | 概: RAG 對話 hook 與未命中情境收集（純邏輯，不依賴 cc，不連中台） |
| NpcFriendMentor.ts | doc_spec_0027 | 概: MVP 版「好友」：從資料表讀一組 NPC 好友教官（純邏輯，不依賴 cc） |
| NpcGoldenLine.ts | doc_spec_0176 | 概: 核心武將錨點台詞（Golden_Lines）不可被覆蓋的執行規則（純邏輯，不依賴 cc） |
| NpcMemoryReadModel.ts | doc_tech_0013 | 概: 本機 NPC_Memory 最小 read model（純邏輯，不依賴 cc）。 |
| NpcPersonaCard.ts | doc_spec_0176 | 概: 武將 Persona Card 的資料結構與結構驗證（純邏輯，不依賴 cc）。 |
| NurtureEvents.ts | doc_spec_0026 | 概: 培育回合的受傷與好感事件擲骰（純邏輯，不依賴 cc） |
| NurtureRecordRow.ts | doc_spec_0026 | 概: 畢業時把培育會話轉成「培育紀錄」一列（純邏輯，不依賴 cc） |
| OfficerDisplay.ts | doc_spec_0014 | 概: 大廳官職區塊的顯示資料（純邏輯，不依賴 cc） |
| OfficerPermissions.ts | doc_spec_0014 | 概: 官職權限快照（純邏輯，不依賴 cc） |
| OfficerSnapshot.ts | doc_spec_0002, doc_spec_0014 | 概: 大廳讀取官職快照後的權限解讀（純邏輯，不依賴 cc） |
| OfficerState.ts | doc_spec_0014 | 概: 官職階位表、經驗計算、晉升判定（純邏輯，不依賴 cc） |
| OfficerTierTable.ts | doc_spec_0014 | 概: 官職階位資料檔的驗證與安裝（純邏輯，不依賴 cc） |
| OfflineBattleSnapshot.ts | doc_spec_0015 | 概: 離線戰鬥快照：自動解決／代勞結果的摘要與驗證鉤點（純邏輯，不依賴 cc）。 |
| OfflineInteractionEvents.ts | doc_spec_0015 | 概: 離線互動事件內容（純邏輯，不依賴 cc）。 |
| OfflineInteractionTrigger.ts | doc_spec_0015 | 概: 離線互動事件的觸發條件與每登入窗去重（純邏輯，不依賴 cc）。 |
| OfflineTemplateEngine.ts | doc_spec_0176 | 概: 離線模板台詞產生（STATIC_TEMPLATE slot filling），純邏輯，不依賴 cc。 |
| OnboardingTutorial.ts | doc_spec_0031, doc_spec_0045 | 概: 新手 3 段式引導（首次進入依序出現）純邏輯，不依賴 cc。 |
| OpeningBeauty.ts | doc_spec_0031 | 概: 開局紅顏：從紅顏池（gacha-config 的 support-pool）抽 1 位，轉成可入名冊的武將 id。純 TS，不依賴 cc。 |
| OpeningFlowController.ts | doc_tech_0008 | 概: （無檔頭說明） |
| OpeningLetter.ts | doc_spec_0002, doc_spec_0004 | 概: 開場信件的已讀狀態與段落切分（純邏輯，不依賴 cc） |
| OverflowBond.ts | doc_spec_0042, doc_data_0001 | 概: 滿轉溢出轉結義點數（純邏輯，不依賴 cc） |
| PersonalityDriftGuard.ts | doc_spec_0176 | 概: 生成台詞的性格漂移檢查（純邏輯，不依賴 cc）。 |
| PlayerInventory.ts | doc_spec_0006, doc_spec_0036 | 概: 玩家道具庫存（純邏輯，不依賴 cc） |
| PrisonerOfWar.ts | doc_spec_0021 | 概: 俘虜產生與四選一處置（純邏輯，不依賴 cc） |
| ProvisionalGeneralVersions.ts | doc_spec_0005 | 概: 暫定版本表（PROG-2-0709，純邏輯，不依賴 cc） |
| ReadModelValidators.ts | doc_tech_0013 | 概: 虎符 / 英靈卡 / 出征編制 / 戰場狀態的最小 read model 型別與唯一性驗證（純邏輯，不依賴 cc） |
| Rebirth.ts | doc_spec_0042, doc_spec_0155 | 概: 重複抽到同名武將的轉生規則（純邏輯，不依賴 cc） |
| RedFaceCopy.ts | doc_spec_0004 | 概: 紅顏趕路與商業化提示的文案表（純邏輯，不依賴 cc）。 |
| RedFaceShowcase.ts | doc_spec_0031 | 概: 紅顏池展示列資料（純邏輯，不依賴 cc）。 |
| RelationEvents.ts | doc_spec_0024 | 概: 關係組合在戰場／治理場景觸發專屬事件（純邏輯，不依賴 cc） |
| ReportCardBook.ts | doc_spec_0026 | 概: 畢業成績單的保留與定型（純邏輯，不依賴 cc） |
| ResourceCap.ts | doc_spec_0032 | 概: 基礎資源的存儲上限夾制與不足提示（純邏輯，不依賴 cc）。 |
| RetireReviewCopy.ts | doc_spec_0019 | 概: 退役戰績回顧與季度戰損報告的文字（純邏輯，不依賴 cc） |
| RetirementRouting.ts | doc_spec_0043 | 概: 只讀已選定職能，不從屬性猜宿命、不呼叫退役、不產卡。 |
| RetreatRisk.ts | doc_spec_0018 | 概: 精力狀態對撤退風險的影響（純邏輯，不依賴 cc） |
| ReviveRetrain.ts | doc_spec_0005, doc_spec_0023 | 概: 復生重練（純邏輯，不依賴 cc） |
| RivalNations.ts | doc_spec_0020 | 概: 他國 AI 勢力的純邏輯：勢力清單、與玩家的邦交、外交指令、季度行動、自動模擬戰鬥。 |
| RivalTrade.ts | doc_spec_0020 | 概: （無檔頭說明） |
| RosterRoleLoad.ts | doc_spec_0016 | 概: 讀檔時把名冊的舊職能值正規化（純邏輯，不依賴 cc） |
| SageDivination.ts | doc_spec_0006, doc_spec_0009 | 概: 名士占卜觸發因子覺醒，純邏輯，不依賴 cc |
| SageFactorPreview.ts | doc_spec_0009 | 概: 名士提前預覽鎖住的因子方向（純邏輯，不依賴 cc） |
| SageRegistry.ts | doc_spec_0006 | 概: 名士表的載入與 schema 驗證（純邏輯，不依賴 cc） |
| SageRemarks.ts | doc_spec_0008, doc_spec_0028 | 概: 結緣介面的名士批語與天象異變（純邏輯，不依賴 cc） |
| SandtableMarkers.ts | doc_spec_0014 | 概: 世界沙盤標記數量上限（純邏輯，不依賴 cc） |
| SandtableProgress.ts | doc_spec_0002 | 概: 世界沙盤的解鎖歷史與階段顯示（純邏輯，不依賴 cc）。 |
| SandtableStatus.ts | doc_spec_0014 | 概: 天下沙盤入口的狀態文字（純邏輯，不依賴 cc） |
| SandtableTerritories.ts | doc_spec_0014 | 概: 世界沙盤的領地清單與驗證（純邏輯，不依賴 cc） |
| SandtableTerritoryPicker.ts | doc_spec_0014 | 概: 天下沙盤領地選擇的列資料與文字（純邏輯，不依賴 cc） |
| SeasonFastForward.ts | doc_spec_0045 | 概: 連續推進季度，遇到要玩家處理的事件就停（純 TS，不依賴 cc）。 |
| SeasonModifiers.ts | doc_spec_0034 | 概: 四季特色修正表（純邏輯，不依賴 cc） |
| SeasonReportPanel.ts | doc_spec_0019 | 概: 季結戰報彈窗的列資料與文字（純邏輯，不依賴 cc） |
| SeededRandom.ts | doc_spec_0026 | 概: （無檔頭說明） |
| SortieDeploy.ts | doc_spec_0040, doc_spec_0005, doc_spec_0012, doc_data_0001 | 概: 出征編制、出征軍勢與糧草部署帳本（純邏輯，不依賴 cc） |
| SortieLoadoutPreset.ts | doc_spec_0040 | 概: 出征編制預設與推薦（純邏輯，不依賴 cc） |
| SortiePrediction.ts | doc_data_0001 | 概: 出征編制畫面的戰前粗估勝率（純邏輯，不依賴 cc） |
| SoulFragmentLedger.ts | doc_spec_0005 | 概: 戰魂碎片帳本（純邏輯，不依賴 cc） |
| SoulInjectCandidates.ts | doc_spec_0005 | 概: 武將詳情頁「寄宿戰魂」面板的資料（純邏輯，不依賴 cc） |
| SpiritArchiveSnapshot.ts | doc_spec_0022 | 概: 英靈死亡快照（純邏輯，不依賴 cc） |
| SpiritInsertSequence.ts | doc_spec_0012 | 概: 英靈插卡四段演出的時間軸（純邏輯，不依賴 cc） |
| SpiritSlotFlow.ts | doc_spec_0022 | 概: 命槽卸下與設為主卡的純邏輯（不依賴 cc）。 |
| SpiritSlotState.ts | doc_spec_0022, doc_ui_0012 | 概: 從統一物件庫推導命頁「命槽」的狀態（純邏輯，不依賴 cc）。 |
| StageChainNodes.ts | doc_spec_0049 | 概: 連環破主鏈的關卡節點表（純邏輯，不依賴 cc） |
| StageChainProgress.ts | doc_spec_0049 | 概: 連環破主鏈的順序解鎖判定（純邏輯，不依賴 cc） |
| StageLoadoutSlots.ts | doc_spec_0026, doc_spec_0049 | 概: 關卡推薦對策槽位數與出征槽位缺口（純邏輯，不依賴 cc） |
| StarUpMaterial.ts | doc_ui_0012 | 概: 升星素材路由（純邏輯，不依賴 cc） |
| StatRevelation.ts | doc_spec_0026 | 概: 子嗣屬性的分層揭露（純邏輯，不依賴 cc） |
| StoryStripCells.ts | doc_tech_0011 | 概: 故事條 6 格的結構檢查（純邏輯，不依賴 cc） |
| StrategistHud.ts | doc_spec_0049 | 概: 軍師 HUD 四摘要欄的文字組成（純邏輯，不依賴 cc） |
| SupportPoolValidator.ts | doc_spec_0031 | 概: 紅顏池資料的一致性檢查，純 TS，不依賴 cc。 |
| SyncHash.ts | doc_tech_0010 | 概: SyncHash.ts |
| TacticCondition.ts | doc_spec_0038 | 概: 戰法 TCOND 條件評估（純邏輯，不依賴 cc） |
| TacticLoadout.ts | doc_spec_0026 | 概: 戰法槽位（NUR-10 部分）。純邏輯，不依賴 cc。 |
| TacticRandomization.ts | doc_spec_0042, doc_spec_0155 | 概: 轉蛋戰法隨機化（純邏輯，不依賴 cc） |
| TacticTriggerRate.ts | doc_spec_0180 | 概: 戰法發動率（INT 檢核器，純邏輯，不依賴 cc） |
| TacticsTabView.ts | doc_ui_0012 | 概: 武將技頁的檢視模型（純邏輯，不依賴 cc）。 |
| TalismanSlotView.ts | doc_ui_0012 | 概: 兵分頁虎符槽的讀取（純邏輯，不依賴 cc）。 |
| TallyBossTags.ts | doc_spec_0007 | 概: 虎符的 BOSS 克制標籤與本季 BOSS 弱點命中統計（純邏輯，不依賴 cc） |
| TallyDeathSettlement.ts | doc_spec_0012 | 概: 陣亡事件的虎符結算（純邏輯，不依賴 cc） |
| TallyDeployAffinity.ts | doc_spec_0012 | 概: 虎符部隊出陣時的適性乘數（TRP-13，純邏輯，不依賴 cc） |
| TeachingSpiritProvisional.ts | doc_spec_0031 | 概: 教學戰使用的傳說英靈（PM 暫定，純邏輯，不依賴 cc）。 |
| TeachingSpiritTalisman.ts | doc_spec_0031 | 概: 英靈夢回教學戰結束後，傳說英靈轉成初始虎符的規則（純邏輯，不依賴 cc）。 |
| TerrainTroopRules.ts | doc_spec_0041 | 概: 兵種站在特定地形上的固定強弱勢（純邏輯，不依賴 cc） |
| TerritoryUpgrade.ts | doc_spec_0037 | 概: 太守府（領地）升級的等級、格數與費用（純邏輯，不依賴 cc）。 |
| TigerTally.ts | doc_spec_0012 | 概: 正式名將保守門檻：明確 isHistorical === true 的武將，或性別為女、具非空 |
| TigerTallyBreakthrough.ts | doc_spec_0012, doc_data_0001 | 概: 虎符精華突破：3★→4★、4★→5★（純邏輯，不依賴 cc） |
| TigerTallyHoldings.ts | doc_spec_0012 | 概: 虎符持有關係（純邏輯，不依賴 cc） |
| TigerTallyLoyalty.ts | doc_spec_0012 | 概: 虎符拔除 / 裝上對武將忠誠度的影響，與反洗機制（純邏輯，不依賴 cc） |
| TigerTallySetBonus.ts | doc_spec_0012 | 概: 虎符陣容 Set 羈絆判定與攻防加成（純邏輯，不依賴 cc） |
| TigerTallyStar.ts | doc_spec_0012 | 概: 虎符 1~3★ 戰鬥經驗升星（純邏輯，不依賴 cc） |
| TournamentLocal.ts | doc_spec_0007 | 概: 名將挑戰賽本機最小可行（純邏輯，不依賴 cc）。 |
| TournamentSeason.ts | doc_spec_0007 | 概: 名將挑戰賽的賽季相位、段位與賽季結束軟重置（純邏輯，不依賴 cc）。 |
| TrainingGainFormula.ts | doc_spec_0180 | 概: 培育單次屬性增長的總公式與各乘區（純邏輯，不依賴 cc，不擲骰）。 |
| TravelCountdown.ts | doc_spec_0031 | 概: 趕路倒數（回合制）的純邏輯，不依賴 cc。 |
| UltimateCinematic.ts | doc_spec_0030 | 概: 奧義演出設定檔的解析（純邏輯，不依賴 cc） |
| UltimateDamage.ts | doc_spec_0030, doc_data_0001 | 概: 奧義傷害純公式（純邏輯，不依賴 cc） |
| UltimateProgress.ts | doc_ui_0012 | 概: 五階奧義的名聲與事蹟讀取（純邏輯，不依賴 cc） |
| UltimateSlotUnlock.ts | doc_spec_0030 | 概: 依轉生次數解鎖奧義欄位（純邏輯，不依賴 cc） |
| UltimateUpgrade.ts | doc_spec_0030 | 概: 奧義升級與奧義圖鑑（純邏輯，不依賴 cc） |
| UnlockPhase.ts | doc_spec_0009 | 概: 玩家等級與因子解鎖階段（純 TS，不連資料庫；FUL-06 core 端，Server 端 re-export） |
| Unveiling.ts | doc_spec_0025, doc_spec_0043, doc_spec_0045, doc_spec_0026, doc_spec_0016 | 概: 子嗣 5 歲開獎與宿命分流（純邏輯，不依賴 cc） |
| VirtualAncestorGenerator.ts | doc_spec_0072, doc_spec_0011, doc_spec_0031 | 概: 初代名將的 14 位虛擬祖先（始祖溯源），純邏輯，不依賴 cc |
| VitalityBattleGate.ts | doc_spec_0018, doc_spec_0148 | 概: 戰場精力軟懲罰判定（LIFE-10，純邏輯，不依賴 cc） |
| VitalityCap.ts | doc_spec_0016, doc_data_0001 | 概: 男女精力上限基礎值（純邏輯，不依賴 cc） |
| VitalityPill.ts | doc_spec_0032, doc_data_0001 | 概: 補元散的精力回復與扣道具（純邏輯，不依賴 cc） |
| VortexTransition.ts | doc_spec_0031 | 概: 漩渦吸入與白閃轉場的階段時序（純邏輯，不依賴 cc）。 |
| WarehouseCapacity.ts | 未登錄：WBS v3 BAG-02（主城倉庫：50 格、擴容 +20、上限 200） | 概: 主城倉庫的容量與存入判斷，純邏輯，不依賴 cc。 |
| WeatherItem.ts | doc_spec_0041 | 概: 天氣道具改變戰場天氣（APT-15，PROG-2-0929） |
| WeatherSchedule.ts | doc_spec_0041 | 概: 戰場天氣排程（純邏輯，不依賴 cc） |
| WeatherTacticRestriction.ts | doc_spec_0041 | 概: 天氣對戰法的強約束（純邏輯，不依賴 cc） |
| WildGene.ts | doc_spec_0011 | 概: 獨立的基礎機率 Star Jump 判定：成功只提升 level，保留其餘欄位與輸入。 |
| WishPool.ts | doc_spec_0032 | 概: 許願池免費許願軌（doc_spec_0032 §E-6，PROG-2-1198） |
| YearReport.ts | doc_spec_0034 | 概: 年終年報的資料與文字（純邏輯，不依賴 cc） |

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
| LoreCache.ts | doc_spec_0008 | 概: 武將故事的 LRU 快取（純邏輯，不依賴 cc）。 |
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

#### Battle Controllers (`assets/scripts/battle/controllers/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleController.ts | doc_spec_0040, doc_data_0001, doc_spec_0012 | D: BattleResult, DeployOutcome; F: 部署驗證、戰鬥結算、TileBuff 計算; C: DEFAULT_STATS |
| EnemyAI.ts | doc_spec_0020, doc_data_0002 | F: decideDeploy（35% 剋制偏向） |
| BattleFlowStateMachine.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| WeatherItemUseFlow.ts | doc_spec_0041 | 概: 戰場天氣道具的庫存扣除流程（PROG-2-0932 / APT-15） |

#### Battle Models (`assets/scripts/battle/models/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleState.ts | doc_spec_0040, doc_data_0001 | D: GridCell, TileBuff, TerrainGrid; C: 5×8 grid |

#### Battle Views (`assets/scripts/battle/views/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| AwakeningReveal.ts | doc_spec_0009 | F/概: `formatAwakeningReveal()` 戰後覺醒在結算窗揭示「🔓 鎖頭碎裂！【覺醒】X」（PROG-2-1133）|
| BattleScene.ts | doc_spec_0040, doc_spec_0161, doc_art_0003, doc_spec_0038, doc_spec_0030 | D: EncounterConfig; 概: 戰鬥場景進入點；正式讀取 `tacticSlots[] / ultimateSlots[]`，載入 battle skill metadata，並把戰法摘要 / 奧義列表推入 HUD |
| BattleSceneLoader.ts | doc_spec_0040, doc_spec_0038, doc_spec_0030 | D: EncounterConfig, BattleSkillMetadata; 概: 由 `tactic-library.json` / `ultimate-definitions.json` 建立戰法摘要與奧義執行資料 |
| TurnFlowManager.ts | doc_spec_0040, doc_spec_0038 | 概: 戰中行為流程；`onTactics()` 直接使用正式戰法摘要，不再顯示 placeholder toast |
| BoardRenderer.ts | doc_spec_0040 | 概: 5×8 棋盤渲染 |
| UnitRenderer.ts | doc_art_0003 | D: UnitView, GeneralView; 概: GLB 動態載入 |
| SceneBackground.ts | doc_tech_0015 | 概: 分層相機（BG/3D/UI） |
| SpriteFrameAnimator.ts | — | 概: 幀動畫工具（無直接規格書對應） |
| BattleFlowVfx.ts | doc_ui_0001 | 概: （無檔頭說明） |
| BattlePresentationTiming.ts | doc_ui_0001 | 概: BattlePresentationTiming.ts |
| BattleSceneCapture.ts | doc_ui_0001 | 概: （無檔頭說明） |
| BattleSceneFlow.ts | doc_ui_0001, doc_spec_0040 | 概: 管理 BattleScene 的場景級流程。 |
| BattleSceneGambitSummary.ts | doc_spec_0039, doc_ui_0001 | 概: （無檔頭說明） |
| BattleSceneSetup.ts | doc_index_0007 | 概: 將 TroopType enum 轉換為繁體中文兵種名稱。 |
| BattleSkillTargetingFlow.ts | doc_ui_0001 | 概: 管理「技能選目標」的互動狀態機。 |
| BattleTutorialHint.ts | doc_spec_0031 | 概: 首戰教學的提示浮窗（薄 View） |
| BattleUIBridge.ts | doc_ui_0001, doc_spec_0015 | 概: 戰鬥 UI 連結器 |
| BattleUIInitializer.ts | 未標出處 | 概: 戰鬥 UI 元件自動建立輔助函式 |

#### Battle Views / Effects (`assets/scripts/battle/views/effects/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BuffGainEffectPool.ts | doc_spec_0010 | D: EffectSlot, BuffEffectConfig; 概: 法陣+圖示+粒子池 |
| BuffEffectPrefabController.ts | doc_spec_0010 | 概: Prefab 結構驗證（Ring/Icon/Spark/Accent） |
| BuffParticleProfileConfig.ts | doc_tech_0015 | D: BuffParticleProfile |

#### UI Components (`assets/scripts/ui/components/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleHUD.ts              | doc_ui_0027, doc_ui_0001, doc_ui_0003                       | 概: 回合/糧草(v3 DP→Food)/武將血條即時顯示；頭像點擊→ShowGeneralQuickView event ✅ UIPreviewBuilder 已遷移 |
| BattleLogPanel.ts         | doc_ui_0027, doc_ui_0003                                          | 概: Zone5 滾動式戰鬥日誌+可折疊(v3 移除 EndTurn/Tactics/Duel 至 Zone7) ✅ UIPreviewBuilder → battle-log-{main/default/screen}.json |
| DeployPanel.ts            | doc_spec_0040, doc_ui_0027, doc_art_0003                       | 概: 兵種選擇 4 卡池 + 選路即部署 ✅ UIPreviewBuilder 已遷移 → deploy-panel-{main/default/screen}.json |
| DuelChallengePanel.ts     | doc_spec_0007                                                              | 概: 單挑挑戰/接受 UI ✅ UIPreviewBuilder 已遷移 → duel-challenge-{main/default/screen}.json |
| GeneralDetailComposite.ts | doc_spec_0016, doc_ui_0012, doc_ui_0046                                    | 概: `GeneralDetail` 的 canonical runtime controller；負責 Overview child 與多 tab child 的 show/hide、切頁與資料下發，作為目前正式母路由 |
| GeneralDetailOverviewMapper.ts | TBD_DOC_IDS（scan-required） | 概: `GeneralConfig` 對應 Overview child 的 header / summary / bloodline / crest / story content contract；供 `GeneralDetailComposite -> GeneralDetailOverviewChild` 資料下發使用 |
| GeneralDetailOverviewChild.ts | doc_ui_0012, doc_ui_0046 | 概: `GeneralDetail` 的 Overview child panel；負責 schema preload、content bind、覺醒條與 rarity visuals 套用，作為 unified screen 的首頁子面板 |
| GeneralListPanel.ts       | doc_spec_0016, doc_ui_0012                                             | 概: 武將列表 ✅ UIPreviewBuilder 已遷移 |
| GeneralPortraitPanel.ts   | doc_spec_0016                                                                    | 概: 武將立繪面板 ✅ UIPreviewBuilder 已遷移 |
| ResultPopup.ts            | doc_spec_0040                                                                | 概: 戰鬥結算面板 ✅ UIPreviewBuilder 已遷移 |
| ToastMessage.ts           | doc_ui_0027                                                                   | 概: 通知 Toast ✅ UIPreviewBuilder 已遷移 |
| StyleCheckPanel.ts        | doc_ui_0049                                                                | 概: 風格驗證面板 ✅ UIPreviewBuilder 已遷移 |
| NetworkStatusIndicator.ts | doc_ui_0049, doc_tech_0013 | 概: 斷線警示與背景同步提示 UI ✅ UIPreviewBuilder 已遷移 → network-status-{main/default/screen}.json |
| UIScreenPreviewHost.ts    | doc_ui_0051, doc_ui_0049                                          | 概: 以 `UISpecLoader.loadFullScreen(...)` 建立 screen-driven preview host，供 D-1~D-3 與後續 QA 共用 |
| NurtureSessionMapper.ts | doc_spec_0026 | 概: 培育畫面資料映射（雙層屬性、畢業戰術標籤 graduationTags）|
| UltimateSelectPopup.ts | doc_ui_0001 | 概: 奧義選擇小窗（@deprecated，改用 UltimateSelectPopupComposite）|
| ActionCommandComposite.ts | doc_index_0007 | 概: Zone 7: 奧義指令區（CompositePanel 版） |
| BattleHUDComposite.ts | doc_index_0007 | 概: 戰鬥 HUD（CompositePanel 版） |
| BattleHudOverlayCompositePanel.ts | doc_index_0007 | 概: composite-panel family Panel（M10 scaffold --ucuf 自動生成骨架） |
| BattleLogComposite.ts | doc_index_0007 | 概: 右側面板（控制列 + 戰鬥日誌）（CompositePanel 版） |
| BattleUIDiag.ts | doc_ui_0001 | 概: 戰場 UI 診斷工具 |
| BloodlineTreeLines.ts | doc_ui_0009 | 概: 血統樹的樣式載入與父子連線重畫（共用 cc 模組，不綁定特定畫面）。 |
| DeployComposite.ts | doc_index_0007 | 概: 玩家部署操作面板（CompositePanel 版） |
| DeployDragDebug.ts | doc_spec_0040 | 概: 拖曳 debug 薄 shim |
| DuelChallengeComposite.ts | doc_index_0007 | 概: 武將單挑確認面板（CompositePanel 版） |
| EliteTroopCodexComposite.ts | doc_spec_0012 | 概: （無檔頭說明） |
| FactorHexGraphic.ts | doc_spec_0031 | 概: 六色六角圖的繪製與解鎖特效（cc 端，資料由 FactorHexPanel 提供） |
| GeneralListComposite.ts | doc_index_0007 | 概: 武將列表面板（CompositePanel 版） |
| GeneralPortraitComposite.ts | doc_index_0007 | 概: 武將立繪顯示面板（Composite 版） |
| GeneralQuickViewComposite.ts | doc_index_0007 | 概: 武將快速檢視卡片（Composite 版） |
| GradientBackground.ts | doc_index_0007 | 概: @spec-source: docs/cross-reference-index.md |
| LobbyLeaderboardComposite.ts | doc_index_0007 | 概: 戰績排行榜彈窗（PROG-2-0960） |
| LobbyMissionDetailDialogComposite.ts | doc_index_0007 | 概: @spec-source docs/cross-reference-index.md |
| ResultPopupComposite.ts | doc_index_0007 | 概: 戰鬥結果彈窗（Composite 版） |
| RoundedRectBackground.ts | doc_ui_0049 | 概: （無檔頭說明） |
| SandtableTerritoryComposite.ts | doc_index_0007 | 概: 天下沙盤領地選擇彈窗（PROG-2-0967） |
| SeasonReportComposite.ts | doc_index_0007 | 概: 季結戰報彈窗（PROG-2-0963） |
| ShadowBackground.ts | doc_ui_0049 | 概: （無檔頭說明） |
| TigerTallyComposite.ts | doc_index_0007 | 概: 虎符卡片區（Composite 版） |
| TigerTallyDetailComposite.ts | doc_index_0007 | 概: 戰鬥場景右側虎符詳情抽屜（第一版） |
| ToastMessageComposite.ts | doc_index_0007 | 概: 全域吐司提示系統（Composite 版） |
| UIBloodlineConnections.ts | doc_ui_0009 | 概: 血統樹父子連線的 Graphics 繪製（cc 元件，曲線計算在 BloodlineCurve） |
| UIMainTargetPanel.ts | doc_ui_0009 | 概: 血統樹底部主角區的 Label 綁定（cc 元件，資料整理在 MainTargetPanelView） |
| UIOpeningLetterPanel.ts | doc_spec_0002, doc_spec_0004 | 概: 開場信件的簡易面板（cc 元件，已讀狀態與段落切分在 OpeningLetter） |
| UltimateSelectPopupComposite.ts | doc_index_0007 | 概: 奧義選擇小窗（Composite 版） |
| UnitInfoComposite.ts | doc_index_0007 | 概: 從左側滑入的兵種詳細資訊面板（CompositePanel 版） |

#### UI Core (`assets/scripts/ui/core/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| NurtureFlowController.ts | doc_spec_0026, doc_spec_0027 | 概: 培育流程控制；畢業區戰法列（靈感清單＋TP 兌換，PROG-2-1132／1134）|
| BondingSetupController.ts | doc_spec_0028, doc_spec_0006, doc_spec_0009 | 概: 結緣配置面板三欄重排（PROG-2-1130）、父母大頭照（PROG-2-1131）、名士批語 3 列 SageRow0~2（PROG-2-1131）|
| UIPreviewBuilder.ts | doc_ui_0049, doc_index_0011 §8 | 概: 所有 UI 面板的基類（Unity 對照：Prefab Variant Builder + EditorWindow）；`buildScreen()` 末尾呼叫 `_realignAllWidgets()` + 清空 bind 佔位符 + `onReady(binder)`；子類覆寫 `onReady(binder)` 取代舊 `onBuildComplete()` |
| UIContentBinder.ts | doc_ui_0049, doc_index_0008 §8.3 | 概: Content Contract 資料注入與 schema 驗證；`validate()` 支援 type / enum / range / pattern 四層進階驗證，以 warnings 回報不阻斷 runtime（Unity 對照：ViewModel 資料注入 + 欄位驗證器）|
| UISpecTypes.ts | doc_ui_0049 | D: WidgetDef(hCenter/vCenter), UILayoutNodeSpec, UINodeType(scroll-view 新增), UIWidgetFragmentSpec, UITemplateParamDef, UITemplateComposeItem; F: resolveSize |
| UITemplateBinder.ts | doc_ui_0049, doc_index_0011 §8 | 概: 以 layout id/name 建立節點綁定表，供 `onReady(binder)` 查詢（Unity 對照：GetComponentInChildren 安全封裝）|
| UIPreviewLayoutBuilder.ts | doc_ui_0049 | 概: UIPreviewBuilder 拆分出的佈局計算 helper，負責 Widget 對齊與尺寸套用 |
| UIPreviewNodeFactory.ts | doc_ui_0049 | 概: 依 UILayoutNodeSpec 建立 Cocos 節點；bind path 節點顯示 {xxx.yyy} 佔位文字（buildScreen 後由 clearDynamic pass 清除）|
| UIPreviewShadowManager.ts | doc_ui_0049 | 概: 陰影層（9-slice 偽陰影）管理 |
| UIPreviewStyleBuilder.ts | doc_ui_0049 | 概: 字型/色彩/按鈕狀態渲染 helper |
| UIPreviewStateApplicator.ts | doc_ui_0049, doc_art_0002 | 概: 將 preview content state 套用到 binder（texts / actives / rarity docks），避免 LoadingScene 各 target 手寫注入 |
| UIPreviewDiagnostics.ts | doc_ui_0049 | 概: 建立耗時、節點數量日誌工具 |
| UISkinResolver.ts | doc_ui_0049 | 概: 皮膚 slot 解析（SpriteFrame/ LabelStyle/ ButtonSkin）；已加入 frame.texture null 防禦 |
| UISpecLoader.ts | doc_ui_0049 | 概: ServiceLoader 單例，統一載入 layout/skin/screen/i18n/designTokens JSON |
| DraggableButton.ts        | —                                                                              | 概: 拖曳按鈕（無直接規格書對應）|
| SolidBackground.ts        | doc_ui_0049                                                                | 概: 純色白模背景生成與美術貼圖預防覆蓋機制 |
| ActionCommandPanel.ts     | doc_ui_0001, doc_ui_0003, doc_spec_0038, doc_spec_0030                                     | 概: Zone7 奧義大圓(v3 120px)+EndTurn/Tactics/Duel 80px 軌道圓+奧義選擇彈窗；Tactics 副標與奧義列表來自正式 skill seed 資料流 ✅ UIPreviewBuilder → action-command-{main/default/screen}.json |
| BattleScenePanel.ts       | doc_ui_0001, doc_spec_0038, doc_spec_0030                                                              | 概: 戰場UI總調度器；`ensureCanvasHost()` 統一建立子面板節點並設定 layer/size(1920×1080)/Widget.ALWAYS，並承接 battle loader 輸出的戰法摘要 / 奧義列表 |
| TigerTallyPanel.ts        | doc_ui_0001, doc_spec_0012, doc_ui_0003               | 概: Zone3 虎符卡片欄（v3 AtkLabel⚔/HpLabel❤ 頂角 + UnitTypeBadge 32px）✅ UIPreviewBuilder → tiger-tally-{main/default/screen}.json |
| UnitInfoPanel.ts          | doc_ui_0001, doc_spec_0012                                         | 概: 兵種詳情滑出面板（fadeIn/fadeOut 0.2s）✅ UIPreviewBuilder → unit-info-panel-{main/default/screen}.json |
| GeneralQuickViewPanel.ts  | doc_ui_0003 §v3-5                                                  | 概: Zone1 頭像點擊觸發武將快覽彈窗（名稱/HP/攻防/戰法，敵方遮蔽）✅ UIPreviewBuilder → general-quickview-{main/default/screen}.json |
| ChildPanelBase.ts | doc_ui_0049 | 概: UCUF 子面板基類 |
| CompositePanel.ts | doc_ui_0049 | 概: UCUF 複合面板容器 |
| UIPreviewTextCatalog.ts | doc_ui_0049 | 概: 預覽文字目錄（佔位文字字典）|
| UIRarityMark.ts | doc_ui_0049 | 概: 稀有度標記元件 |
| UIRarityMarkVisual.ts | doc_ui_0049 | 概: 稀有度標記視覺渲染器 |
| UITemplateResolver.ts | doc_ui_0049 | 概: UI 模板解析器（template param 展開）|
| UIValidationRunner.ts | doc_ui_0049 | 概: UI 規格驗證執行器 |
| AssetRegistryEntry.ts | doc_ui_0026 | 概: UCUF 資源登記簿型別定義 |
| BattleReviewController.ts | doc_spec_0015 | 概: 戰報彈窗：離線戰鬥快照回看（純邏輯，不依賴 cc）。 |
| BreedingPreviewPresenter.ts | doc_spec_0003 | 概: 結緣介面的 EP 預覽文字（純邏輯，不依賴 cc） |
| BreedingTexts.ts | doc_spec_0028 | 概: 結緣畫面文案（PROG-2-0526）。純邏輯，不依賴 cc。 |
| CssClipPathMask.ts | doc_ui_0049 | 概: （無檔頭說明） |
| DailyReportController.ts | doc_spec_0015 | 概: 登入面板：三國日報與晨報（純邏輯，不依賴 cc）。 |
| DailySubsidyNotice.ts | doc_spec_0032 | 概: 每日補貼的大廳提示文字（純邏輯，不依賴 cc）。 |
| DataBindingValidator.ts | doc_ui_0026 | 概: UCUF 資料綁定驗證器 |
| DestinyOpeningController.ts | doc_spec_0031 | 概: 新局宿命轉蛋畫面的流程（純邏輯，不依賴 cc）。 |
| DestinyShopController.ts | doc_spec_0042 | 概: 天命商店兌換畫面的流程（純邏輯，不依賴 cc） |
| DomesticPanelController.ts | 未登錄：WBS v3 MVP-10 大廳內政畫面；DomesticTasks.ts 產出 | 概: 大廳內政 5 大任務面板的流程（純邏輯，不依賴 cc） |
| EnvScoutPresenter.ts | doc_spec_0041 | 概: 環境偵察面板的文字（純邏輯，不依賴 cc） |
| FateScriptTexts.ts | doc_spec_0043 | 概: 宿命揭曉文案（PROG-2-0735，承接 FATE-11 / PROG-2-0734）。純邏輯，不依賴 cc。 |
| FixedSlotPager.ts | doc_ui_0049 | 概: 固定格式列表的分頁切片（純邏輯，不依賴 cc） |
| GachaActionBindings.ts | doc_spec_0042 | 概: （無檔頭說明） |
| GachaFlowCoordinator.ts | doc_spec_0042 | 概: 支援卡池召喚（PROG-2-1085）：扣支援券、抽支援卡目錄裡的武將；抽到的只變成教官卡，不入名冊。 |
| GachaPoolGuidePresenter.ts | doc_spec_0042 | 概: 卡池頁與名將詳情的定位文字（純邏輯，不依賴 cc） |
| GachaPreviewStateRoute.ts | 未標出處 | 概: （無檔頭說明） |
| GearSlotPickController.ts | doc_spec_0174, doc_ui_0012 | 概: 寶頁格位點擊後的選取面板流程（純邏輯，不依賴 cc）。 |
| GeneralAvatarLoader.ts | 未登錄：PROG-2-1107（武將小人頭；路徑規則見 data/general-art | 概: 依 GeneralArtPaths 的候選順序載入武將頭像／立繪 SpriteFrame。 |
| GeneralJournalController.ts | doc_spec_0015 | 概: 武將日誌回看抽屜的畫面流程（純邏輯，不依賴 cc）。 |
| GeneralLifecyclePresenter.ts | doc_spec_0016, doc_spec_0018 | 概: 武將詳情與培育畫面的生命週期文字（純邏輯，不依賴 cc） |
| GeneralVersionGalleryController.ts | doc_spec_0005 | 概: 同名武將版本圖鑑畫面的狀態（PROG-2-0708 cc 接線，純邏輯，不依賴 cc） |
| GovernorHallController.ts | doc_spec_0037 | 概: 太守府畫面的流程（純邏輯，不依賴 cc）。 |
| HallBoardPanelController.ts | doc_spec_0002, doc_spec_0039 | 概: 大廳任務牆與武將點位的畫面流程（純邏輯，不依賴 cc）。 |
| HallDetailActionStates.ts | doc_spec_0002 | 概: 任務詳情彈窗四顆行動按鈕（再探 / 執行 / 等待 / 委任）的啟用狀態，純邏輯，不依賴 cc。 |
| HallExecuteConfirm.ts | doc_spec_0002 | 概: 任務詳情「執行」遇到情報不足時的確認流程（純邏輯，不依賴 cc）。 |
| HallMissionDialogState.ts | doc_spec_0002 | 概: 大廳任務列 → 任務詳情彈窗的 state 與委任結果文字（純邏輯，不依賴 cc）。 |
| HiddenFactorText.ts | doc_spec_0019 | 概: 武將血脈頁「隱藏因子」一行的文案（純邏輯，不依賴 cc） |
| InitialShowcaseController.ts | doc_spec_0031 | 概: 六位初始名將逐一登場的翻頁流程（純邏輯，不依賴 cc）。 |
| ItemBagController.ts | doc_spec_0036 | 概: 道具背包畫面的流程（純邏輯，不依賴 cc）。 |
| JobChangeController.ts | doc_spec_0043 | 概: 20 歲成人禮轉職選單的流程（純邏輯，不依賴 cc） |
| JournalHubController.ts | 未登錄：WBS v7 JRN-06（晨報彈窗與派遣板的大廳入口）；PROG-2-0478 | 概: 大廳晨報彈窗與派遣板的畫面流程（純邏輯，不依賴 cc）。 |
| LifeVitalityPresenter.ts | doc_spec_0018, doc_spec_0033 | 概: 壽命 / 精力顯示（純邏輯，不依賴 cc） |
| LobbyCityHubController.ts | doc_spec_0002 | 概: 主大廳「城池主視覺」的純邏輯： |
| LobbyOpeningPanels.ts | doc_spec_0031 | 概: 開場信件面板（PROG-2-1305）。就緒條件與新手引導相同：新局要等宿命開局開始後才開， |
| LongevityPillController.ts | doc_spec_0018, doc_spec_0032 | 概: 延壽丹使用鈕的流程（純邏輯，不依賴 cc） |
| LuckTexts.ts | doc_spec_0035 | 概: 運氣（LUK）的 UI 字串、天命波動顯示與劇本文案（純邏輯，不依賴 cc） |
| MentorBorrowView.ts | doc_spec_0026 | 概: 好友借用教官的選擇列（純邏輯，不依賴 cc） |
| MentorCardDetailController.ts | doc_spec_0027 | 概: 教官卡詳情畫面的狀態（MENT-13 cc 接線，純邏輯，不依賴 cc） |
| MentorHoldingRows.ts | doc_spec_0027 | 概: 「我的教官卡」列表的列資料（PROG-2-1097，純邏輯，不依賴 cc） |
| MercenaryNameplateRows.ts | doc_spec_0029 | 概: 傭兵名牌列的純資料（不依賴 cc）。 |
| MercenaryPanelController.ts | doc_spec_0029 | 概: 傭兵面板的畫面流程（純邏輯，不依賴 cc）。 |
| NurtureFlowViewApplier.ts | doc_ui_0031 | 概: 把 NurtureFlowController / BondingSetupController 吐出的 view 套到 UCUF 組出來… |
| NurtureGraduationView.ts | doc_spec_0026 | 概: 畢業紀錄檢視的列（純邏輯，不依賴 cc） |
| OfficerPermissionText.ts | doc_spec_0014 | 概: 官職頁的已解鎖權限文字（純邏輯，不依賴 cc） |
| OnboardingFlowController.ts | doc_spec_0031, doc_spec_0045 | 概: 新手 3 段式引導的顯示與觸發（純邏輯，不依賴 cc） |
| OpeningAct1Cues.ts | doc_spec_0031 | 概: 第一幕四個分鏡的演出提示（純邏輯，不依賴 cc） |
| OpeningIntroController.ts | doc_spec_0031 | 概: 第一幕「情懷定錨」的逐頁流程（純邏輯，不依賴 cc）。 |
| PortraitFrameFit.ts | 未登錄：使用者裁定 2026-10-26（每張立繪比例相同、頭高一致，左右與下身可被框切 | 概: 把全身立繪擺進瘦長框：臉高統一、眼睛同高、臉中心對齊框中線（純數學，不依賴 cc） |
| PortraitGallery.ts | 未登錄：使用者裁定 2026-10-26（紅顏、名將池一頁六框全身立繪，超過六位翻頁）； | 概: 「一頁六框立繪」的分頁與選取（純邏輯，不依賴 cc） |
| PrisonerPopupController.ts | doc_spec_0021 | 概: 俘虜四選一彈窗的流程（純邏輯，不依賴 cc） |
| RankProgressText.ts | doc_spec_0014 | 概: 官職進度開窗的文字（純邏輯，不依賴 cc） |
| BloodlineVignetteText.ts | doc_ui_0012, doc_spec_0011 | 概: 血統小傳開窗的文字（純邏輯，不依賴 cc）；暫定解鎖規則：取得開 1 格、每轉多 1 格、命紋覺醒全開（PROG-2-1428） |
| RecruitHallController.ts | 未登錄：使用者裁定 2026-10-25（MVP 至少 20 位武將可選）；gacha- | 概: 大廳「招賢館」畫面的流程（純邏輯，不依賴 cc） |
| RedFaceShowcaseController.ts | doc_spec_0031 | 概: 紅顏展示畫面的流程（純邏輯，不依賴 cc）。 |
| RelationEventLogText.ts | doc_spec_0024 | 概: 戰場關係事件的戰報文字（PROG-2-1421，純邏輯，不依賴 cc） |
| RelationTexts.ts | doc_spec_0024 | 概: 相性關係的劇本與標籤字串（純邏輯，不依賴 cc） |
| RetireReviewController.ts | doc_spec_0019 | 概: 退役戰績回顧與季度戰損報告的畫面流程（純邏輯，不依賴 cc） |
| RetirementFlowController.ts | doc_spec_0018 | 概: （無檔頭說明） |
| RivalDiplomacyController.ts | doc_spec_0020 | 概: 大廳「外交／出征」畫面的流程（純邏輯，不依賴 cc） |
| RuntimeRuleChecker.ts | doc_ui_0026 | 概: UCUF Runtime 規則檢查器 |
| SageOracleController.ts | doc_spec_0006, doc_spec_0009 | 概: 名士占卜畫面的流程（純邏輯，不依賴 cc） |
| SameNameTexts.ts | doc_spec_0005 | 概: 同名武將的劇本與字串（純邏輯，不依賴 cc） |
| SeasonTexts.ts | doc_spec_0034 | 概: 大廳季節文案（PROG-2-0730，承接 TIME-09 / PROG-2-0727）。純邏輯，不依賴 cc。 |
| SortieSetupController.ts | doc_spec_0040 | 概: 出征編制畫面的流程（純邏輯，不依賴 cc） |
| SpiritCardDetailTexts.ts | doc_spec_0023 | 概: 英靈卡詳情的血脈灌注區文字（純邏輯，不依賴 cc） |
| SpiritCodexController.ts | doc_spec_0018 | 概: 英靈圖鑑：列出已死武將的英靈卡與精華快照（純邏輯，不依賴 cc） |
| SpiritFamilyOverviewRoute.ts | doc_spec_0022 | 概: （無檔頭說明） |
| TacticAvailabilityPresenter.ts | doc_spec_0041 | 概: 每個戰法目前能不能施放、不能的話原因是什麼（純邏輯，不依賴 cc） |
| TournamentPanelController.ts | doc_spec_0007 | 概: 名將挑戰賽彈窗：賽季卡、報名、參戰（純邏輯，不依賴 cc）。 |
| UCUFRuleRegistry.ts | doc_ui_0026 | 概: 動態規則注冊器 |
| UIEvents.ts | doc_ui_0049 | 概: UI 內部事件總線常數 |
| UILabelText.ts | doc_index_0007 | 概: layout label 的顯示文字解析（純邏輯，不依賴 cc） |
| UINodePool.ts | doc_ui_0049 | 概: Fragment Node 物件池 |
| UIScreenRuntimeStateRegistry.ts | doc_ui_0049 | 概: （無檔頭說明） |
| UIVariantRouter.ts | doc_ui_0049 | 概: Apply runtime-route.json sidecars produced by |
| UltimateActionView.ts | doc_ui_0012 | 概: 五階血脈傳承奧義的操作區文字與按鈕狀態（PROG-2-0720；PROG-2-0743 文案改走語系表；PROG-2-0749 升星素材說… |
| UltimateCodexTexts.ts | doc_spec_0030 | 概: 奧義圖鑑的列表文字（純邏輯，不依賴 cc） |
| UltimateStageSummary.ts | doc_ui_0012 | 概: 五階血脈傳承奧義的摘要文字（PROG-2-0740，五階三步之三；PROG-2-0743 文案改走語系表）。純邏輯，不依賴 cc。 |
| UltimateTexts.ts | doc_ui_0012 | 概: 五階血脈傳承奧義操作區與摘要的文案（純邏輯，不依賴 cc） |
| VitalityPillController.ts | doc_spec_0032 | 概: 補元散使用鈕的流程（純邏輯，不依賴 cc） |
| VitalityScriptTexts.ts | doc_spec_0033 | 概: 精力劇本文案（PROG-2-0729，承接 VIT-09 / PROG-2-0728）。純邏輯，不依賴 cc。 |
| WarehousePanelController.ts | 未登錄：WBS v3 BAG-02（主城倉庫：50 格、擴容 +20、上限 200）；B | 概: 倉庫面板的畫面流程（純邏輯，不依賴 cc）。 |
| WishAltarController.ts | doc_spec_0002, doc_spec_0032 | 概: 大廳許願祭壇彈窗（純邏輯，不依賴 cc）。 |

#### UI Core Panels (`assets/scripts/ui/core/panels/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| AttributePanel.ts | doc_ui_0049 | 概: 屬性面板（數值展示）|
| GridPanel.ts | doc_ui_0049 | 概: 格狀排列面板 |
| ProgressBarPanel.ts | doc_ui_0049 | 概: 進度條面板 |
| RadarChartPanel.ts | doc_ui_0049 | 概: 雷達圖面板 |
| ScrollListPanel.ts | doc_ui_0049 | 概: 捲動列表面板 |
| EditableTextPanel.ts | doc_index_0007 | 概: EditableTextPanel |

#### UI Panels (`assets/scripts/ui/panels/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BloodlineTreePanel.ts | doc_tech_0009 §2.3 | 概: 祖先樹 UI，從 PersonRegistry / BloodlineGraph 讀資料 |
| GeneralDataDebugPanel.ts | doc_tech_0009 §5 M7 | 概: DEV 模式武將資料偵錯面板（uid / 名稱搜尋 DSL）|
| ActionLogDebugPanel.ts | doc_tech_0013 | 概: （無檔頭說明） |

#### UI Layers & Scenes (`assets/scripts/ui/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| UILayer.ts | doc_ui_0027 | 概: UI 面板基類（show/hide） |
| LoadingScene.ts | doc_spec_0031, doc_ui_0051, doc_art_0002 | 概: 過場載入場景，同時也是 screen-driven preview hub（`previewMode` + `previewTarget` + `previewVariant`）；以 content state + applicator 驅動 Gacha / SpiritTally preview 注入 |
| LobbyScene.ts | doc_spec_0031, doc_spec_0002, doc_spec_0014, doc_spec_0016, doc_ui_0012, doc_spec_0015, doc_spec_0007, doc_spec_0032, doc_spec_0038, doc_spec_0030 | 概: 大廳（LobbyMain + 武將列表 + 詳情）；含 `onClickGeneralDetailOverviewSmoke()` 與 `onClickGeneralDetailSkillsSmoke()` smoke routes，可直接驗證 `LobbyMain -> GeneralListPanel -> GeneralDetailComposite -> Skills child` 的正式 skill seed 資料流 |
| LoginScene.ts | doc_spec_0031 | 概: 登入畫面 |

#### Battle (`assets/scripts/battle/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleTypes.ts | doc_index_0007 | 概: @spec-source → 見 docs/cross-reference-index.md |

#### Battle / Orchestrators (`assets/scripts/battle/orchestrators/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleRuntimeOrchestrator.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |

#### Battle / Runtime (`assets/scripts/battle/runtime/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleAutoResolve.ts | 未登錄：使用者裁定 2026-10-25（戰鬥先用自動模擬數值結果直接跳結算）；PROG | 概: 戰鬥「自動」鈕的數值結算（純 TS，不依賴 cc）。 |
| BattleCombatResolver.ts | doc_spec_0040, doc_tech_0015, doc_spec_0041 | 概: 水域合攻（PM 暫定，PROG-2-0584）：攻擊方站在河流格且有 naval-combined-attack 時， |
| BattleDuelResolver.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleGeneralDuelFlow.ts | doc_index_0007 | 概: 單挑最多交手回合數（暫定，規格未定義）。達上限仍雙方存活 → 平局，單挑結束、不產生死亡、不套用懲罰。 |
| BattleRuntimeContext.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleRuntimeContract.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleSkillDispatcher.ts | doc_spec_0038, doc_spec_0040 | 概: 根據武將的 skillId 分發至具體技能實作。 |
| BattleSoloBreach.ts | doc_spec_0038 | 概: 回合開始重算單騎破陣：帶者（武將化身單位）正交 1 格無存活友軍則 ATK ×1.3，否則 ×1。 |
| BattleTileBuffLifecycleManager.ts | doc_index_0007 | 概: @spec-source → 見 docs/cross-reference-index.md |
| BattleTurnManager.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleUnitSpawner.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleVictoryResolver.ts | doc_spec_0040, doc_tech_0015 | 概: 營帳佔領（夜襲／埋伏場景，PM 暫定）：回合結束時，我方任一存活單位站在營帳格上即勝利。 |

#### Battle / Runtime / Phases (`assets/scripts/battle/runtime/phases/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleAutoMovePhase.ts | doc_spec_0040, doc_tech_0015 | 概: 七進七出（Ghost_Move）：沿前進方向找最遠的有效終點，穿過敵軍不停下，每個穿過的敵軍各扣一次傷害。 |
| BattleCombatPhase.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleEnemyDeployPhase.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattlePhaseExecutor.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleSpecialResolvePhase.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleTileEffectPhase.ts | doc_spec_0044, doc_spec_0041 | 概: （無檔頭說明） |

#### Battle / Runtime / Tempo (`assets/scripts/battle/runtime/tempo/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleTempoController.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| TurnBasedTempoController.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |

#### Battle / Shared (`assets/scripts/battle/shared/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleAudio.ts | doc_index_0007 | 概: 戰鬥音效邏輯鍵。 |
| BattleSceneMode.ts | doc_index_0007 | 概: @spec-source → 見 docs/cross-reference-index.md |
| BattleTacticBehavior.ts | doc_spec_0038 | 概: 依目前天氣重算水攻淹沒範圍（PROG-2-0407）： |
| EnemyTacticBoard.ts | doc_spec_0038 | 概: 敵方選技的戰場數值來源（純邏輯，不依賴 cc） |
| EnemyTacticCandidates.ts | doc_spec_0038 | 概: 敵方戰法候選來源（純邏輯，不依賴 cc） |
| EnemyTacticNumbers.ts | doc_spec_0038 | 概: 敵方戰法數值填入與選技（純邏輯，不依賴 cc） |
| ForcedMoveTile.ts | doc_spec_0044 | 概: 位移格的推移判定（純邏輯，不依賴 cc） |
| FormationZone.ts | doc_spec_0038 | 概: 八陣圖持續防禦區（PROG-2-0760／0761）。 |
| GhostMovePath.ts | doc_spec_0038 | 概: 七進七出的穿透路徑規則（純邏輯，不依賴 cc） |
| HazardVisualSkin.ts | doc_spec_0044 | 概: Hazard 格子的 Decal 與 VFX 換皮掛點（純邏輯，不依賴 cc） |
| Morale.ts | doc_spec_0038 | 概: 士氣持續回合（PROG-2-0770，暫定值，記在待辦檔）。 |
| PushMove.ts | doc_spec_0038 | 概: 戰法位移（push，PROG-2-0767）純邏輯。 |
| SceneGambitTrigger.ts | doc_spec_0039 | 概: 場景戰法發動判定（WBS v7 SCN-03，PROG-2-0596） |
| StealthTile.ts | doc_spec_0044 | 概: 掩體格的隱蔽判定（純邏輯，不依賴 cc） |
| TacticAiRules.ts | doc_spec_0038, doc_data_0002 | 概: 戰法 AI 選技規則（純邏輯，不依賴 cc） |
| TacticDamageEstimate.ts | doc_spec_0038 | 概: 戰法預估傷害（純邏輯，不依賴 cc） |
| TacticVfxHooks.ts | doc_spec_0038 | 概: 戰法特效與掠奪飄字的程式掛點（純邏輯，不依賴 cc） |
| TallyPassive.ts | doc_spec_0012 | 概: 虎符被動的通用掛點（不依賴 cc） |
| TileStateRules.ts | doc_spec_0044 | 概: 格子狀態分類（WBS GRD-01，血統與戰場格子規格；PROG-2-0589 依實際時機校正）。 |
| UnitDot.ts | doc_spec_0038 | 概: 單位持續傷害（毒箭，PROG-2-0766）。 |
| WisdomMeter.ts | doc_spec_0039 | 概: 軍師智謀能量累積（WBS v7 SCN-10 純邏輯，PROG-2-0616） |

#### Battle / Skills (`assets/scripts/battle/skills/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleSkillDamageResolver.ts | doc_spec_0038 | 概: 精銳突擊衝鋒（PROG-2-0756）：施放者與目標在同一直線上時，基礎傷害 × chargeMultiplier。 |
| BattleSkillExecutor.ts | doc_spec_0038 | 概: （無檔頭說明） |
| BattleSkillModuleTags.ts | doc_spec_0038 | 概: 戰法傷害投射模組代號（戰法系統規格 G-6-1）。 |
| BattleSkillProfiles.ts | doc_spec_0038, doc_spec_0012 | 概: --- 虎符特殊戰法殼（PROG-2-0928，TRP-15）：規格 34 條中尚未實作效果的 23 條 --- |
| BattleSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| BattleSkillResolverFactory.ts | doc_spec_0038 | 概: （無檔頭說明） |
| BattleSkillTargetSelector.ts | doc_spec_0038 | 概: 技能射程（G-1 百步穿楊）：施放者部隊的攻擊射程 ＋ rangeBonus。 |
| SkillEffectFormulas.ts | doc_spec_0038 | 概: 戰法效果純公式（WBS v8 TAC-10／TAC-11 前置，PROG-2-0751） |
| SkillGridGeometry.ts | doc_spec_0038 | 概: 戰法格子幾何純函式（PROG-2-0754） |
| SkillStatusTicks.ts | doc_spec_0038 | 概: 戰法狀態回合遞減純函式（PROG-2-0753） |

#### Battle / Skills / Adapters (`assets/scripts/battle/skills/adapters/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleSkillSourceTranslator.ts | doc_spec_0038 | 概: （無檔頭說明） |
| BloodlineTacticAdapter.ts | doc_spec_0038, doc_spec_0011 | 概: （無檔頭說明） |
| MentorTacticAdapter.ts | doc_spec_0027, doc_spec_0038 | 概: （無檔頭說明） |
| SceneGambitAdapter.ts | doc_spec_0039 | 概: （無檔頭說明） |
| SeedTacticAdapter.ts | doc_spec_0038 | 概: （無檔頭說明） |
| TigerTallyTacticAdapter.ts | doc_spec_0012, doc_spec_0038 | 概: （無檔頭說明） |

#### Battle / Skills / Resolvers (`assets/scripts/battle/skills/resolvers/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BuffDebuffSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| CounterSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| DotSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| FireGodHuntSkillResolver.ts | doc_spec_0038 | 概: 火神狩獵（push-fire，PROG-2-0771）：單體敵軍遠離施放者 pushSteps 格， |
| FormationZoneSkillResolver.ts | doc_spec_0038 | 概: 八陣圖（PROG-2-0761）：以施放者腳下為中心，3x3 區域成為持續防禦區。 |
| HealSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| LinkSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| MoraleSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| ProjectedDamageSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| PushSkillResolver.ts | doc_spec_0038 | 概: 位移（push）：以施放者為中心 pushRadius（預設 3x3）內的敵軍遠離施放者 pushSteps 格（PROG-2-0767）。 |
| ResetSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| RootSkillResolver.ts | doc_spec_0038 | 概: 定身（root）：以施放者為中心的 3x3 內所有敵軍施加 Rooted（PROG-2-0764）。 |
| SlowSkillResolver.ts | doc_spec_0038 | 概: 緩速（slow）：目標施加 Slow，下一回合移動力減少（PROG-2-0765）。 |

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

#### Ui / Components / Character-Ds3 (`assets/scripts/ui/components/character-ds3/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| CharacterDs3AptitudeChild.ts | doc_ui_0012 | 概: doc_other_0009 — generated by generate-tab-childpanels.js (M33) |
| CharacterDs3BloodlineChild.ts | doc_ui_0012 | 概: doc_other_0009 — generated by generate-tab-childpanels.js (M33) |
| CharacterDs3EquipChild.ts | doc_ui_0012 | 概: doc_other_0009 — generated by generate-tab-childpanels.js (M33) |
| CharacterDs3OverviewChild.ts | doc_ui_0012 | 概: （無檔頭說明） |
| CharacterDs3StatsChild.ts | doc_ui_0012 | 概: （無檔頭說明） |
| CharacterDs3TacticsChild.ts | doc_ui_0012 | 概: doc_other_0009 — generated by generate-tab-childpanels.js (M33) |
| GeneralDetailChromePresenter.ts | doc_ui_0012 | 概: 依當前 tab 同步 PortraitImage 可見性。 |

#### Ui / Components / Gacha-Ds3 (`assets/scripts/ui/components/gacha-ds3/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| GachaDs3GeneralChild.ts | doc_spec_0042 | 概: doc_other_0009 — generated by generate-tab-childpanels.js (M33) |
| GachaDs3LegendaryChild.ts | doc_spec_0042 | 概: doc_other_0009 — generated by generate-tab-childpanels.js (M33) |
| GachaDs3SupportChild.ts | 未登錄：WBS v6 OPEN-10（紅顏池展示畫面，接在轉蛋 Support 分頁下方 | 概: doc_other_0009 — generated by generate-tab-childpanels.js (M33) |

#### Ui / Components / General-Detail (`assets/scripts/ui/components/general-detail/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| GeneralDetailAptitudeChild.ts | doc_ui_0012 | 概: GeneralDetailAptitudeChild |
| GeneralDetailBasicsChild.ts | doc_ui_0012 | 概: GeneralDetailBasicsChild |
| GeneralDetailBloodlineChild.ts | doc_ui_0012, doc_spec_0011 | 概: GeneralDetailBloodlineChild |
| GeneralDetailExtendedChild.ts | doc_ui_0012 | 概: GeneralDetailExtendedChild |
| GeneralDetailFormatters.ts | doc_ui_0012 | 概: GeneralDetailFormatters |
| GeneralDetailOverviewBindPathPolicy.ts | doc_ui_0012 | 概: （無檔頭說明） |
| GeneralDetailOverviewVisuals.ts | doc_ui_0012 | 概: GeneralDetailOverviewVisuals |
| GeneralDetailRecordChild.ts | doc_ui_0012, doc_spec_0019 | 概: GeneralDetailRecordChild |
| GeneralDetailSkillsChild.ts | doc_ui_0012 | 概: GeneralDetailSkillsChild |
| GeneralDetailStatsChild.ts | doc_ui_0012 | 概: GeneralDetailStatsChild |
| TabBindPathPolicy.ts | doc_ui_0012 | 概: TabBindPathPolicy |

#### Ui / Components / Portrait (`assets/scripts/ui/components/portrait/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| PortraitSoftMask.ts | doc_ui_0012 | 概: （無檔頭說明） |

#### Ui / Dev (`assets/scripts/ui/dev/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| GachaDevOverlay.ts | doc_spec_0042 | 概: disable-next-line @typescript-eslint/no-unused-vars |

#### Ui / Platform / Cocos (`assets/scripts/ui/platform/cocos/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| CocosCompositeRenderer.ts | doc_ui_0049 | 概: （無檔頭說明） |
| CocosNodeFactory.ts | doc_ui_0049 | 概: CocosNodeFactory |
| CocosScrollVirtualizer.ts | doc_index_0007 | 概: CocosScrollVirtualizer |

#### Ui / Platform / Unity (`assets/scripts/ui/platform/unity/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| UnityNodeFactory.ts | doc_ui_0049 | 概: UnityNodeFactory (stub) |

#### UI Spec JSON（三層 JSON 系統；由 `node tools_node/rebuild-crossref.js --rebuild-screens` 自動產生）

| Screen | Layout | Skin | Screen 檔 | Bundle | 引用的 TS（assets/scripts 相對路徑） |
|---|---|---|---|---|---|
| action-command-screen | action-command-main.json | action-command-default.json | action-command-screen.json | battle_ui | ui/components/ActionCommandComposite.ts<br>ui/components/ActionCommandPanel.ts |
| battle-hud-screen | battle-hud-screen.json | battle-hud-screen.skin.json | battle-hud-screen.json | battle_ui | ui/components/BattleHUD.ts<br>ui/components/BattleHUDComposite.ts |
| battle-log-screen | battle-log-main.json | battle-log-default.json | battle-log-screen.json | battle_ui | ui/components/BattleLogComposite.ts<br>ui/components/BattleLogPanel.ts |
| bloodline-mirror-awakening-screen | bloodline-mirror-loading-main.json | bloodline-mirror-loading-default.json | bloodline-mirror-awakening-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| bloodline-mirror-loading-screen | bloodline-mirror-loading-main.json | bloodline-mirror-loading-default.json | bloodline-mirror-loading-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| bonding-setup-screen | bonding-setup-main.json | bonding-setup-screen.skin.json | bonding-setup-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| character-ds3-main | character-ds3-main.json | character-ds3-main.skin.json | character-ds3-main.json | resources | ui/components/GeneralDetailComposite.ts<br>ui/core/UIVariantRouter.ts<br>ui/scenes/LoadingScene.ts 等 4 檔 |
| character-ds3 | character-ds3.json | character-ds3.skin.json | character-ds3.json | resources | （程式未引用） |
| deploy-panel-screen | deploy-panel-main.json | deploy-panel-default.json | deploy-panel-screen.json | battle_ui | ui/components/DeployComposite.ts |
| destiny-opening-screen | destiny-opening-main.json | destiny-opening-screen.skin.json | destiny-opening-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| domestic-screen | domestic-main.json | domestic-screen.skin.json | domestic-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| duel-challenge-screen | duel-challenge-main.json | duel-challenge-default.json | duel-challenge-screen.json | battle_ui | ui/components/DuelChallengeComposite.ts<br>ui/scenes/LoadingScene.ts |
| elite-troop-codex-rail-screen | elite-troop-codex-rail-main.json | elite-troop-codex-rail-default.json | elite-troop-codex-rail-screen.json | lobby_ui | （程式未引用） |
| elite-troop-codex-screen | elite-troop-codex-main.json | elite-troop-codex-default.json | elite-troop-codex-screen.json | lobby_ui | ui/components/EliteTroopCodexComposite.ts<br>ui/scenes/LoadingScene.ts |
| gacha-ds3 | gacha-ds3.json | gacha-ds3.skin.json | gacha-ds3.json | lobby_ui | ui/core/GachaFlowCoordinator.ts |
| gacha-main-screen | gacha-preview-main.json | gacha-default.json | gacha-main-screen.json | lobby_ui | （程式未引用） |
| gacha-pull-result | gacha-pull-result.json | gacha-pull-result.skin.json | gacha-pull-result.json | lobby_ui | ui/core/GachaFlowCoordinator.ts |
| gacha-screen | — (多子畫面) | — | gacha-screen.json | — | （程式未引用） |
| gacha-shop-ds3 | gacha-shop-ds3.json | gacha-shop-ds3.skin.json | gacha-shop-ds3.json | lobby_ui | （程式未引用） |
| general-detail-bloodline-v3-screen | general-detail-bloodline-v3-main.json | general-detail-bloodline-v3-default.json | general-detail-bloodline-v3-screen.json | lobby_ui | （程式未引用） |
| general-detail-screen | general-detail-main.json | general-detail-default.json | general-detail-screen.json | lobby_ui | ui/components/GeneralDetailComposite.ts |
| general-detail-unified-screen | general-detail-unified-main.json | general-detail-unified-default.json | general-detail-unified-screen.json | lobby_ui | ui/components/GeneralDetailComposite.ts<br>ui/core/UIVariantRouter.ts<br>ui/scenes/LoadingScene.ts |
| general-list-screen | general-list-main.json | general-list-default.json | general-list-screen.json | lobby_ui | ui/components/GeneralListComposite.ts<br>ui/scenes/LoadingScene.ts |
| general-portrait-screen | general-portrait-main.json | general-portrait-default.json | general-portrait-screen.json | lobby_ui | ui/components/GeneralPortraitComposite.ts |
| general-quickview-screen | general-quickview-main.json | general-quickview-default.json | general-quickview-screen.json | battle_ui | ui/components/GeneralQuickViewPanel.ts |
| general-version-gallery-screen | general-version-gallery-main.json | nurture-flow-default.json | general-version-gallery-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| hall-board-screen | hall-board-main.json | hall-board-screen.skin.json | hall-board-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| job-change-screen | job-change-main.json | job-change-screen.skin.json | job-change-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| lobby-deck-select-screen | lobby-deck-select-main.json | lobby-deck-select-default.json | lobby-deck-select-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| lobby-lead-select-screen | lobby-lead-select-main.json | lobby-lead-select-default.json | lobby-lead-select-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| lobby-leaderboard-screen | lobby-leaderboard-main.json | lobby-leaderboard-default.json | lobby-leaderboard-screen.json | lobby_ui | ui/components/LobbyLeaderboardComposite.ts |
| lobby-main-screen | lobby-main-screen.json | lobby-main-screen.skin.json | lobby-main-screen.json | lobby_ui | ui/scenes/LoadingScene.ts<br>ui/scenes/LobbyScene.ts |
| lobby-mission-detail-dialog-screen | lobby-mission-detail-dialog-main.json | lobby-mission-detail-dialog-default.json | lobby-mission-detail-dialog-screen.json | lobby_ui | ui/components/LobbyMissionDetailDialogComposite.ts<br>ui/scenes/LoadingScene.ts |
| lobby-officer-hud-screen | lobby-officer-hud-main.json | lobby-officer-hud-default.json | lobby-officer-hud-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| lobby-officer-page-screen | lobby-officer-page-main.json | lobby-officer-page-default.json | lobby-officer-page-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| lobby-season-hud-screen | lobby-season-hud-main.json | lobby-season-hud-default.json | lobby-season-hud-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| mentor-borrow-screen | mentor-borrow-main.json | mentor-borrow-default.json | mentor-borrow-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| mentor-card-detail-screen | mentor-card-detail-main.json | nurture-flow-default.json | mentor-card-detail-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| mercenary-panel-screen | mercenary-panel-main.json | mercenary-panel-screen.skin.json | mercenary-panel-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| network-status-screen | network-status-main.json | network-status-default.json | network-status-screen.json | ui_common | （程式未引用） |
| nurture-flow-screen | nurture-flow-main.json | nurture-flow-default.json | nurture-flow-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| nurture-graduation-screen | nurture-graduation-main.json | nurture-graduation-default.json | nurture-graduation-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| nurture-session-screen | nurture-session-main.json | nurture-session-default.json | nurture-session-screen.json | lobby_ui | （程式未引用） |
| onboarding-tutorial-screen | onboarding-tutorial-main.json | onboarding-tutorial-screen.skin.json | onboarding-tutorial-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| opening-intro-screen | opening-intro-main.json | opening-intro-screen.skin.json | opening-intro-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| prisoner-popup-screen | prisoner-popup-main.json | prisoner-popup-screen.skin.json | prisoner-popup-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| recruit-hall-screen | recruit-hall-main.json | recruit-hall-screen.skin.json | recruit-hall-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| red-face-showcase-screen | red-face-showcase-main.json | red-face-showcase-screen.skin.json | red-face-showcase-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| result-popup-screen | result-popup-main.json | result-popup-default.json | result-popup-screen.json | ui_common | ui/components/ResultPopup.ts<br>ui/components/ResultPopupComposite.ts |
| retire-review-screen | retire-review-main.json | retire-review-screen.skin.json | retire-review-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| rival-diplomacy-screen | rival-diplomacy-main.json | rival-diplomacy-screen.skin.json | rival-diplomacy-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| sage-oracle-screen | sage-oracle-main.json | sage-oracle-screen.skin.json | sage-oracle-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| sandtable-territory-screen | sandtable-territory-main.json | sandtable-territory-default.json | sandtable-territory-screen.json | lobby_ui | ui/components/SandtableTerritoryComposite.ts |
| season-report-screen | season-report-main.json | season-report-default.json | season-report-screen.json | lobby_ui | ui/components/SeasonReportComposite.ts |
| shop-main-screen | shop-main-main.json | shop-main-default.json | shop-main-screen.json | lobby_ui | ui/scenes/LoadingScene.ts<br>ui/scenes/LobbyScene.ts |
| sortie-setup-screen | sortie-setup-main.json | sortie-setup-screen.skin.json | sortie-setup-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| spirit-codex-screen | spirit-codex-main.json | spirit-codex-screen.skin.json | spirit-codex-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| spirit-tally-detail-screen | spirit-tally-detail-main.json | spirit-tally-detail-default.json | spirit-tally-detail-screen.json | lobby_ui | ui/scenes/LoadingScene.ts |
| support-card-screen | — (多子畫面) | — | support-card-screen.json | lobby_ui | （程式未引用） |
| tiger-tally-detail-panel-screen | tiger-tally-detail-panel-main.json | tiger-tally-detail-panel-default.json | tiger-tally-detail-panel-screen.json | battle_ui | ui/components/TigerTallyDetailComposite.ts |
| tiger-tally-screen | tiger-tally-main.json | tiger-tally-default.json | tiger-tally-screen.json | battle_ui | ui/components/TigerTallyComposite.ts<br>ui/components/TigerTallyPanel.ts |
| toast-message-screen | toast-message-main.json | toast-message-default.json | toast-message-screen.json | common_ui | ui/components/ToastMessageComposite.ts |
| ultimate-select-popup-screen | ultimate-select-popup-main.json | ultimate-select-popup-default.json | ultimate-select-popup-screen.json | battle_ui | ui/components/UltimateSelectPopupComposite.ts |
| unit-info-panel-screen | unit-info-panel-main.json | unit-info-panel-default.json | unit-info-panel-screen.json | battle_ui | ui/components/UnitInfoComposite.ts<br>ui/components/UnitInfoPanel.ts |
| v2-workflow-skip-editor | v2-workflow-skip-editor.json | v2-workflow-skip-editor.skin.json | v2-workflow-skip-editor.json | ui_test | （程式未引用） |
| v2-workflow | v2-workflow.json | v2-workflow.skin.json | v2-workflow.json | ui_test | （程式未引用） |
| warehouse-panel-screen | warehouse-panel-main.json | warehouse-panel-screen.skin.json | warehouse-panel-screen.json | lobby_ui | （程式未引用） |
| year-report-screen | year-report-main.json | year-report-screen.skin.json | year-report-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |

#### UI Core Interfaces (`assets/scripts/ui/core/interfaces/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| INodeFactory.ts | doc_ui_0049 §7.5, doc_index_0008 §8.4 | D: `INodeFactory`, `NodeHandle`; 概: 引擎無關的 UI 節點建構介面（buildPanel/buildLabel/buildButton/buildImage/buildScrollList/createContainer）|
| IStyleApplicator.ts | doc_ui_0049 §7.5, doc_index_0008 §8.4 | D: `IStyleApplicator`, `ButtonVisualState`; 概: 引擎無關的視覺樣式套用介面（applyBackgroundSkin/applyButtonSkin/applyLabelStyle/applySpriteType）|
| ILayoutResolver.ts | doc_ui_0049 §7.5, doc_index_0008 §8.4 | D: `ILayoutResolver`, `Dimensions`, `WidgetConstraints`, `LayoutConfig`; 概: 引擎無關的佈局計算介面，回傳純資料 DTO（resolveSize/resolveWidget/resolveLayout）|
| ICompositeRenderer.ts | doc_ui_0049 §7.5 | D: `ICompositeRenderer`; 概: 引擎無關的複合 UI 渲染介面 |
| IScrollVirtualizer.ts | doc_ui_0049 §7.5 | D: `IScrollVirtualizer`; 概: 引擎無關的虛擬化捲動清單介面 |
| index.ts | — | 概: barrel export，統一匯出三個介面 |

#### UI Platform Adapters (`assets/scripts/ui/platform/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| cocos/CocosNodeFactory.ts | doc_ui_0049 §7.5, doc_index_0008 §8.4 | 概: `INodeFactory` 的 Cocos Creator 3.x 實作；委派 `UIPreviewNodeFactory`；引擎耦合的單一聚合點（Unity 對照：UnityNodeFactory 同介面換 Unity API）|
| cocos/CocosCompositeRenderer.ts | doc_ui_0049 §7.5 | 概: `ICompositeRenderer` 的 Cocos Creator 3.x 實作 |
| cocos/CocosScrollVirtualizer.ts | doc_ui_0049 §7.5 | 概: `IScrollVirtualizer` 的 Cocos Creator 3.x 實作 |
| unity/UnityNodeFactory.ts | — | 概: `INodeFactory` 的 Unity stub；所有方法 throw not-implemented，供跨引擎移植時填充 |

#### Tools (`assets/scripts/tools/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| SceneAutoBuilder.ts | doc_tech_0007 | 概: 自動生成場景節點樹 |
| vfx-block-registry.ts | doc_tech_0015, doc_art_0003 | D: VfxBlockDef; 概: 特效積木登錄與 VFX 積木命名 / 路徑治理 |
| vfx-usage-table.ts | doc_tech_0015 | 概: 積木組合宣告 + 死資源偵測 |
| VfxComposerTool.ts | doc_tech_0015, doc_art_0003 | 概: 即時特效預覽工具與 VFX Core 路徑規則 |
| VideoPlayerTest.ts | doc_art_0003 | 概: 影片播放測試 |
| UnityParticlePrefabParser.ts | — | 概: Unity 粒子遷移工具（無直接規格書對應） |
| UnityParticleCompoundMapper.ts | — | 概: Unity 複合粒子映射（無直接規格書對應） |

#### Build Tools (`tools_node/`)

> 更新日期：2026-04-10。所有工具透過 `tools_node/lib/project-config.js` 取得集中路徑，禁止工具內部 `path.join(__dirname, '../assets/...')` 硬編碼。

| 工具 | 功能 | 關鍵路徑 / 產出 |
|------|------|----------------|
| `validate-ui-specs.js` | UI spec 三層 JSON 靜態驗證器（R1–R18） | 輸入：layouts/skins/screens；輸出：errors / warnings |
| `validate-widget-registry.js` | widget-registry.json ↔ 實際 widget 檔案一致性驗證 | `fragments/widget-registry.json` ↔ `fragments/widgets/*.json` |
| `build-fragment-usage-map.js` | 掃 layouts 的 `$ref` 引用，輸出片段使用地圖 | `--query <ref>` 查單一 fragment 影響範圍 |
| `task-lock.js` | Multi-Agent file-based task 鎖定 | `.task-locks/<id>.lock.json`；並確保 .gitignore 排除 |
| `headless-snapshot-test.js` | UI spec JSON 結構 hash 快照測試（baseline 113 specs） | `tools_node/.ui-spec-snapshot.json`；`--update` 更新 baseline |
| `layout-diff.js` | 兩份 layout JSON 人類可讀 diff 比對 | `--git <file>` 比對 HEAD vs 工作目錄 |
| `i18n-overflow-check.js` | CJK 文字寬度估算 + 溢出風險報告 | `i18n/*.json`；目錄不存在 graceful exit |
| `bootstrap-new-project.js` | 匯出 18 個可移植元件至新專案目錄 | `--name/--out/--list/--dry-run/--include/--exclude` |
| `lib/project-config.js` | 集中路徑管理（30+ paths, scenes, locales, templateFamilies, ROOT） | 被 validate-ui-specs / validate-widget-registry / task-lock / build-fragment-usage-map 等引用 |
| `skills-manager.js` | Agent Skills CLI（list / info / validate / export / sync-mirrors / status） | `.github/skills-manifest.json`（25 skills） |
| `check-encoding-touched.js` | 修改後 UTF-8 BOM / mojibake 防護 | 傳入 `<changed-files>` 清單 |
| `scaffold-ui-spec-family.js` | 以 config JSON 一鍵產出三層 UI spec 骨架 | `--config <json>`；輸出 layouts / skins / screens |

#### UCUF Compiler / Orchestrator (`tools_node/`)

> 更新日期：2026-04-16。以下工具為 UCUF UI 模板化藍圖（doc_ui_0046）的工具鏈核心。

| 工具 | 功能 | 關鍵路徑 / 產出 |
|------|------|----------------|
| `compile-proof-to-family-map.js` | proof draft → family-map | `artifacts/ui-source/<screen-id>/proof/<screen-id>.family-map.json` |
| `compile-proof-to-mcq.js` | proof draft 未決欄位 → MCQ 問卷 | `artifacts/ui-source/<screen-id>/mcq/*.json` |
| `compile-mcq-answer-to-recipe.js` | MCQ answers → normalized recipe | `docs/ui/examples/<screen>.recipe.json` |
| `compile-recipe-to-screen-spec.js` | recipe → screen JSON | `assets/resources/ui-spec/screens/<screen>.json` |
| `compile-recipe-to-panel-scaffold.js` | recipe → CompositePanel / ChildPanel .ts 骨架 | `assets/scripts/ui/components/` |
| `compile-recipe-to-task-card.js` | recipe → 可執行任務卡 | `docs/ui-quality-tasks/<task-id>.json` |
| `compile-family-map-to-asset-tasks.js` | family-map → asset-task-manifest | `artifacts/ui-source/<screen-id>/manifests/asset-task-manifest.json` |
| `compile-family-map-to-param-tune-tasks.js` | family-map（80%+ reuse）→ param-tune-manifest | `artifacts/ui-source/<screen-id>/manifests/param-tune-manifest.json` |
| `run-ui-vibe-workflow.js` | 圖驅動 orchestration front-end（串接上述全部） | `--proof-source <image> --screen-id <id>` |

#### Agent Skills（`.github/skills/` + `.agents/skills/`）

> 更新日期：2026-04-16。共 27 個 unique skill（19 僅 .github、2 僅 .agents、6 雙鏡像）。

| Skill | doc_id | 主要消費工具 | 關聯規格 |
|-------|--------|-------------|----------|
| best-mode | doc_agentskill_0001 | check-context-budget.js, report-turn-usage.js | doc_ai_0018 |
| cocos-bug-triage | doc_agentskill_0009 / 0002 | cocos-screenshot + cocos-log-reader 組合 | doc_ui_0049 |
| cocos-log-reader | doc_agentskill_0010 / 0003 | project.log 讀取 | doc_ui_0049 |
| cocos-preview-qa | doc_agentskill_0011 / 0004 | capture-ui-screens.js | doc_ui_0049, doc_ui_0051 |
| cocos-screenshot | doc_agentskill_0012 / 0005 | PrintWindow capture | doc_ui_0049 |
| comfyui-sdxl-partial-asset-gen | doc_agentskill_0013 | ComfyUI local backend | doc_ui_0046 |
| context-budget-guard | doc_agentskill_0006 | check-context-budget.js, summarize-structured-diff.js | doc_ai_0015 |
| crossref-progress-scanner | doc_agentskill_0032 | resolve-doc-id.js, cross-ref shards | doc_index_0007 |
| dalle3-image-gen | doc_agentskill_0014 | MCP DALL-E 3 | doc_ui_0046 |
| doc-consolidation-flow | doc_agentskill_0034 | consolidation-manifest tools | doc_index_0007 |
| doc-shard-manager | doc_agentskill_0015 | shard-manager.js | doc_index_0007 |
| encoding-touched-guard | doc_agentskill_0016 / 0007 | check-encoding-integrity.js, check-encoding-touched.js | doc_ai_0008 |
| general-balance-tuner | doc_agentskill_0017 | — | doc_data_0001 |
| general-data-pipeline | doc_agentskill_0018 | — | doc_data_0001, doc_spec_0016 |
| general-story-writer | doc_agentskill_0019 | — | doc_spec_0016 |
| nano-banana-gen | doc_agentskill_0020 | — | — |
| ui-asset-gen-director | doc_agentskill_0021 | compile-family-map-to-asset-tasks.js | doc_ui_0046 |
| ui-asset-qc | doc_agentskill_0022 | validate-visual-assets.js, validate-ui-specs.js | doc_ui_0049 |
| ui-asset-slice-pipeline | doc_agentskill_0023 | slice-ui-sheet.js, trim-png-by-background.js | doc_ui_0045 |
| ui-brief-generator | doc_agentskill_0024 | — | doc_ui_0046 |
| ui-family-architect | doc_agentskill_0025 | compile-proof-to-family-map.js | doc_ui_0046 |
| ui-i18n-localize | doc_agentskill_0026 | i18n-overflow-check.js | doc_art_0003 |
| ui-preview-judge | doc_agentskill_0027 | cocos-screenshot | doc_ui_0049 |
| ui-reference-decompose | doc_agentskill_0028 | run-ui-vibe-workflow.js | doc_ui_0046 |
| ui-runtime-verify | doc_agentskill_0029 | capture-ui-screens.js, validate-ui-specs.js | doc_ui_0049 |
| ui-spec-scaffold | doc_agentskill_0030 | compile-recipe-to-screen-spec.js, compile-recipe-to-panel-scaffold.js | doc_ui_0046, doc_ui_0049 |
| ui-vibe-pipeline | doc_agentskill_0031 / 0008 | run-ui-vibe-workflow.js + 全 compiler chain | doc_ui_0046, doc_ui_0048 |

---
