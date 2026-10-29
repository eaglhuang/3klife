<!-- doc_id: doc_index_0017 -->
# Cross-Reference: 實作進度（規格書 × 代碼 × 測試）

> 這是 `docs/cross-reference-index.md (doc_index_0007)` (doc_index_0007) 的 D 節分片。完整索引見 `docs/cross-reference-index.md (doc_index_0007)` (doc_index_0007)。
> 最後更新請參考母檔 Header。
>
> ⚠️ **本檔是唯一保留完整中文規格書名稱的分片**，供人類查閱進度。
> Agent 請優先讀壓縮版分片（doc_id 索引），只在需要確認進度時才讀本檔。
> 名稱查詢：`node tools_node/resolve-doc-id.js <doc_id>`
> 自動更新：`node tools_node/rebuild-crossref.js --rebuild-progress`

## D. 實作進度（規格書 × 代碼 × 測試）

### D-1. 規格書實作進度

> 每份規格書目前已有對應代碼的清單。無代碼對應的規格書標記「尚無實作」。
> 本表由 `crossref-progress-scanner` skill 週期性掃描更新；手動補充請同步更新 `cross-ref-code.md (doc_index_0001)` B-1。

> **測試檔案目錄說明（2026-03-31 修正）**：CLI 可用的測試檔案位於 **`tests/`**（專案根目錄，**扁平結構，無子目錄**）。
> - ✅ **已建立**：`tests/FormulaSystem.test.ts`, `tests/ActionSystem.test.ts`, `tests/BuffSystem.test.ts`, `tests/BuffParticleProfileConfig.test.ts`, `tests/CurveSystem.test.ts`, `tests/EventSystem.test.ts`, `tests/GeneralListPanel.test.ts`, `tests/NetworkService.test.ts`, `tests/ResultPopup.test.ts`, `tests/SyncManager.test.ts`, `tests/UIManager.test.ts`, `tests/UISpecParser.test.ts`, `tests/UnityParticlePrefabParser.test.ts`, `tests/VfxEffectConfig.test.ts`
> - ⚠️ **發現問題**：`tsconfig.test.json` 的 `include` 路徑已修正為 `tests/**/*.ts`，但測試檔內的相對 import（如 `../../core/systems/FormulaSystem`）尚需更新為對應絕對路徑模式（規劃中，見 `keep.md (doc_index_0011) §9`）

> **五欄判定（PROG-2-0027）**——Unity 類比：像 Test Runner 的燈號，不是自評百分比。由 `node tools_node/build-progress-matrix.js` 依 repo 現況重算：
> - **規格**：規格書 doc_id 在 registry 內且檔案存在（像 ScriptableObject 資產存在）
> - **邏輯**：對應代碼檔存在於 `assets/scripts`（✅ 完整 / 🟡 部分或估算未滿 / ❌ 無）
> - **接線**：代碼檔被其他腳本 import（像 Component 有掛到場景物件；只寫沒人呼叫 = ❌）
> - **測試**：`tests/` 內有對應 `*.test.ts`
> - **runtime 驗收**：headless / Playwright 實跑證據；沒有證據一律 ⬜（不是 ✅）。代碼檔欄位為「尚無實作」代表邏輯尚未落地

