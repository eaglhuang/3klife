# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.3 大廳開場生涯（2/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.3 大廳開場生涯（2/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.3 3. 大廳、開場與生涯 (Lobby, Onboarding & Journey) · 第 2/4 段

> 續上段（表頭重複）。工作包 GCH-06 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **GCH-06** | M8 | 天命商店與結義點數兌換、溢出轉化積分 | ui | 3 | ✅ 已驗收 | GCH-03, GCH-05 | 大保底達200可兌換任意SSR；5轉滿溢出轉結義金蘭卡/積分並顯示 Toast | [v5 核對 2026-10-14] 滿轉溢出轉結義點數（2e85b065，PROG-2-0315）；OverflowBond 2 處呼叫端，測試通過 |  |
| **GCH-07** | M8 | 戰法隨機化（同名第2/3戰法隨機、重複轉經驗值） | logic | 2 | 🟢 已接線 | GCH-02 | 同名武將第2、第3戰法在池內隨機抽出，重複時轉經驗值 | TacticRandomization 被 GameSession 匯入；PROG-2-1168（#1006） | [v17.2 更正 2026-11-07] 未開始→已接線 |
| **GCH-08** | M6 | 轉蛋 UI 流程：池頁簽、機率公告、單抽快速演出/十連開牌、結果頁 | ui | 4 | 🟢 已接線 | GCH-02 | 名將池/支援池/限定頁簽可切換，1抽約2秒演出，10連逐張開牌，顯示距保底抽數 | assets/scripts/ui/core/GachaFlowCoordinator.ts、ui/components/gacha-ds3/Gacha*Child.ts、ui-spec/layouts/gacha-main.json、gacha-pull-result.json；無測試 |  |
| **GCH-09** | M10 | GachaMain 商業主視覺與人物立繪 soft-alpha/key visual | content | 3 | 🟢 已接線 | GCH-08 | Banner 人物無矩形邊界/白底鬼影/硬切alpha，不壓住池名條與CTA；未就緒池省略人物節點 | tests/fixtures/dom-to-ui/gacha-banner.html 與 baseline；PortraitSoftMask 材質需另查；無 runtime 驗收 |  |
| **GCH-10** | M6 | 雙池定位導覽與死亡傳承提示（血統種子/培育深度、英靈/虎符提示） | ui | 1 | 🟢 已接線 | GCH-08 | 卡池頁與新手引導明示定位；名將詳情頁提示死亡後留下英靈卡與虎符卡且不在抽卡結果掉落 | [v7 核對 2026-10-14] 雙池定位導覽接入轉蛋畫面（19c9b34e、7e592c85）；GachaPoolGuide 2 處呼叫端；死亡傳承提示 UI 未逐項核對 |  |
| **GCH-11** | M3 | 支援卡教官被動技能驗證與教官碎片/碎片庫 | logic | 3 | 📄 僅資料 | GCH-02 | SR/SSR 支援卡被動技能經驗證載入；重複卡分解為教官碎片進碎片庫並可合成低稀有支援卡 | assets/resources/data/support-cards.json（資料）；碎片庫無 |  |
| **GCH-12** | M8 | 限定池排程與期間限定角色輪替 | server | 3 | 🟢 已接線 | GCH-01 | 可依排程上下架限定池；銅錢符不可用於限定池 | LimitedPoolSchedule 被 LocalGachaService、LobbyScene 匯入 | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **GCH-13** | M9 | 重複卡連動：同名卡升星、傭兵二轉(Q73)、譜牒印記(子孫升星) | logic | 3 | 🟡 純邏輯 | GCH-05 | 僅史實名將可同名升星；傭兵轉正後抽到同名觸發二轉；子孫升星透過 Lineage_Seal | GameSession.addGenerals 回報 duplicates 並支援 rebirthOnDuplicate | [v17.2 更正 2026-11-07] 未開始→純邏輯；同名卡升星、傭兵二轉、譜牒印記未確認 |
| **GCH-14** | M11 | 抽卡伺服端記錄與同步（Total_Pulls/Pity/Bonding/Last_SSR_Pull） | server | 3 | 🟢 已接線 | GCH-03, GCH-04 | 伺服端保存玩家各池累計抽數與保底，客戶端離線抽卡同步時可驗證 | GachaSyncRecord 被 LocalGachaService 匯入；PROG-2-1397（#1346） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **OPEN-01** | M6 | OpeningFlowController 與 OpeningFlowConfig（階段順序/進出條件/可回溯事件） | logic | 3 | 🟢 已接線 | - | 可依 phase 設定依序播放開場各幕，每階段有進出條件，中斷可還原並在未登入情況顯示預設內容 | [v6 核對 2026-10-14] 可設定開場流程控制器（fd8b82ea，PROG-2-0109）；宿命轉蛋接上開場（8223115f，OPEN-05 接 OPEN-01） |  |
| **OPEN-02** | M11 | 開場資料表（HeroBase/SupportCardBase/InheritLogic/初始六名將/紅顏/因子標籤/祖先矩陣） | data | 3 | 🟡 純邏輯 | - | 六位初始名將(張飛/魏延/夏侯惇/張郃/孫策/甘寧)含出生地/稱號/主因子與台詞載入驗證通過 | [v6 核對 2026-10-14] 初始六名將表（58e88e37）與 generalId 引用（cdc70353）；無 src 呼叫端 | 2026-10-28 核對 master：InitialHeroTable.ts 與 initial-heroes.json、其測試已於 a33a2a0e（#1206）移除；現以 InitialGeneralShowcase（InitialShowcaseController 呼叫）顯示初始六名將。資料表驗證已不存在，待 PM 裁決是否重建 |
| **OPEN-03** | M10 | 黑場古文、Win95 信件、漫畫分鏡與像素回憶演出 | ui | 5 | 🟢 已接線 | OPEN-01 | 第一幕四個分鏡依序播放，信件需點擊進入下一幕，含祖紋命篆浮現與像素被因子光痕侵入 | OpeningAct1Cues 被 OpeningIntroController 匯入；PROG-2-1254（#1024） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **OPEN-04** | M10 | 漩渦吸入/白閃轉場控制器與特效 | ui | 3 | 🟢 已接線 | OPEN-03 | 像素畫面→命盤裂口漩渦→轉蛋盤飛出，轉場節奏明顯，手機可流暢播放 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **OPEN-05** | M6 | 宿命轉蛋：無限重置十連抽、初始名將鎖定與確認 | logic | 3 | ✅ 已驗收 | OPEN-02 | 可無限免費重置十連抽，重置後回初始狀態，確認後鎖定一位初始名將 | [v6 核對 2026-10-14] 宿命轉蛋純狀態機（4e41f8b5）：無限重置十連與初始名將鎖定；DestinyGacha 2 處呼叫端 |  |
| **OPEN-06** | M10 | 六位初始名將展示卡與登場台詞 | ui | 3 | 🟢 已接線 | OPEN-05 | 每位名將以立繪/骨架動畫登場並播放專屬台詞，名將與紅顏不同畫面 | InitialShowcaseController 被 LobbyScene 匯入；PROG-2-1365（#1193）、PROG-2-1210（#1092） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **OPEN-07** | M5 | 首戰教學戰（5路x8格）與教學提示浮窗 | logic | 4 | 🟢 已接線 | OPEN-05 | 新手可完成部署/推進/對推教學戰並看到勝敗結算 | [v5 核對 2026-10-14] 首戰教學提示 Presenter 接戰場浮窗（1cca03cb，PROG-2-0241）與提示順序（6092baa7）；FirstBattleTutorial 有呼叫端，BattleTutorialHint 無專屬測試 |  |
| **OPEN-08** | M2 | 因子解鎖特效與因子面板/六角圖（AttributePanel） | ui | 3 | 🟢 已接線 | OPEN-07 | 戰鬥觸發因子時顯示字卡與祖紋命篆亮起；因子面板顯示主因子、次級因子與解鎖狀態 | [v11 核對 2026-10-20] 六角圖 cc 接線與解鎖特效（7d0be8bd，PROG-2-0721）；FactorHexGraphic 由 LobbyScene 掛載，FactorHexPanel 測試存在；實機畫面未核對 |  |
| **OPEN-09** | M2 | 祖先矩陣與血統樹 UI（14人祖譜、子嗣預測、解鎖順序） | ui | 4 | 🟢 已接線 | OPEN-02 | 依主因子→次因子→祖先矩陣→子嗣預測順序解鎖，顯示父母系譜與因子流向 | assets/scripts/ui/panels/BloodlineTreePanel.ts(101行，僅3代)、core/services/BloodlineGraph.ts、core/systems/BloodlineGenerator.ts；14人矩陣與子嗣預測面板無；無測試 |  |
| **OPEN-10** | M6 | 紅顏池與支援角色展示（貂蟬/甄姬/小喬） | ui | 3 | 🟢 已接線 | OPEN-05 | 紅顏池與名將池分離，粉紫金風格，三位核心紅顏卡面與功能定位文字完整 | [v8 核對 2026-10-15] 紅顏展示接到轉蛋 Support 分頁（36c19dbb）；RedFaceShowcaseController 2 處呼叫端；展示畫面實機未核對 |  |
| **OPEN-11** | M6 | CountdownManager 趕路倒數（離線累積、常駐圖示、加速/完成） | logic | 3 | 🟢 已接線 | OPEN-10 | 倒數離線時間累積正確，完成後切換已到達狀態，主畫面常駐圖示 | [v7 核對 2026-10-14] CountdownIconView 接 LobbyScene 常駐圖示（7d4e59ce，PROG-2-0469）；CountdownManager 測試；趕路狀態切換未實機核對 |  |
| **OPEN-12** | M8 | 商業化彈窗與付費入口（0.99 破冰、29.99 全明星包、二次情感付費） | ui | 3 | ⚪ 未開始 | OPEN-10, OPEN-11 | 拒絕29.99後出現0.99彈窗，入口讀取同一配置表，不遮蔽核心教學 | [v16.4 封鎖 blocked 2026-10-27] 商業化（0.99 彈窗、29.99 全明星包、二次付費）待使用者裁決 ；無 |  |
| **OPEN-13** | M9 | 英靈夢回開場教學戰（傳說英靈→初始虎符/英靈記憶） | logic | 4 | 🟢 已接線 | OPEN-07 | 教學戰後英靈轉為初始虎符/記憶，不成為永久主角 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
