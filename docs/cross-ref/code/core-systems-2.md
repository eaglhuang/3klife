<!-- 分片：cross-ref-code / core-systems-2 -->
# 代碼索引分片：Core Systems（下半）

> 入口：`docs/cross-ref/cross-ref-code.md`（doc_index_0001）。欄位說明見入口。

#### Core Systems (`assets/scripts/core/systems/`)（續）

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
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
