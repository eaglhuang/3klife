<!-- 分片：cross-ref-code / core-systems-1 -->
# 代碼索引分片：Core Systems（上半，依檔名排序）

> 入口：`docs/cross-ref/cross-ref-code.md`（doc_index_0001）。欄位說明見入口。

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
