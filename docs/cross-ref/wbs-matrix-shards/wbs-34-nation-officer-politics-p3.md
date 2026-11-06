# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.4 國家官職天下（3/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.4 國家官職天下（3/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.4 4. 國家、官職與天下大勢 (Nation, Officer & Politics) · 第 3/4 段

> 續上段（表頭重複）。工作包 TRN-09 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **TRN-09** | M9 | 賽季歷史留檔 Season_History 與 Monthly_Scenario_History | server | 1.5 | ⚪ 未開始 | TRN-07 | 賽季結束寫入歷史，含最終快照 ID 與最高連勝 | 無 |  |
| **TRN-10** | M8 | 賽季獎勵發放（排名/段位） | server | 2 | ⚪ 未開始 | TRN-07 | 依段位結算發放，不重複領 | 無 |  |
| **TRN-11** | M9 | 挑戰賽 UI（賽季頁、隊伍登錄、對戰紀錄、段位、倒數） | ui | 5 | ⚪ 未開始 | TRN-02, TRN-03 | UI 顯示所有 UI_TOURNAMENT_* 字串與狀態 | 無 |  |
| **TRN-12** | M9 | 季節虎符標籤與 BOSS 弱點傷害 x1.5 | logic | 2 | ⚪ 未開始 | TRN-02 | 命中弱點標籤傷害乘 1.5，測試通過 | 無 |  |
| **TRN-13** | M9 | 季節 BOSS 戰（全服合力）與挑戰券 | server | 4 | ⚪ 未開始 | TRN-12 | BOSS 血量全服累計並依貢獻發獎 | 無 |  |
| **TRN-14** | M9 | 九州盃（極端場景賽，積分制） | logic | 3 | ⚪ 未開始 | TRN-06 | 四種九州盃規則生效並計分 | 無 |  |
| **TRN-15** | M9 | 月度場景賽與 Monthly_Score 公式、稱號 | logic | 3 | ⚪ 未開始 | TRN-05 | 每月場景限制生效，積分不計入主賽 | 無 |  |
| **TRN-16** | M8 | 商業連動：月度場景虎符、場景道具、挑戰券販售 | logic | 2 | ⚪ 未開始 | TRN-12 | 虎符限時 30 天，道具加成可配置 | [v16.4 封鎖 blocked 2026-10-27] 商業化（月度場景虎符、場景道具、挑戰券販售）待使用者裁決 ；無 |  |
| **MVP-01** | M0 | MVP 武將最小資料結構（UID/Template/Bloodline_ID/Vitality/Class/Status/Ancestors_JSON） | data | 3 | 🟢 已接線 | - | General schema 欄位齊全、有型別與 JSON 載入測試 | [v7 核對 2026-10-14] GeneralSchema 由 DataPageLoader 與 LobbyScene 呼叫（e1695b27 載入檢查）；GeneralSchema 測試 |  |
| **MVP-02** | M4 | 三代循環整合驗收（祖→父→子端到端測試） | test | 4 | ✅ 已驗收 | MVP-03, MVP-05, MVP-06, MVP-07 | 自動測試跑完 結緣→開獎→培育→退役→子代再結緣 並通過 | [master fb02ff9 重估] tests/Legacy.test.ts:185 祖→父→子三代循環 headless 測試（run-cli 通過） |  |
| **MVP-03** | M2 | 結緣＋EP_MVP 串進主流程 | logic | 3 | 🟢 已接線 | MVP-01 | breed() 產出子嗣且 EP=50+共鳴+異脈+契合，UI 可觸發 | [master fb02ff9 重估] BreedingService.ts + BondingSetupController.ts（PROG-2-0045 結緣正式介面） |  |
| **MVP-04** | M2 | 六色因子字典與 GeneObject 完整落地 | data | 3 | 🟢 已接線 | MVP-01 | 字典含六色且每色至少 3 筆，GeneObject 五欄位可序列化 | [master fb02ff9 重估] core/systems/FactorInheritance.ts 六色字典（PROG-2-0035） |  |
| **MVP-05** | M3 | 培育 36 回合（鏡像快照＋教官＋基礎 TP） | logic | 5 | ✅ 已驗收 | MVP-01, MVP-04 | 完成 36 回合並把數值寫回本體，單元測試通過 | [master fb02ff9 重估] tests/Nurture.test.ts 36 回合流程（run-cli 通過） |  |
| **MVP-06** | M3 | 5 歲開獎與武官/文官分流 | logic | 3 | 🟢 已接線 | MVP-03 | 年滿 5 歲子嗣揭曉五維與因子並可選職能 | [master fb02ff9 重估] Unveiling.ts 5 歲開獎（PROG-2-0028/0034） |  |
| **MVP-07** | M1 | 季度推進＋年齡增長＋65 歲退役判定 | logic | 3 | ✅ 已驗收 | - | 推進 4 季年齡 +1，達 65 歲發退役事件 | GameClock.ts、GeneralAging.ts；/tmp/integ/tests/GameSession.test.ts GameClock/Aging 案例 |  |
| **MVP-08** | M6 | 單池轉蛋＋保底 | logic | 3 | 🟢 已接線 | - | 保底次數內必出 SSR，結果寫入名冊 | assets/scripts/core/services/LocalGachaService.ts、assets/resources/data/gacha-config.json；/tmp/integ/tests/GameSession.test.ts 大廳抽卡案例 |  |
| **MVP-09** | M6 | 傭兵 6 日結義（試用→結義） | logic | 3 | ✅ 已驗收 | MVP-01 | Trial 6 日倒數後可結義成 Bonded | [v4 核對 2026-10-13] MercenaryBond.ts 試用 6 日→結義（PROG-2-0280）；tests/MercenaryBond.test.ts、CrossSystemIntegration.test.ts 通過；傭兵 UI 未接 |  |
| **MVP-10** | M6 | 基礎內政 5 大任務產出 | logic | 3 | ✅ 已驗收 | - | 每季選一任務產出資源 | [v5 核對 2026-10-14] 內政 5 大任務接進 GameSession 與存檔（53a46b1f）與大廳內政畫面（95d26ded，PROG-2-0319）；DomesticTasks 5 處呼叫端、測試通過 |  |
| **MVP-11** | M6 | 新手 3 段式引導與 P0 UI_ 字串 | content | 3 | ✅ 已驗收 | - | 首次進入依序出現 3 段引導 | [v4 核對 2026-10-13] OnboardingTutorial.ts 3 段引導接大廳與存檔（PROG-2-0229/0282）；OnboardingFlowController 接 LobbyScene；tests/OnboardingFlow.test.ts、OnboardingTutorial.test.ts 通過 |  |
| **MVP-12** | M11 | Server 最小六表（generals/gene_dictionary/nurture_sessions/mercenaries/player_resources/gacha_history） | server | 4 | 🟢 已接線 | MVP-01 | 六表建立且 CRUD 測試通過 | [v14 核對 2026-10-21] 存檔快照映射六表列與驗證（1a958424，PROG-2-0880，#652）；PlayerSaveService 呼叫 mapSnapshotToSixTables，PlayerSaveTableRows.test.ts 存在。伺服器未部署，依 PM 裁定定為已接線 |  |
| **MVP-13** | M9 | 全球征途擴展預留（第二/三階段掛點） | logic | 1 | ✅ 已驗收 | - | 模式與關卡列舉預留，不影響 MVP | [v14 核對 2026-10-21] 全球征途階段入口接線（612a7b2d，PROG-2-0851，#649）；CampaignStages 與 GameSession、LobbyScene 接線，CampaignStages.test.ts 存在；MVP 只啟用第一階段 |  |
| **TIME-01** | M1 | 季度推進器 GameClock（年/季/總季數/模式） | logic | 2 | ✅ 已驗收 | - | 推進 4 季跨年且只在冬→春標 yearEnded | /tmp/integ/assets/scripts/core/systems/GameClock.ts；/tmp/integ/tests/GameSession.test.ts GameClock 5 案例 |  |
| **TIME-02** | M1 | 三模式輪轉（治理→作戰→培育） | logic | 1 | ✅ 已驗收 | TIME-01 | 每次推進模式依序輪轉，restore 驗證不合法值 | /tmp/integ/GameClock.ts；/tmp/integ/tests/GameSession.test.ts 『模式依 治理→作戰→培育 輪轉』 |  |
| **TIME-03** | M1 | 武將老化（每季 +0.25 歲）與壽命/退役/死亡判定 | logic | 3 | ✅ 已驗收 | TIME-01 | 4 季+1 歲；跨 65 歲發一次退役候選；超齡擲骰死亡 | /tmp/integ/assets/scripts/core/systems/GeneralAging.ts；/tmp/integ/tests/GameSession.test.ts Aging 7 案例（含紅因子+3歲） |  |
| **TIME-04** | M1 | 時間顯示 UI『第 N 年 M 季』 | ui | 1 | 🟢 已接線 | TIME-01 | 大廳頂部顯示季度與模式中文 | /tmp/integ/assets/scripts/ui/scenes/LobbyScene.ts 引用 GAME_SESSION_EVENTS；/tmp/integ/tests/GameSession.test.ts 『大廳：季度標籤』 |  |
| **TIME-05** | M1 | Game_Time 本機存檔與 Server 時間欄位（Total_Seasons/Current_Mode） | server | 3 | 🟢 已接線 | TIME-01 | 推進後重建 session 讀檔狀態一致；Server 表有 Total_Seasons | /tmp/integ/PlayerSaveService.ts、GameSession.ts；/tmp/integ/tests/GameSession.test.ts 『推進 4 季後重建 session 讀檔』；Server 表尚無 |  |
| **TIME-06** | M3 | 培育 36 回合=外界 1 季的時間銜接 | logic | 2 | ✅ 已驗收 | TIME-02 | 進入培育模式結算 36 回合只推進 1 季 | [v7 核對 2026-10-14] PM 裁定維持既有設計（培育 36 回合＝外界 1 季），依裁定標已驗收 |  |
| **TIME-07** | M9 | 年終結算與年報畫面 | ui | 3 | ✅ 已驗收 | TIME-01 | 每 4 季觸發年報，UI_YEAR_REPORT 顯示 | [v12 核對 2026-10-20] 年報畫面 UI_YEAR_REPORT 接 YearEnded（2de6356d，PROG-2-0820，#563）；YearReport 由 LobbyScene 與 GameSession 呼叫，測試 4 個 |  |
| **TIME-08** | M9 | 季度事件與四季特色（春稅收/夏建設×2/秋糧草/冬結緣+10%） | logic | 4 | 🟢 已接線 | TIME-01 | 各季修正值可由設定檔載入並影響對應系統 | [v13 核對 2026-10-20] 夏季訓練體力消耗倍率（1b840595，TIME-08 子項，#640）；季度事件本體未核對 |  |
| **TIME-09** | M10 | 四季與換季字串（UI_SEASON_*） | content | 1 | ✅ 已驗收 | - | 四季文案可由 i18n 取得 | [v12 核對 2026-10-20] 四季與換季字串進語系表（64bc4d2e，#560）與大廳季節字串接上畫面（bc54bc08，#574）；SeasonTexts 由 LobbyScene 呼叫，測試存在 |  |
