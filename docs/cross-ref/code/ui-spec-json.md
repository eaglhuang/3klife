<!-- 分片：cross-ref-code / ui-spec-json -->
# 代碼索引分片：UI Spec JSON 畫面表

> 入口：`docs/cross-ref/cross-ref-code.md`（doc_index_0001）。欄位說明見入口。

#### UI Spec JSON（三層 JSON 系統；由 `node tools_node/rebuild-crossref.js --rebuild-screens` 自動產生）

| Screen | Layout | Skin | Screen 檔 | Bundle | 引用的 TS（assets/scripts 相對路徑） |
|---|---|---|---|---|---|
| action-command-screen | action-command-main.json | action-command-default.json | action-command-screen.json | battle_ui | ui/components/ActionCommandComposite.ts |
| battle-hud-screen | battle-hud-screen.json | battle-hud-screen.skin.json | battle-hud-screen.json | battle_ui | ui/components/BattleHUD.ts<br>ui/components/BattleHUDComposite.ts |
| battle-log-screen | battle-log-main.json | battle-log-default.json | battle-log-screen.json | battle_ui | ui/components/BattleLogComposite.ts<br>ui/components/BattleLogPanel.ts |
| battle-review-screen | battle-review-main.json | battle-review-screen.skin.json | battle-review-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| bloodline-mirror-awakening-screen | bloodline-mirror-loading-main.json | bloodline-mirror-loading-default.json | bloodline-mirror-awakening-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| bloodline-mirror-loading-screen | bloodline-mirror-loading-main.json | bloodline-mirror-loading-default.json | bloodline-mirror-loading-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| bonding-setup-screen | bonding-setup-main.json | bonding-setup-screen.skin.json | bonding-setup-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| character-ds3-main | character-ds3-main.json | character-ds3-main.skin.json | character-ds3-main.json | resources | ui/components/GeneralDetailComposite.ts<br>ui/core/UIVariantRouter.ts<br>ui/scenes/LoadingScene.ts 等 4 檔 |
| character-ds3 | character-ds3.json | character-ds3.skin.json | character-ds3.json | resources | （程式未引用） |
| daily-report-screen | daily-report-main.json | daily-report-screen.skin.json | daily-report-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| deploy-panel-screen | deploy-panel-main.json | deploy-panel-default.json | deploy-panel-screen.json | battle_ui | ui/components/DeployComposite.ts |
| destiny-opening-screen | destiny-opening-main.json | destiny-opening-screen.skin.json | destiny-opening-screen.json | lobby_ui | ui/core/LobbyOpeningPanels.ts<br>ui/scenes/LobbyScene.ts |
| destiny-shop-screen | destiny-shop-main.json | destiny-shop-screen.skin.json | destiny-shop-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| domestic-screen | domestic-main.json | domestic-screen.skin.json | domestic-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| duel-challenge-screen | duel-challenge-main.json | duel-challenge-default.json | duel-challenge-screen.json | battle_ui | ui/components/DuelChallengeComposite.ts<br>ui/scenes/LoadingScene.ts |
| elite-troop-codex-rail-screen | elite-troop-codex-rail-main.json | elite-troop-codex-rail-default.json | elite-troop-codex-rail-screen.json | lobby_ui | （程式未引用） |
| elite-troop-codex-screen | elite-troop-codex-main.json | elite-troop-codex-default.json | elite-troop-codex-screen.json | lobby_ui | ui/components/EliteTroopCodexComposite.ts<br>ui/scenes/LoadingScene.ts |
| gacha-ds3 | gacha-ds3.json | gacha-ds3.skin.json | gacha-ds3.json | lobby_ui | ui/core/GachaFlowCoordinator.ts |
| gacha-main-screen | gacha-preview-main.json | gacha-default.json | gacha-main-screen.json | lobby_ui | （程式未引用） |
| gacha-pull-result | gacha-pull-result.json | gacha-pull-result.skin.json | gacha-pull-result.json | lobby_ui | ui/core/GachaFlowCoordinator.ts |
| gacha-screen | — (多子畫面) | — | gacha-screen.json | — | （程式未引用） |
| gacha-shop-ds3 | gacha-shop-ds3.json | gacha-shop-ds3.skin.json | gacha-shop-ds3.json | lobby_ui | （程式未引用） |
| general-bloodline-vignette-screen | general-bloodline-vignette-main.json | general-bloodline-vignette-default.json | general-bloodline-vignette-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| general-detail-bloodline-v3-screen | general-detail-bloodline-v3-main.json | general-detail-bloodline-v3-default.json | general-detail-bloodline-v3-screen.json | lobby_ui | （程式未引用） |
| general-detail-screen | general-detail-main.json | general-detail-default.json | general-detail-screen.json | lobby_ui | ui/components/GeneralDetailComposite.ts |
| general-detail-unified-screen | general-detail-unified-main.json | general-detail-unified-default.json | general-detail-unified-screen.json | lobby_ui | ui/components/GeneralDetailComposite.ts<br>ui/core/UIVariantRouter.ts<br>ui/scenes/LoadingScene.ts |
| general-journal-screen | general-journal-main.json | general-journal-screen.skin.json | general-journal-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| general-list-screen | general-list-main.json | general-list-default.json | general-list-screen.json | lobby_ui | ui/components/GeneralListComposite.ts<br>ui/scenes/LoadingScene.ts |
| general-portrait-screen | general-portrait-main.json | general-portrait-default.json | general-portrait-screen.json | lobby_ui | ui/components/GeneralPortraitComposite.ts |
| general-quickview-screen | general-quickview-main.json | general-quickview-default.json | general-quickview-screen.json | battle_ui | ui/components/GeneralQuickViewPanel.ts |
| general-version-gallery-screen | general-version-gallery-main.json | nurture-flow-default.json | general-version-gallery-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| governor-hall-screen | governor-hall-main.json | governor-hall-screen.skin.json | governor-hall-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| hall-board-screen | hall-board-main.json | hall-board-screen.skin.json | hall-board-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| initial-showcase-screen | initial-showcase-main.json | initial-showcase-screen.skin.json | initial-showcase-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| item-bag-screen | item-bag-main.json | item-bag-screen.skin.json | item-bag-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| job-change-screen | job-change-main.json | job-change-screen.skin.json | job-change-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| journal-hub-screen | journal-hub-main.json | journal-hub-screen.skin.json | journal-hub-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| lobby-city-hub-screen | lobby-city-hub-main.json | lobby-city-hub-default.json | lobby-city-hub-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
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
| onboarding-tutorial-screen | onboarding-tutorial-main.json | onboarding-tutorial-screen.skin.json | onboarding-tutorial-screen.json | lobby_ui | ui/core/LobbyOpeningPanels.ts |
| opening-intro-screen | opening-intro-main.json | opening-intro-screen.skin.json | opening-intro-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| opening-letter-screen | opening-letter-main.json | opening-letter-screen.skin.json | opening-letter-screen.json | lobby_ui | ui/core/LobbyOpeningPanels.ts |
| prisoner-popup-screen | prisoner-popup-main.json | prisoner-popup-screen.skin.json | prisoner-popup-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| rank-progress-screen | rank-progress-main.json | rank-progress-default.json | rank-progress-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
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
| spirit-card-detail-screen | spirit-card-detail-main.json | spirit-codex-screen.skin.json | spirit-card-detail-screen.json | lobby_ui | （程式未引用） |
| spirit-codex-screen | spirit-codex-main.json | spirit-codex-screen.skin.json | spirit-codex-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| spirit-tally-detail-screen | spirit-tally-detail-main.json | spirit-tally-detail-default.json | spirit-tally-detail-screen.json | lobby_ui | ui/core/SpiritTallyDetailView.ts<br>ui/scenes/LoadingScene.ts |
| support-card-screen | — (多子畫面) | — | support-card-screen.json | lobby_ui | （程式未引用） |
| tiger-tally-detail-panel-screen | tiger-tally-detail-panel-main.json | tiger-tally-detail-panel-default.json | tiger-tally-detail-panel-screen.json | battle_ui | （程式未引用） |
| tiger-tally-screen | tiger-tally-main.json | tiger-tally-default.json | tiger-tally-screen.json | battle_ui | ui/components/TigerTallyComposite.ts<br>ui/components/TigerTallyPanel.ts |
| toast-message-screen | toast-message-main.json | toast-message-default.json | toast-message-screen.json | common_ui | ui/components/ToastMessageComposite.ts |
| tournament-screen | tournament-main.json | tournament-screen.skin.json | tournament-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| ultimate-codex-screen | ultimate-codex-main.json | ultimate-codex-screen.skin.json | ultimate-codex-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| ultimate-select-popup-screen | ultimate-select-popup-main.json | ultimate-select-popup-default.json | ultimate-select-popup-screen.json | battle_ui | ui/components/UltimateSelectPopupComposite.ts |
| unit-info-panel-screen | unit-info-panel-main.json | unit-info-panel-default.json | unit-info-panel-screen.json | battle_ui | ui/components/UnitInfoComposite.ts<br>ui/components/UnitInfoPanel.ts |
| v2-workflow-skip-editor | v2-workflow-skip-editor.json | v2-workflow-skip-editor.skin.json | v2-workflow-skip-editor.json | ui_test | （程式未引用） |
| v2-workflow | v2-workflow.json | v2-workflow.skin.json | v2-workflow.json | ui_test | （程式未引用） |
| warehouse-panel-screen | warehouse-panel-main.json | warehouse-panel-screen.skin.json | warehouse-panel-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| wish-altar-screen | wish-altar-main.json | wish-altar-screen.skin.json | wish-altar-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |
| year-report-screen | year-report-main.json | year-report-screen.skin.json | year-report-screen.json | lobby_ui | ui/scenes/LobbyScene.ts |

