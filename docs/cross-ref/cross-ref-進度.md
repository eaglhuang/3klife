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
| **名將挑戰賽系統.md (doc_spec_0007)** | DuelChallengePanel.ts、MonthlyScenarioCup.ts（月度場景賽 1~4 月場景、積分、歷史，PROG-2-1609；參賽資格〔禁騎兵戰法、水軍／弓兵適性 A 以上〕PROG-2-1610 已補；威力規則〔春耕奇謀智力戰法 ×1.5、山地奇兵步兵 S 地形加成翻倍〕PROG-2-1611 已接進積分；其餘月份未定、尚無報名畫面）；九州盃特殊規則〔赤壁火攻 ×2、官渡騎兵 ×1.8、夷陵弓兵 ×0.5／陷阱 ×2〕PROG-2-1612 已接進報名鏡像戰力，虎牢單挑規則只顯示 | ✅ | 🟡 | ❌ | ✅ | ⬜ |
| **關卡設計系統.md (doc_spec_0049)** | BattleScene.ts, BattleHUD.ts, DeployPanel.ts | ✅ | 🟡 | 🟡 | ❌ | ⬜ |
| **武將日誌與離線互動系統.md (doc_spec_0015)** | LobbyScene.ts | ✅ | 🟡 | ✅ | ❌ | ⬜ |
| **MVP遊戲驗證規格書.md (doc_spec_0045)** | GameManager.ts | ✅ | ✅ | ✅ | ❌ | ⬜ |
| **新手開場規格書.md (doc_spec_0031)** | SceneManager.ts, LoadingScene.ts, LobbyScene.ts, LoginScene.ts | ✅ | ✅ | 🟡 | ❌ | ⬜ |
| **UI 規格書.md (doc_ui_0027)** | UIConfig.ts, UIManager.ts, BattleHUD.ts, BattleLogPanel.ts, DeployPanel.ts, ToastMessage.ts, UILayer.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| **主戰場UI規格書.md (doc_ui_0001)** | UIConfig.ts, UIManager.ts, BattleHUD.ts, BattleScenePanel.ts, TigerTallyPanel.ts, UnitInfoPanel.ts, ActionCommandPanel.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
| **主戰場UI規格補充_v3.md (doc_ui_0003)** | BattleHUD.ts, ActionCommandPanel.ts, BattleLogPanel.ts, TigerTallyPanel.ts, GeneralQuickViewPanel.ts, Constants.ts | ✅ | 🟡 | 🟡 | ✅ | ⬜ |
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
| 因子解鎖系統.md (doc_spec_0009) | AwakeningReveal.ts（戰後覺醒結算揭示，PROG-2-1133；畫面定格動畫已補（PROG-2-1702）） | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 培育系統.md (doc_spec_0026) | NurtureSystem.ts、TacticLearning.ts、NurtureFlowController.ts（戰法列，PROG-2-1132／1134）；InspiredTacticMap.ts（靈感戰法對應戰法庫，PROG-2-1135） | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 家族關係（史實相性）系統.md (doc_spec_0024) | ComboAttackKin.ts, RelationEvents.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 戰場適性系統.md (doc_spec_0041) | ArenaScore.ts, BattleAptitude.ts, BattlefieldRecon.ts, DesertVitality.ts, TerrainTroopRules.ts, WeatherSchedule.ts, WeatherTacticRestriction.ts, EnvScoutPresenter.ts, TacticAvailabilityPresenter.ts | ✅ | 🟡 | ✅ | ✅ | ⬜ |
| 教官系統（支援卡）.md (doc_spec_0027) | NurtureSystem.ts（inspiredTacticIds）、GameSession.ts（learnTactic 擋法，PROG-2-1134）；InspiredTacticMap.ts（17 個靈感戰法對應現有 8 招戰法庫，PROG-2-1135；疾行／堅盾已改獨立效果 Haste 移動 +1、Fortified 防禦 ×1.2，PROG-2-1600；夜襲改獨立技能 insp-night-raid 前排單體、夜晚傷害 ×1.5，PROG-2-1698；長槍突刺改獨立技能 insp-lance-thrust 直線貫穿 2 格、無視 30% 防禦，PROG-2-1699；龍膽改獨立技能 insp-dragon-gall 前排單體、爆擊率 +30%，PROG-2-1700；結義之怒改獨立技能 insp-sworn-fury 前方扇形不衰減、爆擊率 +20%，PROG-2-1701；其餘逐招獨立效果未做）；NpcFriendMentor.ts（friendMentorCard）、NurtureFlowController.ts（setBorrowedMentor）、LobbyScene.ts（_onClickStartBorrow，好友借用入學前，PROG-2-1138） | ✅ | 🟡 | ✅ | ✅ | ⬜ |
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

#### D-1a. 邏輯欄重判紀錄 → 已拆至 [progress/d1a-rejudge.md](progress/d1a-rejudge.md)（PROG-2-1614）

### D-2. 待建 UI Spec 檔案 → [progress/d2-d3-pending-ui.md](progress/d2-d3-pending-ui.md)

### D-3. 待定 Contract → 同上分片

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