| 規格書 | 對應代碼檔 | 規格 | 邏輯 | 接線 | 測試 | runtime 驗收 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **數值系統.md (doc_data_0001)** | FormulaSystem.ts, Constants.ts, TroopUnit.ts, GeneralUnit.ts, BattleController.ts, BattleState.ts | ✅ | ✅ | ✅ | ✅ | ⬜ |
| **兵種（虎符）系統.md (doc_spec_0012)** | FormulaSystem.ts, Constants.ts, TroopUnit.ts, BattleController.ts, EnemyAI.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| **戰場部署系統.md (doc_spec_0040)** | BattleSystem.ts, BattleState.ts, BattleController.ts, BattleScene.ts, BoardRenderer.ts, DeployPanel.ts, ResultPopup.ts, SortieDeploy.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| **武將系統.md (doc_spec_0016)** | GeneralUnit.ts, GeneralDetailComposite.ts, GeneralListPanel.ts, LobbyScene.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| **武將人物介面規格書.md (doc_ui_0012)** | GeneralDetailComposite.ts, GeneralDetailOverviewChild.ts, GeneralListPanel.ts, LobbyScene.ts, GeneralUnit.ts | ✅ | ✅ | 🟡 | ✅ | ⬜ |
| **戰法系統.md (doc_spec_0038)** | ActionSystem.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| **奧義系統.md (doc_spec_0030)** | ActionSystem.ts, UltimateDamage.ts, UltimateUpgrade.ts, BloodlineTransmissionUltimate.ts, ChildUltimateAwaken.ts, VitalityBattleGate.ts, BattleSkillDispatcher.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| **因子爆發系統.md (doc_spec_0010)** | BuffSystem.ts, BuffGainEffectPool.ts, BuffEffectPrefabController.ts, GeneObject.ts, FactorInheritance.ts, FactorTacticLinkage.ts, HiddenFactorAwakening.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| **治理模式他國AI系統.md (doc_spec_0020)** | EnemyAI.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| **大廳系統.md (doc_spec_0002)** | LobbyScene.ts, UIConfig.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| **官職系統.md (doc_spec_0014)** | UIConfig.ts, LobbyScene.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| **AI武將強度系統.md (doc_data_0002)** | EnemyAI.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| **名將挑戰賽系統.md (doc_spec_0007)** | DuelChallengePanel.ts | ✅ | 🟡 | ❌ | ❌ | ⬜ |
| **關卡設計系統.md (doc_spec_0049)** | BattleScene.ts, BattleHUD.ts, DeployPanel.ts | ✅ | 🟡 | 🟡 | ❌ | ⬜ |
| **武將日誌與離線互動系統.md (doc_spec_0015)** | LobbyScene.ts | ✅ | 🟡 | ✅ | ❌ | ⬜ |
| **MVP遊戲驗證規格書.md (doc_spec_0045)** | GameManager.ts | ✅ | ✅ | ✅ | ❌ | ⬜ |
| **新手開場規格書.md (doc_spec_0031)** | SceneManager.ts, LoadingScene.ts, LobbyScene.ts, LoginScene.ts | ✅ | ✅ | 🟡 | ❌ | ⬜ |
| **UI 規格書.md (doc_ui_0027)** | UIConfig.ts, UIManager.ts, BattleHUD.ts, BattleLogPanel.ts, DeployPanel.ts, ToastMessage.ts, UILayer.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| **主戰場UI規格書.md (doc_ui_0001)** | UIConfig.ts, UIManager.ts, BattleHUD.ts, BattleScenePanel.ts, TigerTallyPanel.ts, UnitInfoPanel.ts, ActionCommandPanel.ts | ✅ | ✅ | 🟡 | ✅ | ⬜ |
| **主戰場UI規格補充_v3.md (doc_ui_0003)** | BattleHUD.ts, ActionCommandPanel.ts, BattleLogPanel.ts, TigerTallyPanel.ts, GeneralQuickViewPanel.ts, Constants.ts | ✅ | ✅ | 🟡 | ✅ | ⬜ |
| **美術素材規劃與使用說明.md (doc_art_0003)** | UnitAssetCatalog.ts, MaterialSystem.ts, UnitRenderer.ts, ResourceManager.ts, I18nSystem.ts, BattleScene.ts, DeployPanel.ts, VfxComposerTool.ts, vfx-block-registry.ts, VideoPlayerTest.ts | ✅ | ✅ | 🟡 | ✅ | ⬜ |
| **UI技術規格書.md (doc_ui_0049)** | SolidBackground.ts, GeneralListPanel.ts, NetworkStatusIndicator.ts | ✅ | ✅ | 🟡 | ❌ | ⬜ |
| **Data Schema文件（本機端與Server端）.md (doc_tech_0013)** | ResourceManager.ts, NetworkService.ts, SyncManager.ts, NetworkStatusIndicator.ts, index.ts | ✅ | ✅ | 🟡 | ✅ | ⬜ |
| **場景搭建指南.md (doc_tech_0007)** | SceneAutoBuilder.ts | ✅ | ✅ | ❌ | ❌ | ⬜ |
| **demo_playbook.md (doc_spec_0161)** | BattleScene.ts | ✅ | ✅ | ❌ | ❌ | ⬜ |
| **demo_技術架構.md (doc_tech_0015)** | ServiceLoader.ts, PoolSystem.ts, ResourceManager.ts, EffectSystem.ts, AudioSystem.ts | ✅ | ✅ | ✅ | ✅ | ⬜ |
| **keep.md (doc_index_0011) §7** | MaterialUtils.ts, MaterialSystem.ts | ✅ | ✅ | ✅ | ❌ | ⬜ |
| 俘虜處理系統.md (doc_spec_0021) | PrisonerOfWar.ts, PrisonerPopupController.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 傭兵系統（試用）.md (doc_spec_0029) | MercenaryIllustration.ts, MercenaryPanelView.ts, MercenaryNameplateRows.ts, MercenaryPanelController.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| 可結緣女性來源系統.md (doc_spec_0003) | DaughterComingOfAge.ts, FemaleSource.ts, FemaleSourcePresenter.ts, BreedingPreviewPresenter.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| 同名武將系統.md (doc_spec_0005) | SoulTransfer.ts, BloodlineInfusion.ts, BloodlineMerge.ts, ReviveRetrain.ts, SortieDeploy.ts, SoulFragmentLedger.ts, SoulInjectCandidates.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| 名士預言系統.md (doc_spec_0006) | BondingSetupController.ts（名士批語 3 列，PROG-2-1131） | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 名詞定義文件.md (doc_spec_0008) | 尚無實作 | ✅ | ✅ | — | — | ⬜ |
| 因子解鎖系統.md (doc_spec_0009) | AwakeningReveal.ts（戰後覺醒結算揭示，PROG-2-1133；畫面定格動畫未做） | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 培育系統.md (doc_spec_0026) | NurtureSystem.ts、TacticLearning.ts、NurtureFlowController.ts（戰法列，PROG-2-1132／1134）；InspiredTacticMap.ts（靈感戰法對應戰法庫，PROG-2-1135） | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 家族關係（史實相性）系統.md (doc_spec_0024) | ComboAttackKin.ts, RelationEvents.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 戰場適性系統.md (doc_spec_0041) | ArenaScore.ts, BattleAptitude.ts, BattlefieldRecon.ts, DesertVitality.ts, TerrainTroopRules.ts, WeatherSchedule.ts, WeatherTacticRestriction.ts, EnvScoutPresenter.ts, TacticAvailabilityPresenter.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| 教官系統（支援卡）.md (doc_spec_0027) | NurtureSystem.ts（inspiredTacticIds）、GameSession.ts（learnTactic 擋法，PROG-2-1134）；InspiredTacticMap.ts（17 個靈感戰法對應現有 8 招戰法庫，PROG-2-1135；逐招獨立戰場效果未做）；NpcFriendMentor.ts（friendMentorCard）、NurtureFlowController.ts（setBorrowedMentor）、LobbyScene.ts（_onClickStartBorrow，好友借用入學前，PROG-2-1138） | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 正式版劇本文案.md (doc_spec_0004) | FunLineLibrary.ts, OpeningLetter.ts, RedFaceCopy.ts, UIOpeningLetterPanel.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| 武將壽命系統.md (doc_spec_0018) | GeneralAging.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 武將戰績系統.md (doc_spec_0019) | BattleLeaderboardView.ts, BattleRecordStats.ts, BattleSnapshot.ts, HiddenFactorAwakening.ts, MilestoneRewards.ts, RetireReviewCopy.ts, SeasonReportPanel.ts, HiddenFactorText.ts, RetireReviewController.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 武將背包（倉庫）系統.md (doc_spec_0017) | EquipmentBonus.ts, GeneralBackpack.ts, GeneralEquipTransfer.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| 留存系統.md (doc_spec_0025) | FarewellLetterInbox.ts, LoginStreak.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 結緣系統（配種）.md (doc_spec_0028) | BondingSetupController.ts（三欄重排、父母頭像，PROG-2-1130／1131） | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 經濟系統.md (doc_spec_0032) | AccelerateCard.ts, DomesticTasks.ts, ItemShopPricing.ts, MilitaryReserve.ts, ResourceCap.ts, VitalityPill.ts, VitalityPillController.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 血統理論系統.md (doc_spec_0011) | BloodlineGraph.ts, AwakeningTitle.ts, BloodlineBeast.ts, BreedingSystem.ts, FactorInheritance.ts, GeneCatalyst.ts, HybridSkill.ts, VirtualAncestorGenerator.ts, WildGene.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 資源循環系統.md (doc_spec_0033) | LateBloomClue.ts, LifeVitalityPresenter.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 轉職與宿命系統.md (doc_spec_0043) | UnveilingService.ts, JobChange.ts, JobChangeWiring.ts, RetirementRouting.ts, Unveiling.ts, JobChangeController.ts, NurtureFlowController.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 轉蛋系統.md (doc_spec_0042) | DestinyShop.ts, GachaCurrency.ts, GachaDraw.ts, GachaPoolGuide.ts, OverflowBond.ts, Rebirth.ts, DestinyShopController.ts, GachaPoolGuidePresenter.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 遊戲時間系統.md (doc_spec_0034) | GameClock.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 運氣系統.md (doc_spec_0035) | FateBlessing.ts, LuckVisibility.ts（E-1 前期隱藏、E-4 Lv46 解鎖）, BreedingSystem.ts（E-2 天命波動）, LuckThresholds.ts（E-3 紫因子 LUK 上限）, LuckEventRate.ts（E-5 事件率，PROG-2-1349）, FactorAwakening.ts（E-6 覺醒速度） | ✅ | ✅ | ✅ | ✅ | ⬜ |
| 道具系統（付費免費道具）.md (doc_spec_0036) | FertilityBoost.ts, ItemBagView.ts, ItemEffectDispatcher.ts, ItemRefreshEffect.ts, PlayerInventory.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 領地治理系統.md (doc_spec_0037) | ChildMagistrate.ts, ChildOfficialPosts.ts, DomesticAutoGovernance.ts, DomesticTasks.ts, GovernanceAssignment.ts, GovernorHallView.ts, HereditaryKeep.ts, LifespanSave.ts, TerritoryUpgrade.ts, GovernorHallController.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| **戰法場景規格書.md (doc_spec_0039)** | ActionSystem.ts, SceneGambitTrigger.ts, SceneGambitAdapter.ts, TileStateRules.ts, StealthTile.ts, BattleTacticBehavior.ts, WisdomMeter.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| 熱更新與版本控制規格書.md (doc_tech_0012) | SaveVersion.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |

