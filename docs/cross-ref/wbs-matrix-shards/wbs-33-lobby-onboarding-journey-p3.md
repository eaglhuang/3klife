# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.3 大廳開場生涯（3/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.3 大廳開場生涯（3/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.3 3. 大廳、開場與生涯 (Lobby, Onboarding & Journey) · 第 3/4 段

> 續上段（表頭重複）。工作包 OPEN-14 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **OPEN-14** | M0 | 開場流程驗收測試與 UI 驗收（手機可讀、進退場、文案一致） | test | 2 | 🟢 已接線 | OPEN-01, OPEN-05, OPEN-11 | 17.4 五項程式驗證點有自動化測試；13章交付檢查清單全勾 | [v9 核對 2026-10-15] NewPlayerOpening 2 處呼叫端、OpeningIntroController、DestinyOpeningController（#430、#447、#456）；手機可讀與進退場實機驗收未做 |  |
| **JRN-01** | M9 | 武將日誌主檔 schema 與寫入 API（Journal_Entries/Action 範圍/Snapshot_Ref） | data | 2 | 🟢 已接線 | - | 重大戰果/派遣/互動事件可寫入時間軸並依武將/類別查詢，並可回扣 Action_Records 序號 | 規格見 doc_spec_0473；JournalLog.ts 5大分類、優先級0~100、sourceActionSeqRange雙向回扣與純函式查詢 | [v18.43 核對 2026-11-07] 規格 doc_spec_0473 定案；JournalLog 由 GameSession 接線，測試全過 |
| **JRN-02** | M9 | 晨報摘要生成（F-1：時間窗/加權抽樣/折疊重複低價值） | logic | 3 | 🟢 已接線 | JRN-01 | buildMorningReport 依官職輸出2~3則，隱藏事件不入選，同類折疊；單元測試通過 | 規格見 doc_spec_0474；MorningReport.ts 登入增量時間窗(journalMark)、官職2~3則名額、同類折疊去重與閱讀狀態 | [v18.43 核對 2026-11-07] 規格 doc_spec_0474 定案；MorningReport 由 JournalHubController 接線，測試全過 |
| **JRN-03** | M9 | 派遣整備：派遣案、品質評分(F-2)、冷卻、完成回報 | logic | 4 | 🟢 已接線 | JRN-01 | getDispatchScore 輸出品質區間；高風險任務拒絕代勞；完成寫入日誌與獎勵 | 規格見 doc_spec_0475；DispatchQuality.ts 45/25/15/15四軸加權評分、四階品質區間與highRisk高風險防代勞 | [v18.43 核對 2026-11-07] 規格 doc_spec_0475 定案；DispatchQuality 由 DispatchJobs、HallMissionDispatch 接線 |
| **JRN-04** | M9 | 離線互動事件（F-3 觸發、靜態模板 slot-filling、每登入窗1則主互動） | logic | 3 | 🟢 已接線 | JRN-01 | 離線>=4h且有衝突標籤時觸發，同一對角色同窗僅1則 | 規格見 doc_spec_0479；OfflineInteractionTrigger.ts 離線4小時/未讀<3/在世關係標籤四閘門判定、同登入窗對稱去重 | [v18.45 核對 2026-11-07] 規格 doc_spec_0479 定案；OfflineInteractionEvents、OfflineInteractionTrigger 接線 |
| **JRN-05** | M11 | 離線戰鬥快照（OfflineBattleSnapshot digest 與 syncHashLink 回扣） | server | 3 | 📄 僅資料 | JRN-01 | 自動解決/代勞產生快照，syncHashLink 可驗證回 Action_Records；不存逐格replay | /tmp/integ/assets/scripts/core/systems/SyncHash.ts、/tmp/integ/server/src/sync.ts、tests/SyncContract.test.ts（僅 sync hash 基礎，無 OfflineBattleSnapshot） |  |
| **JRN-06** | M6 | 晨報/日誌/派遣大廳入口 UI 與人物頁故事回看掛點 | ui | 4 | 🟢 已接線 | JRN-02, JRN-03 | 大廳顯示晨報彈窗與派遣板，人物頁抽屜可讀日誌摘要，空狀態顯示規定字串 | JournalHubController 被 LobbyScene 匯入；PROG-2-0478 | [v17.2 更正 2026-11-07] 純邏輯→已接線；原註記「尚未掛載」已過時 |
| **JRN-07** | M10 | 日誌/晨報字串與劇本文案落地 | content | 1 | 🟢 已接線 | JRN-06 | H章9個 UI Key 與G章5句文案進 i18n | 無 | 未開始→已接線；#1297 JournalTexts 接 JournalHubController／GeneralJournalController（#1290 字串測試） |
| **JRN-08** | M9 | 三國日報 Log 解析（24h Log→事件）整併至日誌 | logic | 3 | 🟢 已接線 | JRN-01 | 可從前24h Log 生成含獎勵(15%糧草)的日報條目並與晨報去重 | 規格見 doc_spec_0621；戰鬥日誌向三國日報轉譯與個人生涯日誌整併定案；與 RET-04 業務分工裁決完畢 | [v18.8 更正 2026-11-08] 純邏輯→已接線；規格 doc_spec_0621 定案（重複裁決完結） |
| **JRN-09** | M11 | 智慧 NPC 第二階段：Utility AI + LLM + SQLite-vec RAG | server | 5 | 🟡 純邏輯 | JRN-04 | Utility AI 決策、小型 LLM 潤飾、向量記憶檢索可在伺服端運作並降級為靜態模板 | NpcUtilityAI 離線互動評分（PROG-2-1379） | [v17.2 更正 2026-11-07] 未開始→純邏輯；LLM／SQLite-vec RAG 屬 npc-brain，見 BRAIN-* |
| **RET-01** | M9 | 5階段插畫進度系統（見面/交手/認同/信任/結義 解鎖判定與收藏） | logic | 3 | 🟢 已接線 | - | 依 1場戰鬥/3勝/Bond>=40/轉永久 解鎖階段並可查閱 Stage x/5 | 規格見 doc_spec_0476；MercenaryIllustration.ts 5階段解鎖(1初見/1戰/3勝/40好感/結義轉永久)、條件獨立與只進不退 | [v18.44 核對 2026-11-07] 規格 doc_spec_0476 定案；MercenaryIllustration 接線，測試全過 |
| **RET-02** | M9 | 傭兵名牌（帶原主名字）與社交展示 | ui | 2 | 🟡 純邏輯 | - | 傭兵卡面顯示『來自：{OriginalOwner}』 | ui/core/MercenaryNameplateRows.ts 名牌列資料（MERC-07，PROG-2-0476） | [v17.2 更正 2026-11-07] 未開始→純邏輯；社交展示（原主名）未做 |
| **RET-03** | M9 | 告別信生成（Expired 且 Bond>=20；20~40普通、40+感人） | logic | 2 | 🟢 已接線 | RET-01 | 傭兵到期時依 Bond 生成對應告別信並進收件匣，未讀標記 | 規格見 doc_spec_0477；FarewellLetterInbox.ts 門檻20點、normal(20~39)/moving(40+)分級、50封FIFO上限與未讀角標 | [v18.44 核對 2026-11-07] 規格 doc_spec_0477 定案；FarewellLetterInbox、MercenaryFarewellPresenter 接線，測試全過 |
| **RET-04** | M9 | 三國日報事件引擎（Log 採樣、NEWS_TRIGGER_TABLE、1~3條、插槽式敘事） | logic | 4 | 🟢 已接線 | - | 登入時依前24h Log 生成1~3條日報，事件類型符合觸發表，模板 [角色]+[情緒]+[行為]+[結果] 填充 | 規格見 doc_spec_0480；DailyNewsEngine.ts 前24h Log採樣、NEWS_TRIGGER_TABLE觸發映射、1~3則四插槽敘事拼裝 | [v18.45 核對 2026-11-07] 規格 doc_spec_0480 定案；DailyNewsEngine 由 GameSession、TurnFlowManager 接線 |
| **RET-05** | M9 | 日報事件效果：復仇/代勞/自主特訓/團購獎勵結算 | logic | 3 | 🟢 已接線 | RET-04 | 復仇取回5~20%損失資源、代勞完成簡單任務、特訓屬性小幅提升，並可寫回存檔 | 規格見 doc_spec_0481；DailyNewsEngine.ts 復仇反搶5~20%糧草、代勞完成、自主特訓屬性+1~3與一次性原子發放 | [v18.45 核對 2026-11-07] 規格 doc_spec_0481 定案；DailyNewsEngine、GameSession 接線，測試全過 |
| **RET-06** | M10 | 三國日報 UI 與劇本字串（頭條、已讀、各事件版型） | ui | 3 | 🟢 已接線 | RET-04 | 登入後彈出日報，顯示標題/日期與各事件字串，標記已讀 | 無 | 未開始→已接線；#1300 DailyReportTexts 接 DailyReportController／LobbyScene |
| **RET-07** | M9 | 世代成就（跨三代因子傳承偵測與獎勵） | logic | 2 | 🟢 已接線 | - | 後代出現祖先因子且世代差>=3時觸發成就與獎勵，Legacy_Count 累加 | 規格見 doc_spec_0478；LegacyAchievement.ts Generation_Gap>=3跨三代檢驗、祖先因子顯性遺傳、靈玉x100發放與同代去重 | [v18.44 核對 2026-11-07] 規格 doc_spec_0478 定案；LegacyAchievement 被 GameSession 接線，測試全過 |
| **RET-08** | M4 | 退役回流（退役武將轉教官） | logic | 3 | ✅ 已驗收 | - | 退役武將可轉為教官卡並進培育流程 | 規格見 doc_spec_0482；GenerationalLegacy.ts 退役轉先祖教官(+20%/+15%五維加成、初始羈絆50)、雙柱血脈共鳴奧義 | [v18.46 核對 2026-11-07] 規格 doc_spec_0482 定案；LegacyService、GenerationalLegacy 接線，測試全過 |
| **RET-09** | M9 | 日曆簽到連動（6日結義期每日登入）與連續登入統計 | logic | 2 | 🟢 已接線 | RET-01 | 6日結義倒數每日登入推進，Consecutive_Days/Last_Login 記錄 | 規格見 doc_spec_0483；LoginStreak.ts UTC+8時區切日、連續天數遞增/漏登歸一、傭兵6日結義期時程連動 | [v18.46 核對 2026-11-07] 規格 doc_spec_0483 定案；LoginStreak 由 GameSession 接線，測試全過 |
| **RET-10** | M9 | 薪資/懲罰系統（離隊與忠誠下降） | logic | 2 | 🟢 已接線 | - | 忠誠度低於門檻時觸發離隊/懲罰，規格補齊公式後實作 | 規格見 doc_spec_0620；武將俸祿薪資發放欠薪忠誠下降與下野叛離定案；季度俸祿與離隊警戒狀態機 | [v18.8 更正 2026-11-08] 純邏輯→已接線；規格 doc_spec_0620 定案（空白裁決完結） |
| **RET-11** | M11 | 離線社交（與他玩家武將切磋，需伺服端快照） | server | 4 | ⚪ 未開始 | RET-04 | 非同步取得他玩家武將快照並生成切磋日報與經驗獎勵 | 無（需伺服器，MVP 暫緩） | [v17.2 更正 2026-11-07] 依賴伺服器／外部：需伺服器快照，MVP 暫緩 |
| **RET-12** | M9 | 7天玩家體驗歷程與關鍵留存觸發點（無課/課長雙軌） | content | 3 | 🟢 已接線 | RET-04, RET-09 | Day1~7 事件節點可由配置驅動，Day1晚首次日報、Day2子嗣誕生通知等觸發點可測 | 規格見 doc_spec_0484；SevenDayJourney.ts 7天歷程時間窗、四大留存里程碑(日報/子嗣/大器/三代)、漏登順延容錯與雙軌支援 | [v18.46 核對 2026-11-07] 規格 doc_spec_0484 定案；SevenDayJourney 由 GameSession 接線，測試全過 |
| **RET-13** | M11 | 留存伺服端統計欄位與測試（Total_Illustrations/Legacy_Count/Daily_News_Count） | server | 2 | 🟡 純邏輯 | RET-01, RET-07 | 伺服端保存並回傳留存統計，並有 API 測試 | LegacyAchievement、GameSession／PlayerSaveService 本機存檔欄位 | [v17.2 更正 2026-11-07] 未開始→純邏輯；伺服端統計表未做 |
| **COPY-01** | M10 | 文案裁決與定稿：開場信件單一版本、按鈕文字、備選庫核准清單 | content | 1 | 🟢 已接線 | - | 兩版信件擇一並與新手開場18.1同步，六名將台詞與備選庫標註採用/備用 | 規格見 doc_spec_0622 §1.1；開場信件定稿採用原創幽默情懷版（《三國志2》＋全息時光頭盔搞笑破第四面牆版），與 Win95 書房分鏡完美契合 | [v18.56 裁決修正 2026-11-08] 恢復原創幽默情懷版定稿；規格 doc_spec_0622 定案 |
| **COPY-02** | M10 | 開場信件與教學引導文案入 i18n 表 | content | 1 | 🟢 已接線 | COPY-01 | 信件、教學引導文案以 Key 形式載入並於 Win95 信件畫面顯示 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **COPY-03** | M10 | 六位初始名將登場台詞資料化（含 portraitKey/battleVoiceKey） | content | 1 | 🟢 已接線 | COPY-01 | HeroBase.introLine 填入六句正式台詞並可在名將展示卡載入 | 規格見 doc_spec_0622；初始六名將正式古典台詞與語音立繪契約定案；InitialGeneralShowcase.formalLine 接線 | [v18.8 更正 2026-11-08] 純邏輯→已接線；規格 doc_spec_0622 定案（風格裁決完結） |
