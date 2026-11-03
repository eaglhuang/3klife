<!-- 分片：cross-ref-code / ui -->
# 代碼索引分片：UI

> 入口：`docs/cross-ref/cross-ref-code.md`（doc_index_0001）。欄位說明見入口。

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