#### D-1a. 邏輯欄重判紀錄（逐份對照規格條目）

> 「邏輯」欄判定：規格的功能條目全部有程式效果才標 ✅；有缺口標 🟡 並在此列出缺口，缺口即後續任務卡來源。改動此欄後重跑 `node tools_node/build-progress-matrix.js` 更新 D-4。

| 規格書 | 判定 | 依據 | 缺口（後續卡來源） | 重判卡 |
|---|:-:|---|---|---|
| 戰法系統.md (doc_spec_0038) | 🟡（維持） | G-1 虎符 14 招、G-2 教官 6 招、G-3 趙家槍法、G-4 場景戰法（火攻／水淹／落石／伏兵／夜襲）都有效果：BattleSkillProfiles、各 resolver、TallyPassive（騎射合一、結姻連射、七進七出）、BattleTactic；H-1 天氣禁用已做（PROG-2-0406） | H-2 SSR／UR 英靈面閃現、火計格 VFX、水計流向與 H-3 掠奪金色飄字：TacticVfxHooks.ts 只有純邏輯，沒有任何檔案 import，未接畫面；`assets/fx/tactics/` 資源目錄不存在 | PROG-2-1432 |
| 兵種（虎符）系統.md (doc_spec_0012) | ✅→🟡 | 「特殊兵種列表」34 條特殊戰法：11 條沿用既有 profile、9 條以被動實作（白馬、梟姬、龍膽〔閃避後反擊 PROG-2-1595 已補：攻擊落空且攻方在射程內時回擊 50%，暫定〕；解煩、丹陽、吳國由 PROG-2-1433、止啼符、藤甲由 PROG-2-1437、虎痴符由 PROG-2-1444 補上）；錦帆、工甲符、白耳、元戎、常山女以暫定數字部分實作（PROG-2-1457），其餘 9 條是 `pendingEffect` 殼（不可施放、無效果） | 9 條特殊戰法未實作：~~鐵騎（恐懼衝鋒）~~ PROG-2-1514 已補、~~先登（攻城 ×2~~ PROG-2-1579 已補：前線每回合攻城 30×2，非工兵也可，暫定；~~免恐懼~~ PROG-2-1513 已補）、大喬（~~全隊魅力~~ PROG-2-1582 已補：戰場無魅力屬性，換算為大喬存活時己方回合開始全隊士氣 +20，暫定；~~士氣不降~~ PROG-2-1525 已補）、南蠻（巨型踐踏；~~濺射~~ PROG-2-1527 已補，~~無視輕步兵阻擋~~ PROG-2-1578 已補：越過敵方步兵落在後一格）、~~都督符（火燒連營）~~ PROG-2-1531 已補、~~神威符（強擊突刺）~~ PROG-2-1573 已補（每前進一格攻擊 +15%、最多 4 格，暫定；無視地形 PROG-2-1576 已補：減移動格子無效）、~~惡來符（捨命護主）~~ PROG-2-1530 已補、~~奉孝符（遺計定遼）~~ PROG-2-1572 已補（陣亡全場敵軍暈眩 1 回合，暫定）、~~狼顧符（鷹視狼顧）~~ PROG-2-1572 已補（每回合策反一支血量 ≤ 30% 的非主將敵軍，暫定）；5 條部分實作（數字暫定）待補：~~常山女治療友軍~~（PROG-2-1526 已補）、~~白耳替主將承傷~~（PROG-2-1529 已補）與~~斷後防禦 ×2~~（PROG-2-1580 已補：同列前方有友軍、後方無友軍時防禦 ×2，暫定）、~~元戎範圍傷害~~（PROG-2-1528 已補）、~~工甲符連擊時傷害提升~~（PROG-2-1581 已補：連續攻擊同一目標每層 +20%、最多 3 層，暫定）；另 ~~TallyCardCatalog 只有 6 種虎符卡，龍膽符等名將專屬虎符尚無卡片模板~~ PROG-2-1592 已補：規格表 34 張虎符自動建卡（兵種／品質／戰法取規格欄，卡圖用兵種通用圖，暫定），目錄共 38 張；名將死亡虎符接線 PROG-2-1593 已補：17 位名將（趙雲→龍膽符等）死亡虎符的模板 id 仍是武將 id（史實合攻用），出陣查被動與適性時換成專屬虎符；死亡傳承（通用型）虎符 PROG-2-1594 已補 17 位來源武將對照（曹操／曹仁→虎豹等；馬超、周瑜以專屬虎符為準，孟獲暫歸藤甲）；高順、麴義、趙雲系女性名將名冊無對應武將，未接（解煩、丹陽、吳國、止啼符、藤甲、虎痴符、錦帆、工甲符、白耳、元戎、常山女亦同） | PROG-2-1432、PROG-2-1433、PROG-2-1437、PROG-2-1444、PROG-2-1457 |
| 奧義系統.md (doc_spec_0030) | 🟡（維持） | E 製作功能清單 10 項：資料表、轉生解鎖欄位、精力消耗（VitalityBattleGate.spendUltimateVitality）、專屬綁定、子嗣覺醒（ChildUltimateAwaken）、奧義升級與圖鑑（UltimateUpgrade）已落地；F-0 血脈五階解鎖（BloodlineTransmissionUltimate）、傷害公式（UltimateDamage）已落地 | ~~① 每場限用 1 次~~、~~② 升級等級進戰鬥傷害~~（PROG-2-1451 補上；~~奧義選單灰化已用奧義~~ PROG-2-1512 已補）；~~③ E-10 組合奧義（P2）~~ PROG-2-1588 已補最小版（暫定）：主將施放奧義時，己方存活部隊的來源武將是搭檔即觸發，奧義攻擊 ×1.5；目前只收「赤壁大火」（周瑜＋諸葛亮），其他組合待母規格；~~④「英靈附體」~~ PROG-2-1587 已補（暫定）：奧義生效後，若施放方存活部隊 < 敵方 70%，每場一次以 50% 奧義攻擊基準再施放一次（祖先成名奧義資料未接，先用本體奧義） | PROG-2-1447、PROG-2-1451 |
| 因子爆發系統.md (doc_spec_0010) | 🟡（維持） | E 製作清單 8 項都有代碼：基因物件（GeneObject）、遺傳（FactorInheritance）、發現度與隱性覺醒（HiddenFactorAwakening）、因子戰法聯動（FactorTacticLinkage）、因子遮罩、EP 計算（BreedingSystem.computeEpMvp）、標籤池；水戰／大霧／林地因子有戰場效果 | 1. ~~白色因子「抗性、性格」沒有遊戲效果~~ PROG-2-1586 已補（暫定）：新增 gene_calm 冷靜（恐懼與扣士氣減 10%/級）、gene_fury 暴躁（攻擊 +3%/級、防禦 −3%/級），主將持有時對全隊生效；2. K 段揭露順序（新手藍粉綠／中期白紅／後期紫）與 UnlockPhase.phaseFactorColors（藍粉／綠白／紫紅）不一致，也沒接進培育可參與顏色，需人工裁定；~~3. EP「精力滿載 +10」加成~~（PROG-2-1511 已補） | PROG-2-1458 |
| 戰場部署系統.md (doc_spec_0040) | ✅→🟡 | 出陣部署（SortieDeploy）、委任 AI、預備隊、雙方部署深度、勝敗結算都有代碼 | 1. 攻城戰場景 SCENE_SIEGE：PROG-2-1589 已補最小版（BattleTactic.Siege／siege 場景；敵方城牆區防禦 ×1.5、我方工兵衝車攻城 ×2，暫定；城牆不擋路以免守軍卡死；PROG-2-1596 修正城牆區為敵方最後兩列 depth ≥ 6，並補投石機：工兵每回合轟擊城牆區 10 傷不致死，暫定）；護城河 PROG-2-1598 已補（城牆前一列 depth 5，站上去移動 -1，不擋路不推移，暫定）；器械通道格、城牆美術未做；SortieDeploy 只做了攻城精英上限加成 | PROG-2-1458 |
| 戰法場景規格書.md (doc_spec_0039) | 🟡（維持） | B-2 成功率公式（SceneGambitTrigger：min 95%、50%+(INT−門檻)×2%）、場景戰法轉接（SceneGambitAdapter）、Tile 狀態（TileStateRules、StealthTile）、夜襲命中 −25%／暴擊 +20%、營帳格（BattleTacticBehavior）已落地 | 1. 軍師智謀能量（WisdomMeter）已接進戰鬥；~~全局增幅~~ PROG-2-1574 已補（滿格我方全軍士氣 +20，暫定）；PROG-2-1577 先在每回合戰鬥紀錄顯示「智謀 N/100」與觸發提示，垂直能量條與金色粒子未做；2. 攻城戰（SCENE_SIEGE）：PROG-2-1589 已補城牆地利（防禦 ×1.5）與衝車（工兵攻城 ×2），暫定；投石機 PROG-2-1596 已補（工兵每回合轟擊城牆區 10 傷，不致死，暫定）；雲梯 PROG-2-1597 已補（我方步兵普攻城牆區守軍時抵銷城牆地利，暫定）；3. ~~擊破落石掉落~~ PROG-2-1583 已補（暫定）：我方回合開始，我方部隊同列前後相鄰的落石被擊破，掉落石材／木材 100~300、防具材料 +5（暫記武器材料）、武將經驗 +50（暫記教官經驗）寫入 Stage_Salvage；金色浮動文字未做；火攻掠奪已由 PROG-2-1462 寫入 Stage_Salvage 補給（武器材料、教官經驗待裁定，戰後顯示未接）（戰後入帳已由 PROG-2-1571 補上：補給轉糧草、其餘轉背包材料，皆暫定）（~~火抗 +50%~~ 已由 PROG-2-1459 補上：火燒偷襲戰我方火格與火計傷害 ×0.5）；4. ~~F 段 P1 計謀格子掉落~~ 已由火攻掠奪（PROG-2-1462）與落石擊破（PROG-2-1583）涵蓋；F 段 P0 Tile-State 預設配置表 PROG-2-1584 已補 scene-tile-presets.json 與 SceneTilePresets.ts（驗證、依比例分配格數），峽谷落石已由 PROG-2-1585 接上（中間兩排 10 格：4 落石＋3 碎石強制後退，暫定）；森林埋伏已由 PROG-2-1590 接上（林地格依 60/20/20 分成掩體／陷阱／一般，陷阱放最靠敵方的林地、每回合扣 10 血，暫定）；水淹七軍已由 PROG-2-1591 接上（淹沒區依 50/30/20 分成水流／深水／淺灘：下游放水流推移、其次深水每回合扣 10 血、上游淺灘無效果，暫定） | PROG-2-1458 |
| 武將壽命系統.md (doc_spec_0018) | 🟡（維持） | E 製作功能清單 8 項：壽命上限（GeneralAging.resolveMaxLifespan：65 + 紅因子 ×3 + 變異）、年齡階段、退役、死亡判定、演武聖境（SpiritCard／LegacyService）、延壽丹（LongevityPill）、身後傳承已落地 | ~~1. E-1「戰傷減損」（名詞：戰場受重傷降低壽命）沒有程式；規格未定義「重傷」條件與減損年數，需人工裁定~~ → PROG-2-1570 已落地（WarInjury.ts：主將戰後血量 ≤ 25% 為重傷，壽命上限 −1 年，皆暫定） | PROG-2-1532 |

