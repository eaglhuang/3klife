# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.5 血統家族培育（9/9）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.5 血統家族培育（9/9）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture) · 第 9/9 段

> 續上段（表頭重複）。工作包 REC-03 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **REC-03** | M5 | 勝率與守護力計算函式 | logic | 1 | ✅ 已驗收 | REC-01 | WinRate 與 Guardian_Power 公式測試通過，分母為 0 有保護 | [v3 核對 2026-10-13] BattleRecordStats.winRate / guardianPowerOf；tests/BattleRecordStats.test.ts 通過 |  |
| **REC-04** | M5 | 戰績面板 UI（武將詳情『戰績』分頁） | ui | 3 | 🟢 已接線 | REC-02 | 詳情頁新增戰績分頁顯示五項與勝率 | [v3 核對 2026-10-13] GeneralDetailRecordChild.ts（戰績分頁）掛入 GeneralDetailComposite.ts:360/440；buildBattleRecordTabText；PROG-2-0081 |  |
| **REC-05** | M9 | 里程碑成就（百人/千人/萬人斬、不敗神話、守護之壁、修羅）判定與獎勵 | logic | 3 | ✅ 已驗收 | REC-02 | 達標時觸發成就並發放戰法筆記/稱號，隱藏因子待因子字典確認 | [v14 核對 2026-10-21] 里程碑成就獎勵表與達成後組合（f91a609d，合併 #376）；GameSession、HiddenFactorAwakening 呼叫 MilestoneRewards，MilestoneRewards.test.ts 存在 |  |
| **REC-06** | M9 | 隱藏因子覺醒掛鉤（不敗/鐵壁/殺意） | logic | 2 | ✅ 已驗收 | REC-05, GEN-08 | 成就達成時解鎖對應白/紅色因子 | [v13 核對 2026-10-20] 里程碑達成時覺醒隱藏因子（7730b68d，PROG-2-0711，#633）；HiddenFactorAwakening 由 GameSession 呼叫，測試存在 |  |
| **REC-07** | M4 | 退役戰績評分與虎符品質（retire_score 分級） | logic | 2 | ✅ 已驗收 | REC-02, LIFE-06 | 依公式輸出 N/R/SR/SSR 等級，邊界值測試通過 | [v8 核對 2026-10-15] 退役戰績評分分級（61741379，驗收測試 7a0f8304）；retire_score 由 BattleRecordStats 與 MentorCard 使用 |  |
| **REC-08** | M4 | 退役戰績回顧面板與季度戰損報告 | ui | 2 | 🟢 已接線 | REC-07 | 退役畫面顯示 UI_RETIRE_REVIEW，季度戰報顯示精力% | [v9 核對 2026-10-15] 退役戰績回顧面板 RetireReviewController 2 處呼叫端與 2 個測試（79e71c36 文字、面板控制器）；季度戰損報告未逐項核對 |  |
| **REC-09** | M9 | 單場戰報快照 BattleSnapshot | logic | 2 | ✅ 已驗收 | REC-02 | 每場戰鬥保存快照並含單場 MVP/最高傷害，受資料增長監控保護 | [v15 核對 2026-10-21] 單場戰報快照 BattleSnapshot 於戰後結算產出並接上 GameSession（77e30769，#703）；BattleSnapshot.test.ts 與 BattleSnapshotWiring.test.ts 存在 |  |
| **REC-10** | M9 | 賽季戰績重置與結算 | server | 3 | ✅ 已驗收 | REC-02 | 賽季切換時分段重置並結算獎勵（需伺服器或離線賽季機制） | [v15 核對 2026-10-21] 武將賽季戰績分段重置純邏輯（e9718e3d，#700）；戰後寫入與季切換歸檔接上 BattleRoster（0d4289ea #706、def0de1e #718）；BattleSeasonStats.test.ts 存在 |  |
| **REC-11** | M11 | 戰績排行榜（好友/全服） | server | 4 | 🟢 已接線 | REC-10 | 可依傷害/擊殺/守護力排序顯示好友與全服榜 | [v15 核對 2026-10-21] 戰績排行榜排序純邏輯（85a84d65，#709）與 GameSession 本機查詢（1176d601，#716）；BattleLeaderboard.test.ts 存在；好友／全服部分未做，排行 UI 未核對 |  |
| **REC-12** | M10 | 戰績劇本與字串（百人斬、千人斬、不敗、守護、退役回顧） | content | 1 | 🟢 已接線 | - | 字串 Key 進 i18n | [v9 核對 2026-10-15] 戰績里程碑名稱字串進語系表（521eb895，PROG-2-0445）；戰後里程碑 log 改用語系查詢（2f5313bf，PROG-2-0801）；劇本文案未逐項核對 |  |
| **MERC-01** | M6 | 傭兵資料模型（Merc_UID/Bond/Days_Left/Status/Illustration_Stage/Original_Owner）與存檔 | data | 1 | ✅ 已驗收 | - | 傭兵狀態型別與存檔欄位完成，往返序列化測試通過 | [v4 核對 2026-10-13] MercenarySaveModel 序列化與讀檔校正接進 GameSession 與玩家存檔快照；tests/MercenarySaveModel.test.ts、MercenarySaveWire.test.ts |  |
| **MERC-02** | M6 | 傭兵獲取（試用券/轉蛋→6 日傭兵，能力固定 100%） | logic | 2 | 🟢 已接線 | MERC-01 | 使用試用券產生 Trial 傭兵，數值=原值×1.0 | [v6 核對 2026-10-14] 試用券招募接上 GameSession（53602c07）；MercenaryTrialTicket 有呼叫端 |  |
| **MERC-03** | M6 | 6 日結義倒數與每日好感（+10，最大 60） | logic | 2 | ✅ 已驗收 | MERC-01, GEN-01 | 每日推進 Days_Left-1 與 Bond+10，6 日後狀態轉 Expired，測試通過 | [v5 核對 2026-10-14] MercenaryAffection.ts 試用每日好感與倒數合併推進（8e6b9366，PROG-2-0311）；3 處呼叫端，tests/MercenaryAffection.test.ts 通過 |  |
| **MERC-04** | M6 | 結義轉永久（結義點數 R100/SR300/SSR600/UR1200；SSR/UR 雙軌美酒） | logic | 3 | 🟢 已接線 | MERC-03 | 點數足夠則轉為永久武將並扣點；SSR/UR 美酒路徑依 Q42 裁決 | [v5 核對 2026-10-14] 結義點數改扣 GCH-06 餘額（8e724e11，PROG-2-0320）；MercenaryBondPermanent 接線；SSR/UR 美酒路徑與點數獲得流程仍未定 |  |
| **MERC-05** | M6 | 退場流程（到期未結義離隊、告別信）與 30 天冷卻 | logic | 2 | ✅ 已驗收 | MERC-03 | 到期傭兵離隊並出現告別信；同武將 30 天內不再出現於傭兵選單 | [v5 核對 2026-10-14] MercenaryDeparture.ts 退場與 30 天冷卻以武將為單位（a5074a16，PROG-2-0315）；5 處呼叫端，tests/MercenaryDeparture.test.ts 通過 |  |
| **MERC-06** | M5 | 傭兵上場限制（可出戰、數值不計入永久紀錄、不被俘虜） | logic | 2 | 🟢 已接線 | MERC-02, REC-02 | 傭兵出戰不寫入永久戰績，戰場上不可被俘虜 | [v4 核對 2026-10-13] 試用傭兵出戰不寫入永久紀錄（PROG-2-0217）；接戰場結算 |  |
| **MERC-07** | M6 | 傭兵介面（倒數、結義進度、名牌、確認視窗、告別 UI） | ui | 4 | 🟢 已接線 | MERC-03 | 傭兵畫面顯示 UI_MERC_* 字串並可執行結義/退場 | [v8 核對 2026-10-15] 傭兵池列表（91fce092）、名牌入口（9b5d511e）與 MercenaryPanelController 2 處呼叫端；倒數與告別 UI 未逐項核對 |  |
| **MERC-08** | M10 | 五階段插畫進度系統（見面/交手/認同/信任/結義） | content | 3 | 🟢 已接線 | MERC-03 | Illustration_Stage 1~5 依好感度解鎖並顯示對應插圖/文案（D3/D4 純敘事） | MercenaryIllustration 被 MercenaryBattleRecord、PanelView、SaveModel、TrialDay 匯入 | [v17.2 更正 2026-11-07] 未開始→已接線 |
| **MERC-09** | M8 | 二轉機制（結義後再抽同名卡自動二轉）與重複卡分流整合 | logic | 2 | ⚪ 未開始 | MERC-04, SAME-06 | 已永久的傭兵武將再次抽到時觸發二轉並提升屬性上限 | 無 |  |
| **MERC-10** | M4 | 退役轉教官（Age≥65→教官卡，Mentor_TP_Base=Total_TP×0.3） | logic | 2 | 🟢 已接線 | LIFE-07 | 退役後產生教官卡且 TP 基底=Total_TP×0.3 | [master fb02ff9 重估] LegacyService.ts + MentorCard.ts（PROG-2-0031） |  |
| **MERC-11** | M11 | 傭兵名牌與演武筆記回傳原主（社交） | server | 3 | ⚪ 未開始 | MERC-01 | 傭兵顯示原主名並將戰鬥記錄回傳原主（需伺服器） | 無 | [v17.2 更正 2026-11-07] 依賴伺服器／外部：原主為另一位玩家，需伺服器多人同步 |
| **MERC-12** | M6 | 傭兵凍結（結義後保留數值快照） | logic | 1 | 🟢 已接線 | MERC-04 | 結義後保留當前 Stats_Snapshot 為永久武將初始值 | [v5 核對 2026-10-14] MercenaryBondPermanent 數值快照複製接進結義流程（5c48e5d5，PROG-2-0308） |  |
| **FBR-12** | M6 | 因子揭露順序改照因子爆發系統 §K（FACTOR_DISCOVERY_LEVEL 綠 20→1、紅 45→20，代表色改白） | logic | 1 | 🟢 已接線 | - | 揭露門檻依 §K 推導，DiscoveryThresholds/FactorAwakening 讀同一門檻 | PROG-2-1465（#1276，ed52892e）；工時為估計值 | 新增列（協調線指示）；來源卡 PROG-2-1465；已接線 |
