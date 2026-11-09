# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.2 經濟裝備任務（1/3）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.2 經濟裝備任務（1/3）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.2 2. 經濟、裝備與任務 (Economy, Gear & Quests) · 第 1/3 段

> 涵蓋資源經濟循環、商城定價、裝備鍛造與詞條、軍事任務發布、個人背包、倉庫容量與虎符戰令。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **ECO-01** | M8 | 基礎資源模型（糧草/黃金/城市兵源/名聲）與初始上限 10000/5000/3000/2000 | logic | 2 | 🟢 已接線 | - | PlayerEconomy 產出/消耗/上限夾制單元測試通過 | 規格見 doc_spec_0404；ResourceCap.ts、BASE_RESOURCE_CAPS | [v18.21 核對 2026-11-07] 規格 doc_spec_0404 定案 |
| **ECO-02** | M8 | 城市兵源語意：Cur/Cap/每回合補兵、出征軍勢撥出與戰損回扣 | logic | 3 | 🟢 已接線 | ECO-01 | 撥兵後 City_Troops_Current 遞減，戰後 Returned_Troops 回扣並受 Cap 限制 | [v3 核對 2026-10-13] MilitaryReserve.ts 城市兵源 cur/cap 與出征撥出/回扣；存檔欄位 military（PROG-2-0072） |  |
| **ECO-03** | M8 | 稀缺貨幣精元/結義點數與錢包 | logic | 2 | 🟡 純邏輯 | ECO-01 | 精元/結義點數增減、不足拒絕、持久化測試通過 | 規格見 doc_spec_0626；RareCurrencyWallet 精元與結義點數雙軌錢包、原子交易扣減防負數穿透 | [v18.27 核對 2026-11-08] 規格 doc_spec_0626 定案 |
| **ECO-04** | M8 | 道具定價表與購買流程（補元散10…延壽丹100精元） | data | 2 | 🟢 已接線 | ECO-03 | 定價表載入並以精元扣款購買、庫存增加 | 規格見 doc_spec_0407；ItemShopPricing.ts 定價全表（補元散 10／高級補元散 25／求籤令 15／入學令 20／轉職令 50／延壽丹 100 精元）與 canAffordOffer；tests/ItemShopPricing.test.ts、ItemShopCatalog.test.ts | [v18.22 核對 2026-11-07] 規格 doc_spec_0407 定案；道具精元定價全表與購買流程已入庫（PROG-2-1917，#1833） |
| **ECO-05** | M8 | 地窖保護（food 1500/gold 600，戰敗後觸發）與保底層不可掠奪 | logic | 2 | 🟢 已接線 | ECO-01 | 戰敗後資源不低於地板，被保護量不可被掠奪 | 規格見 doc_spec_0405；CellarProtection.ts、protectedAfterLoss | [v18.21 核對 2026-11-07] 規格 doc_spec_0405 定案 |
| **ECO-06** | M8 | 每日補貼（糧<1200補400、金<500補150、兵<600補200） | logic | 1.5 | 🟢 已接線 | ECO-01, ECO-02 | 同日只領一次，低於門檻才補，依 Last_Claim_Day 判定 | 規格見 doc_spec_0406；DailySubsidy.ts、dailySubsidyOf | [v18.21 核對 2026-11-07] 規格 doc_spec_0406 定案 |
| **ECO-07** | M8 | 許願池核心：每日3輪×3項、同時5個、償還8~24h、產量比率表 | logic | 4 | 🟢 已接線 | ECO-04 | 各輪開放時間、上限、到期入帳數量依 WISH_YIELD_TABLE 單元測試通過 | 規格見 doc_spec_0408；WishPool 由 GameSession、PlayerSaveService、WishAltarController 呼叫；許願池核心已接線 | [v18.22 核對 2026-11-07] 規格 doc_spec_0408 定案 |
| **ECO-08** | M8 | 加速卡（-2h/張、5精元、月卡每日1張） | logic | 1.5 | 🟢 已接線 | ECO-07 | 使用加速卡縮短 End_Time 不低於 0 | 規格見 doc_spec_0410；AccelerateCard.ts、accelerateRemaining（每張 -2h、5精元、月卡每日1張） | [v18.23 核對 2026-11-07] 規格 doc_spec_0410 定案 |
| **ECO-09** | M8 | 月卡（30天每日加成與贈卡） | logic | 2 | 🟢 已接線 | ECO-03, ECO-08 | Active/Days_Left 遞減，每日發放精力與加速卡 | 規格見 doc_spec_0409；MonthlyCard 30 天效期與續約（PROG-2-1359，PR #1163）由 GameSession、PlayerSaveService、ItemDef 引用 | [v18.22 核對 2026-11-07] 規格 doc_spec_0409 定案 |
| **ECO-10** | M8 | 百寶閣商城與許願池 UI/文案字串 | ui | 4 | 🟢 已接線 | ECO-04, ECO-07 | 商城/許願池畫面可購買、許願、加速並顯示 UI_WISH_* 字串 | 規格見 doc_spec_0420；WishAltarController.ts 許願祭壇五槽位三態與多語提示 | [v18.26 核對 2026-11-07] 規格 doc_spec_0420 定案；WishAltarController 接 LobbyScene |
| **ECO-11** | M8 | 資源上限與資源不足提示 UI_RES_LOW | ui | 1 | 🟢 已接線 | ECO-01 | 超出上限被夾制，不足時顯示警示字串 | [v16.6 更正 2026-10-28] ResourceCap 夾制與不足提示由 GameSession、MilitaryReserve、DailySubsidy 呼叫（PR #786）；有 ResourceCap.test.ts |  |
| **ECO-12** | M9 | 賽事經濟子回圈（免費報名、額外報名、Boss 券） | logic | 2 | 🟢 已接線 | ECO-01 | 每日重置免費次數，額外報名扣精元 | 規格見 doc_spec_0411；TournamentLocal.ts 名將挑戰賽 BOSS 挑戰券經濟；tests/TournamentBossTicket.test.ts | [v18.23 核對 2026-11-07] 規格 doc_spec_0411 定案；BOSS 挑戰券經濟已入庫（PROG-2-1918，#1834） |
| **ECO-13** | M8 | 通行證（季度任務與獎勵追蹤） | logic | 4 | 🟡 純邏輯 | ECO-03 | 賽季任務進度與獎勵領取測試通過 | 規格見 doc_spec_0627；SeasonPass 季度軍功任務追蹤器、50 級白銀/黃金雙軌獎勵與季末防遺憾補發 | [v18.27 核對 2026-11-08] 規格 doc_spec_0627 定案；歷史空白裁決完結 |
| **ECO-14** | M9 | 監獄容量依主城等級上限（MCQ Q49 選項B） | logic | 2 | 🟢 已接線 | ECO-01 | 關押數超過主城等級上限被拒 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **ECO-15** | M11 | Player_Economy 存檔與伺服器經濟/庫存表 | server | 3 | ⚪ 未開始 | ECO-01, ECO-03 | 經濟狀態可存讀並與 server 表欄位對齊 | server/src 僅 index.ts，無經濟表；SaveSerializer.ts 無經濟欄位 | [v17.2 更正 2026-11-07] 依賴伺服器／外部：Server 經濟表尚無（server/src 只有 index.ts） |
| **ITM-01** | M8 | ItemDef 資料表（ID/品質/堆疊/效果/過期）與道具清單 | data | 2 | 🟢 已接線 | - | 載入 7 付費+6 免費道具定義並通過 schema 驗證 | 規格見 doc_spec_0412；ItemDef.ts 由 PlayerInventory、WishPool、ExtremeTaskDrop 引用；五大分類與 24 款道具常數清單 | [v18.23 核對 2026-11-07] 規格 doc_spec_0412 定案 |
| **ITM-02** | M8 | 道具分類（消耗/材料/特殊/貨幣/寶物） | logic | 1 | 🟢 已接線 | ITM-01 | Category 枚舉與篩選單元測試通過 | 規格見 doc_spec_0413；ItemCategory 五大枚舉與 buildItemBagRows 篩選（ItemDef.ts、ItemBagView.ts） | [v18.24 核對 2026-11-07] 規格 doc_spec_0413 定案 |
| **ITM-03** | M8 | PlayerInventory 增刪與消耗 API（扣前檢查數量） | logic | 3 | ✅ 已驗收 | ITM-01 | 不足時拒絕、足夠時扣除，單元測試通過 | [v16.6 更正 2026-10-28] v16.3 QA 已確認 done（PlayerInventory 增刪與消耗，19 個 src 檔引用） |  |
| **ITM-04** | M8 | 道具效果引擎（回精力50%、受孕率×1.5、保證受孕、占卜、入學、刷新） | logic | 4 | 🟡 純邏輯 | ITM-03 | 各 Effect_Type 回呼對應子系統並有測試 | 規格見 doc_spec_0414；ItemEffectDispatcher 六大核心枚舉與派發器；FertilityBoost、ItemRefreshEffect、VitalityPill | [v18.24 核對 2026-11-07] 規格 doc_spec_0414 定案 |
| **ITM-05** | M8 | 取得管道與來源追蹤（SHOP/TASK/DROP/EVENT） | logic | 2 | 🟢 已接線 | ITM-03 | 每次入庫記錄 source，可查詢 | 無 | 未開始→已接線；#1282 ItemAcquisitionLog 接 GameSession／PlayerSaveService |
| **ITM-06** | M8 | 掛機產出（每日免費入學令 floor(設施等級/5)+1、黃金） | logic | 2 | 🟢 已接線 | ITM-03 | 公式輸出符合 1~2 張 | 規格見 doc_spec_0416；DailyFreeEnroll.ts 公式 floor(等級/5)+1 與高水位登入防刷 | [v18.25 核對 2026-11-07] 規格 doc_spec_0416 定案 |
| **ITM-07** | M8 | 極限任務掉落表（金70/高粱15/筆記10/補元散5） | data | 1.5 | 🟢 已接線 | ITM-05 | 掉落機率分佈抽樣測試符合表，由大廳天下征鋒看板每週3次觸發結算 | 規格見 doc_spec_0415；ExtremeTaskDrop.ts 掉落機率抽樣（金70/高粱15/筆記10/補元散5）；接取入口為大廳天下征鋒 | [v18.51 裁決接線 2026-11-08] 純邏輯→已接線；入口與每週3次規則定案；規格 doc_spec_0415 定案 |
| **ITM-08** | M8 | 過期道具自動回收 | logic | 1.5 | 🟢 已接線 | ITM-03 | Expire_At 到期後移除並通知 UI_ITEM_EXPIRE | 規格見 doc_spec_0417；ItemExpiry.ts、sweepExpiredItems（nowMs >= expireAt 即回收） | [v18.25 核對 2026-11-07] 規格 doc_spec_0417 定案 |
| **ITM-09** | M8 | 禮包組合系統 | logic | 2 | 🟡 純邏輯 | ITM-03 | 禮包一次發放多道具 | 規格見 doc_spec_0418；GiftBundle.ts 禮包組合邏輯（validateGiftBundle、purchaseGiftBundle、PROG-2-1921） | [v18.25 核對 2026-11-07] 規格 doc_spec_0418 定案 |
| **ITM-10** | M8 | 道具背包 UI 與使用確認/不足提示 | ui | 3 | 🟢 已接線 | ITM-03 | 顯示持有清單、篩選、數量不足導向商城 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **ITM-11** | M8 | 道具商城購買（玉璧 CURR_GEM） | logic | 2 | 🟡 純邏輯 | ITM-03 | 以玉璧購買並扣款 | 規格見 doc_spec_0628；GemShopCatalog 百寶閣玉璧定價商品清單與兩階段原子購買協議 | [v18.27 核對 2026-11-08] 規格 doc_spec_0628 定案 |
| **ITM-12** | M8 | 美酒/推薦美酒社交裂變與傭兵結義消耗 | logic | 2 | 🟡 純邏輯 | ITM-03 | 推薦送5瓶且傭兵結義消耗美酒 | 規格見 doc_spec_0419；MercenaryBondPermanent.ts 結義轉正消耗階梯、PrisonerGift.ts 送禮好感轉換 | [v18.26 核對 2026-11-07] 規格 doc_spec_0419 定案 |