---

### D-2. 待建 UI Spec 檔案（待辦）

> 原 `cross-ref-ui-spec.md C-3`。優先級：P0 = 阻擋功能開發 / P1 = 下週目標 / P2 = 月底目標。
> 狀態欄（PROG-2-1355，2026-10-28 依 repo 檔案回寫）：✅ 已建 11 個、⬜ 待建 10 個；PROG-2-1422（2026-10-28）查出其中 4 個已用其他檔名建成，改標 ✅，實際已建 15 個、待建 6 個；PROG-2-1424 建成 rank-progress 三件後為已建 18 個、待建 3 個；PROG-2-1428 建成血統小傳三件後全部 21 個已建。

| 優先級 | 檔案 | 依賴規格書 | 狀態 |
|---|---|---|:-:|
| P0 | `layouts/nurture-session-main.json` | 培育系統.md (doc_spec_0026) | ✅ 已建 |
| P1 | `skins/nurture-session-default.json` | 培育系統.md (doc_spec_0026) | ✅ 已建 |
| P1 | `screens/nurture-session-screen.json` | 培育系統.md (doc_spec_0026)、教官系統（支援卡）.md (doc_spec_0027) | ✅ 已建 |
| P2 | `layouts/general-detail.json` | 武將人物介面規格書.md (doc_ui_0012) | ✅ 已建（實際檔名 `general-detail-main` / `general-detail-unified-main` / `character-ds3-main`） |
| P2 | `layouts/general-bloodline-vignette-main.json` | 武將人物介面規格書.md (doc_ui_0012)、血統理論系統.md (doc_spec_0011) | ✅ 已建（PROG-2-1428 血統小傳開窗，由人物頁總覽「血統小傳」打開；使用者 2026-10-28 裁定做） |
| P2 | `skins/general-bloodline-vignette-default.json` | 武將人物介面規格書.md (doc_ui_0012)、UI 規格書.md (doc_ui_0027) | ✅ 已建（PROG-2-1428 血統小傳開窗，由人物頁總覽「血統小傳」打開；使用者 2026-10-28 裁定做） |
| P2 | `screens/general-bloodline-vignette-screen.json` | 武將人物介面規格書.md (doc_ui_0012)、UI 規格書.md (doc_ui_0027) | ✅ 已建（PROG-2-1428 血統小傳開窗，由人物頁總覽「血統小傳」打開；使用者 2026-10-28 裁定做） |
| P2 | `layouts/spirit-tally-detail-main.json` | 兵種（虎符）系統.md (doc_spec_0012)、武將人物介面規格書.md (doc_ui_0012) | ✅ 已建 |
| P2 | `skins/spirit-tally-detail-default.json` | 兵種（虎符）系統.md (doc_spec_0012)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `screens/spirit-tally-detail-screen.json` | 兵種（虎符）系統.md (doc_spec_0012)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `layouts/world-sandtable-main.json` | 大廳系統.md (doc_spec_0002)、官職系統.md (doc_spec_0014) | ✅ 已建（實際檔名 `layouts/sandtable-territory-main.json`，PROG-2-0967） |
| P2 | `skins/world-sandtable-default.json` | 大廳系統.md (doc_spec_0002)、UI 規格書.md (doc_ui_0027) | ✅ 已建（實際檔名 `skins/sandtable-territory-default.json`，PROG-2-0967） |
| P2 | `screens/world-sandtable-screen.json` | 大廳系統.md (doc_spec_0002)、官職系統.md (doc_spec_0014) | ✅ 已建（實際檔名 `screens/sandtable-territory-screen.json`，PROG-2-0967） |
| P2 | `layouts/rank-progress-main.json` | 官職系統.md (doc_spec_0014) | ✅ 已建（PROG-2-1424 官職進度小開窗，由官職頁「階位總覽」打開） |
| P2 | `skins/rank-progress-default.json` | 官職系統.md (doc_spec_0014)、UI 規格書.md (doc_ui_0027) | ✅ 已建（PROG-2-1424 官職進度小開窗，由官職頁「階位總覽」打開） |
| P2 | `screens/rank-progress-screen.json` | 官職系統.md (doc_spec_0014)、UI 規格書.md (doc_ui_0027) | ✅ 已建（PROG-2-1424 官職進度小開窗，由官職頁「階位總覽」打開） |
| P2 | `layouts/bloodline-mirror-loading-main.json` | 血脈命鏡過場載入規格書.md (doc_ui_0005)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `skins/bloodline-mirror-loading-default.json` | 血脈命鏡過場載入規格書.md (doc_ui_0005)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `screens/bloodline-mirror-loading-screen.json` | 血脈命鏡過場載入規格書.md (doc_ui_0005)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `content/bloodline-mirror-states-v1.json` | 血脈命鏡過場載入規格書.md (doc_ui_0005)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `contracts/bloodline-mirror-state-content.schema.json` | 血脈命鏡過場載入規格書.md (doc_ui_0005)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |

---

### D-3. 待定 Contract（尚未決定是否拆成獨立 screen）

> 原 `cross-ref-ui-spec.md C-4`。

| 概念 | 暫定 contract / state | 實作狀態（PROG-2-1346 回寫，2026-10-28） | 目前掛點 | 規格來源 |
|---|---|---|---|---|
| 晨報摘要 | `pending: morning-report-content` | ✅ DailyReportController.ts（PROG-2-1170/1174） | `LobbyMain` 登入後摘要層 | 武將日誌與離線互動系統.md (doc_spec_0015)、UI 規格書.md (doc_ui_0027) |
| 武將日誌抽屜 | `pending: general-journal-content` | ✅ GeneralJournalController.ts（PROG-2-1183） | `LobbyMain` / `GeneralDetail` 抽屜層 | 武將日誌與離線互動系統.md (doc_spec_0015)、武將人物介面規格書.md (doc_ui_0012) |
| 派遣整備掛點 | `pending: dispatch-board-content` | ✅ DispatchCatalog.ts＋LobbyScene 日誌樞紐（PROG-2-1179） | `LobbyMain` 任務 / 生活感入口 | 武將日誌與離線互動系統.md (doc_spec_0015)、UI 規格書.md (doc_ui_0027) |
| 挑戰賽賽季卡 | `pending: tournament-season-card` | ✅ TournamentPanelController.ts 賽季列（PROG-2-1191）；天下沙盤彈窗右側賽季次卡（PROG-2-1431，共用 tournamentSeasonCardLines） | `LobbyMain` 世界沙盤旁次卡 | 名將挑戰賽系統.md (doc_spec_0007)、UI 規格補遺_2026-04-11_大廳晨報與人物日誌pending.md (doc_ui_0030) |
| 經濟補貼提示 | `pending: economy-subsidy-banner` | ✅ 許願祭壇 waSubsidyLabel（PROG-2-1343）、登入 toast（PROG-2-1340）、戰敗地窖提示（PROG-2-1342）；規格定位為「資源列或許願祭壇附近」，許願祭壇已滿足（PROG-2-1431 確認） | `LobbyMain` 資源列 / 許願祭壇提示條 | 經濟系統.md (doc_spec_0032)、UI 規格補遺_2026-04-11_大廳晨報與人物日誌pending.md (doc_ui_0030) |
| 虎符戰記摘要 | `pending: general-tally-summary` | 🟡 GeneralTallySummary.ts 純邏輯與 overview tallySummary（PROG-2-1344/1345）；畫面位置待定 | `GeneralDetail` overview 次卡 / peek | 兵種（虎符）系統.md (doc_spec_0012)、武將人物介面規格書.md (doc_ui_0012)、UI 規格補遺_2026-04-11_大廳晨報與人物日誌pending.md (doc_ui_0030) |
| 結緣模式摘要 | `pending: bonding-lineage-mode-chip` | ✅ BondingSetupController.ts modeChip（Standard / Peace_Lineage） | `BondingSetup` 父母摘要列 / 結果預估卡 | 結緣系統（配種）.md (doc_spec_0028)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 培育學年階段列 | `pending: nurture-phase-block-header` | ✅ NurtureFlowController.ts nurturePhase（Phase_Block 1-12/13-24/25-36） | `NurtureSession` 頂部進度列 | 培育系統.md (doc_spec_0026)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 畢業戰術標籤條 | `pending: graduation-tags-strip` | ✅ NurtureSessionMapper.ts graduationTags | `NurtureSession` 畢業摘要 / `GeneralDetail` peek | 培育系統.md (doc_spec_0026)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 軍師 HUD 摘要 | `pending: strategist-hud-summary` | 🟡 StrategistHud.ts 純邏輯（PROG-2-1313）；戰場資料來源 StrategistHudSource.ts 已由 PROG-2-1599 補上（落石／營帳／陷阱、本回合危害、回收累計）；BattleScene HUD 畫面未接 | `BattleScene` Top HUD 次層 / 右側可收合抽屜 | 關卡設計系統.md (doc_spec_0049)、主戰場UI規格書.md (doc_ui_0001)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 關卡回收摘要 | `pending: stage-salvage-summary` | 🟡 StrategistHud.ts SalvageTotals（PROG-2-1313）；回收累計已接（落石擊破 PROG-2-1583、火攻掠奪 PROG-2-1462 寫入 stageSalvage，戰後入帳 PROG-2-1571），StrategistHudSource 可組摘要（PROG-2-1599）；戰中提示條／戰後摘要卡畫面未接 | `BattleScene` 戰中提示條 / 戰後摘要卡 | 關卡設計系統.md (doc_spec_0049)、主戰場UI規格書.md (doc_ui_0001)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 雙池定位導覽 | `pending: gacha-pool-positioning-brief` | ✅ GachaPoolGuide.ts＋GachaPoolGuidePresenter.ts（PROG-2-0563/0565） | `GachaMain` tab header / pity 區旁說明帶 | 轉蛋系統.md (doc_spec_0042)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 轉蛋 Banner 主視覺 | `pending: gacha-banner-hero-art-policy` | ⬜ 美術政策待定 | `GachaMain` BannerStage 人物主視覺 / pool-specific key visual | 轉蛋系統.md (doc_spec_0042)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |

---

### D-4. 專案總進度摘要

> 最後由 `node tools_node/build-progress-matrix.js` 依 D-1 五欄自動計算：**2026-10-28**。
> 加權公式：核心戰場系統 ×3 ／ UI 系統 ×2 ／ 其他系統 ×1；🟢/🩵/☑️/🔷 = 1.0、🟡 = 0.5、🔴 = 0。
> 更新指令：加權總表與狀態分布 `node tools_node/build-progress-matrix.js`（先重算 D-1 接線／測試欄）；代碼覆蓋摘要 `node tools_node/rebuild-crossref.js --rebuild-progress`。邏輯欄（規格條目是否全部落地）仍為人工標記。

#### 加權進度總表

| 分類 | 計分權重 | 規格書數 | 最高得分 | 實得分 | 完成率 |
|---|---|---|---|---|---|
| 核心戰場系統（數值 / 兵種 / 戰場部署 / 戰法 / 奧義 / 因子爆發 / AI 強度） | ×3 | 8 | 24 | 13.5 | **56%** |
| UI 系統（doc_ui_*） | ×2 | 5 | 10 | 5.0 | **50%** |
| 其他系統（大廳 / 養成 / 經濟 / 技術文件等） | ×1 | 42 | 42 | 22.5 | **54%** |
| **合計（加權）** | — | **55** | **76** | **41.0** | **🟡 54%** |

#### 規格書實作狀態分布

| 狀態 | 規格書 | 規格書數 |
|---|---|---|
| 🟢 完整（邏輯／接線／測試皆 ✅） | 數值系統、demo_技術架構、運氣系統 | 3 |
| 🔷 名詞表類（不需代碼） | 名詞定義文件 | 1 |
| 🟡 進行中（有代碼，三欄未全 ✅） | 兵種（虎符）系統、戰場部署系統、武將系統、武將人物介面規格書、戰法系統、奧義系統、因子爆發系統、治理模式他國AI系統、大廳系統、官職系統、AI武將強度系統、名將挑戰賽系統、關卡設計系統、武將日誌與離線互動系統、MVP遊戲驗證規格書、新手開場規格書、UI 規格書、主戰場UI規格書、主戰場UI規格補充_v3、美術素材規劃與使用說明、UI技術規格書、Data Schema文件（本機端與Server端）、場景搭建指南、demo_playbook、keep §7、俘虜處理系統、傭兵系統（試用）、可結緣女性來源系統、同名武將系統、名士預言系統、因子解鎖系統、培育系統、家族關係（史實相性）系統、戰場適性系統、教官系統（支援卡）、正式版劇本文案、武將壽命系統、武將戰績系統、武將背包（倉庫）系統、留存系統、結緣系統（配種）、經濟系統、血統理論系統、資源循環系統、轉職與宿命系統、轉蛋系統、遊戲時間系統、道具系統（付費免費道具）、領地治理系統、戰法場景規格書、熱更新與版本控制規格書 | 51 |
| 🔴 尚無代碼或邏輯 ❌ | — | 0 |
| **合計** | | **55** |

#### 代碼覆蓋摘要（來自 B-1 × scripts 掃描，PROG-2-1427 於 2026-10-28 重跑）

| 項目 | 數量 |
|---|---|
| B-1 已記錄 `.ts` 檔 | 734 |
| B-1 ∩ 磁碟一致（present，assets/scripts 732＋shared 2） | 734 |
| B-1 中已消失（stale） | **0** ✅ |
| `assets/scripts/` 尚未收錄（uncovered） | **0** ✅ |
| `tests/` 測試檔數目 | 826 |

#### 14 個未收錄 `.ts` 分類（2026-04-12 舊表，已全部補入）

| 分類 | 主要檔案 | 數量 |
|---|---|---|
| 武將資料模型 | AIPopulationConfig, FamilyBranchSummary, GeneralLifecycle, PersonRegistry, SpiritCard, BloodlineGraph, BranchCompactor, BreedingQuotaEnforcer | 8 |
| 培育 / 血統 工具 | BloodlineGenerator, RarityResolver, NurtureSessionMapper | 3 |
| UI 面板 / 彈窗 | UltimateSelectPopup, BloodlineTreePanel, GeneralDataDebugPanel | 3 |
| **合計** | | **14** |

> ✅ PROG-2-1423（2026-10-28）：上表 13 檔已補入 B-1（新增 UI Panels 小節）；BloodlineGenerator 已不存在。此時 B-1 收錄 141 個檔名，assets/scripts 共 731 個，未收錄約 590 個，本節數字為 2026-04-12 舊值，需重跑 crossref-progress-scanner 重算。

> ✅ PROG-2-1425（2026-10-28）：core/systems 311 檔補入 B-1 Core Systems 表（268 檔由 @spec-source 對應到 doc_id；14 檔出處只寫 WBS 等未登錄名稱，29 檔未標出處）。此時 B-1 收錄 452 個檔名，未收錄剩 281 個（ui/core 85、ui/components 系列約 50、battle 系列約 85 等）。

> ✅ PROG-2-1426（2026-10-28）：其餘 279 檔補入 B-1（130 檔對到 doc_id、12 檔未登錄、137 檔未標出處；新增 19 個小節，如 Battle / Runtime、Battle / Skills / Resolvers、UI / Components / General-Detail）。assets/scripts 全部 .ts 檔名都已收錄。未標出處的檔待補檔頭出處。

> ✅ PROG-2-1427（2026-10-28）：`rebuild-crossref.js --rebuild-progress` 改為同時掃 assets/scripts 與 shared/（原本把 shared/ 的 skill-runtime.ts、protocols.ts 誤判為已消失），重跑後代碼覆蓋摘要如上。上方加權總表（規格書實作狀態）仍是 2026-04-12 的人工判定，工具不會重算。

> ✅ PROG-2-1430（2026-10-28）：加權總表與狀態分布改由 `build-progress-matrix.js` 依 D-1 五欄重算（🟢 邏輯／接線／測試全 ✅、🟡 有代碼、🔴 無代碼或邏輯 ❌、🔷 名詞表）；D-1 有代碼的列同時依代碼重算接線、測試欄（10 列有變，多為測試欄 ❌→✅）。核心分類加入戰法場景規格書（doc_spec_0039），故最高分由 75 變 76。結果 38% → 56%；只有 4 份達 🟢，其餘卡在邏輯欄 🟡（規格條目未全部落地，屬人工標記）。

> ✅ PROG-2-1429（2026-10-28）：B-1 標「未標出處」的 166 檔中 164 檔補上檔頭 @spec-source（依建檔提交訊息的任務卡與 WBS 代號、資料夾推定，逐檔審過），B-1 同步改成 doc_id。BattleUIInitializer.ts（BAT-1-0001 鎖定中）與 GachaPreviewStateRoute.ts（PR #856 改動檔頭，避免衝突）暫不動。

> 上述 14 檔尚未納入 B-1 映射。建議依上表分類，優先補入「武將資料模型」一組（合計 8 檔）再接葵育/血統與 UI 面板兩組。

> ✅ DC 架構 17 檔與 UCUF 框架 17 檔（合計 34 檔）已於 2026-04-12 補入 B-1（`doc_tech_0009` / `doc_ui_0049`）。剩餘 14 檔建議優先補入「武將資料模型」8 檔，再接培育/血統 3 檔與 UI 面板 3 檔。

---

### D-5. 進度歷史紀錄（每日）

> 每日最多一筆：同一天重跑結算時覆蓋該日資料。
> 歷史資料來源：早期可用 git 里程碑估算；自動化啟用後以掃描實算為主。

| 日期 | 加權總進度 | 資料來源 | 備註 |
|---|---|---|---|
| 2026-10-28 | 54% | 工具重算（D-4，build-progress-matrix.js） | 同日覆蓋最新值 |
| 2026-10-26 | 38% | 掃描實算（D-4） | 同日覆蓋最新值 |
| 2026-04-12 | 38% | 掃描實算（D-4） | 同日覆蓋最新值 |
| 2026-04-10 | 36% | 估算（cross-ref 壓縮與工具化） | 追蹤基礎穩定 |
| 2026-04-05 | 34% | 估算（戰場資料與 UI 合約補齊） | 核心/主戰場提升 |
| 2026-03-31 | 31% | 估算（測試骨架落地） | D-1 首版可用 |