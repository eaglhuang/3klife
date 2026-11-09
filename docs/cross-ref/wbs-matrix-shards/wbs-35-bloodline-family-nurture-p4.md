# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.5 血統家族培育（4/9）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.5 血統家族培育（4/9）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture) · 第 4/9 段

> 續上段（表頭重複）。工作包 LUK-06 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **LUK-06** | M2 | LUK 特殊門檻（≥80 戰法強制複製、≥95 血統變異、=100 天命傳承） | logic | 3 | ✅ 已驗收 | LUK-05 | 各門檻只在達標時觸發且可測 | [v13 核對 2026-10-20] 運氣門檻三效果全數接線：≥80 戰法強制複製（38a79664，LuckTacticCopy）、≥95 血統變異（dc1b9bf9，LuckBloodlineMutation）、=100 天命傳承（fa4c021b，LuckFateInheritance），皆由 BreedingSystem 呼叫，三者測試存在；門檻旗標接入結緣（5a793176） |  |
| **LUK-07** | M8 | 天命重置卷與高 LUK 種母商業鉤 | logic | 3 | 🟡 純邏輯 | LUK-02 | 道具可重 roll 天命波動並消耗 | 規格見 doc_spec_0644；FateResetResult 天命重置卷重擲子嗣天命波動、保底>=0與高運氣種母偏置 | [v18.33 核對 2026-11-08] 規格 doc_spec_0644 定案；天命重擲與種母商業平衡確立 |
| **LUK-08** | M10 | LUK UI（UI_LUK_* 字串、天命波動顯示與劇本文案） | ui | 2 | 🟢 已接線 | LUK-04 | UI 顯示 LUK 與波動並套用字串 | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（已接線）；待 QA／實機驗收 |  |
| **FEM-01** | M2 | 女性品質分級與來源標記（Source_Type/Quality_Grade/Base_Conception_Mod） | data | 2 | ✅ 已驗收 | - | 每位女性武將帶來源與品質欄位並可存檔 | FemaleProfile；FemaleSource 2 處呼叫端，tests 通過；規格書 doc_spec_0560（女性武將品質分級來源標記與受孕率修正模型規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0560 落地，SSR/SR/R/N品質分級與五大來源標記確立 |
| **FEM-02** | M2 | 受孕率來源修正（SSR×1.2、民女×0.8、>40 歲×0.7、安胎藥×1.5） | logic | 2 | ✅ 已驗收 | FEM-01 | 與結緣受孕率合併後輸出且 ≤0.95 | BreedingService.ts computeConceptionRate；規格書 doc_spec_0560（女性武將品質分級來源標記與受孕率修正模型規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0560 落地，來源係數、年齡階梯衰退、安胎藥1.5倍與0.95硬上限確立 |
| **FEM-03** | M6 | 轉蛋女將池（SSR/SR/R，5 轉保底） | logic | 3 | 🟢 已接線 | - | 女將池抽卡含保底並寫入名冊與來源 | 規格見 doc_spec_0645；FemaleGachaConfig 紅顏天香獨立卡池、5轉小保底與50轉UP大保底、名冊來源標記 | [v18.33 核對 2026-11-08] 規格 doc_spec_0645 定案；女將卡池配置與保底規則確立 |
| **FEM-04** | M6 | 傭兵池女武將刷新（8 小時、宴客令/徵人令）與 6 日結義 | logic | 4 | ✅ 已驗收 | FEM-01 | 每 8 小時刷新並可篩選結義 | FemalePoolRefresh.ts；GameSession.ts；規格書 doc_spec_0565（酒館傭兵刷新週期與地下城救美三階產出模型規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0565 落地，8小時自然輪替週期、宴客令/徵人令即時刷新與6日結義累積確立 |
| **FEM-05** | M5 | 戰場俘虜女性處理（勸降/招募/釋放/無期徒刑） | logic | 4 | 🟢 已接線 | FEM-01 | 破城後女俘虜可走四種處置並帶來源 | [v5 核對 2026-10-14] 戰場俘虜女將帶 CAPTIVE 來源（f8081d43，31b02f3e，PROG-2-0243/0245）；PrisonerOfWar.ts 接進名冊；勸降/無期徒刑的女性專屬分支未核對 |  |
| **FEM-06** | M3 | 子嗣女兒 14 歲及笄分流（前線武將/後宮女官/教官儲備） | logic | 3 | ✅ 已驗收 | FEM-01 | 14 歲觸發選擇並更新職能 | DaughterComingOfAge.ts；tests 通過；規格書 doc_spec_0561（子嗣及笄十四歲職能分流狀態機與女官教官儲備規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0561 落地，14歲及笄禮前線/內政/教官三通道分流與存檔防呆確立 |
| **FEM-07** | M6 | 地下城救美任務（8h 刷新、民女60%/千金30%/貴族10%） | logic | 4 | ✅ 已驗收 | FEM-01 | 依機率產出三種結果並 8h 刷新 | DungeonRescue.ts；tests 通過；規格書 doc_spec_0565（酒館傭兵刷新週期與地下城救美三階產出模型規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0565 落地，8小時地宮副本冷卻、60%/30%/10%三階產出與BOSS保底確立 |
| **FEM-08** | M6 | 送禮好感度（戰俘/傭兵，0~100 提升轉化機率） | logic | 3 | 🟢 已接線 | FEM-04, FEM-05 | 送禮增加好感，達門檻提高轉化率 | 規格見 doc_spec_0646；GiftItemDef 四類禮品偏好倍率、四階好感階梯與戰俘/傭兵轉化率演算法 | [v18.33 核對 2026-11-08] 規格 doc_spec_0646 定案；送禮好感階梯與轉化率裁決完結 |
| **FEM-09** | M2 | 血統模擬器預覽（雙方 14 人樹與預計爆發力） | ui | 3 | ✅ 已驗收 | FEM-01 | 放入男女雙方即時預覽 EP 與祖譜 | [v10 核對 2026-10-20] 結緣 EP 明細接線 BreedingPreviewPresenter（91ef88bd，PROG-2-0713），BondingSetupController 呼叫，測試存在 |  |
| **FEM-10** | M11 | 女性來源字串、劇本與 Server source_log 表 | server | 3 | 🟡 純邏輯 | FEM-01 | UI_SRC_* 字串與 source_log 紀錄可查 | [v13 核對 2026-10-20] 女性來源 source_log 表定義與列驗證（9d0cfee7，PROG-2-0542，#630）；server/schema 僅定義，無執行期呼叫端 |  |
| **MENT-01** | M3 | 教官卡資料結構與 JSON schema（Teaching_Style/Stat_Bonus/Tactic_Inspire_Events/Passive_Effects/Friendship_Bonus/Slot_Burst_Rate/Role_Boundary） | data | 2 | ✅ 已驗收 | - | 新增 mentor-cards.json 與 TS 型別，SUP_ZHAO_SSR_01 範例可載入並通過 schema 驗證 | MentorSupportSchema.ts；規格書 doc_spec_0562（教官支援卡五來源獲取管線與星等突破溢出轉化規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0562 落地，MentorCardRecord資料結構、天時地利人和風格與TP加成確立 |
| **MENT-02** | M3 | 五來源獲取管線（支援卡池/5 歲分流/退役轉化/戰場俘虜/傭兵結義）與 Source 標記 | logic | 3 | ✅ 已驗收 | MENT-01, LIFE-07 | 五種來源各能產出一張帶 Source 欄位的教官卡並寫入玩家持有清單，單元測試覆蓋 | MentorSources.ts；tests 通過；規格書 doc_spec_0562（教官支援卡五來源獲取管線與星等突破溢出轉化規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0562 落地，五大獲取來源管線定義與登錄防呆確立 |
| **MENT-03** | M3 | 36 回合教學互動核心：TP 累積（10×(1+Support_TP_Bonus)）與結業戰法點選清單 | logic | 3 | 🟢 已接線 | MENT-01 | 給定教官組與回合數，TP 累計值與公式一致；未觸發靈感的戰法不出現在結業清單 | [master fb02ff9 重估] NurtureSystem.ts BASE_TP_PER_TRAINING、MENTOR_BURST_MULTIPLIER |  |
| **MENT-04** | M3 | 戰法靈感事件觸發引擎（Base_Rate×友情×LUK、Trigger_Window、Min_Star 閘、家傳 Bloodline_Required） | logic | 3 | ✅ 已驗收 | MENT-03 | 固定種子下 SSR 趙雲六組事件觸發結果可重現；Min_Star 不足與非趙姓血統均不觸發；單元測試通過 | MentorInspiration.ts；tests 通過；規格書 doc_spec_0563（教官戰法靈感觸發引擎與世家血脈保底連動規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0563 落地，R6-R30視窗、BaseRate×友情×LUK公式與家傳血脈閘門確立 |
| **MENT-05** | M3 | 靈感保底：世家血脈連動（Q32 裁決），需先釐清 60 回合 vs 36 回合 | logic | 1 | ✅ 已驗收 | MENT-04 | 姓氏匹配支援卡家族時在規定回合前保證觸發並套用 PT 折扣，數值依釐清後規則 | BloodlineGuarantee.ts；tests 通過；規格書 doc_spec_0563（教官戰法靈感觸發引擎與世家血脈保底連動規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0563 落地，世家血脈匹配第25回合強制100%保底觸發與PT減免20%確立 |
| **MENT-06** | M3 | 突破（Limit Break）★0~★5 星等表與解鎖效果、重複卡自動突破 | logic | 2 | ✅ 已驗收 | MENT-01 | 重複同名教官卡 Current_Star+1 至上限 5，F-4 表各星等友情/訓練倍率與事件組解鎖正確 | MentorBreakthrough.ts；tests/MentorBreakthrough.test.ts 通過；規格書 doc_spec_0562（教官支援卡五來源獲取管線與星等突破溢出轉化規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0562 落地，★0至★5極限突破階梯數值與自動突破判定確立 |
| **MENT-07** | M8 | 溢出轉化（★5 後重複卡→積分 SSR500/SR100/R20）與點數商店入口 | logic | 2 | ✅ 已驗收 | MENT-06 | 滿突破重複卡不再升星並入帳對應積分，Toast 文案正確 | MentorOverflow.ts；GameSession.ts；規格書 doc_spec_0562（教官支援卡五來源獲取管線與星等突破溢出轉化規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0562 落地，滿星重複卡轉化SSR 500/SR 100/R 20名師積分確立 |
| **MENT-08** | M3 | 訓練格爆發（Slot_Burst_Rate、稀有度範圍、點數×1.5、友情+10%、靈感+5%） | logic | 2 | ✅ 已驗收 | MENT-03 | 依稀有度與星等的爆發率區間骰出爆發，爆發回合訓練點數×1.5，測試以固定種子驗證 | SlotBurstEngine.ts；tests 通過；規格書 doc_spec_0564（教官訓練格爆發機制與六槽鏡像鎖定狀態機規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0564 落地，SlotBurstRate公式(5%-20%)、點數×1.5、友情+10%與靈感+5%確立 |
| **MENT-09** | M3 | 教官鏡像快照與培育鎖定（固定 6 槽、入學快照、Is_Locked_In_Training） | logic | 2 | ✅ 已驗收 | MENT-01 | 進入培育時凍結教官屬性，外部升星不影響進行中培育；同一教官不能同時在兩場培育 | NurtureSystem.ts 6 槽鎖定；規格書 doc_spec_0564（教官訓練格爆發機制與六槽鏡像鎖定狀態機規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0564 落地，入學快照凍結、isLockedInTraining併發排他與結業原子解鎖確立 |
| **MENT-10** | M3 | 培育主畫面教官席位 UI（6 槽、教官頭像亮彩、靈感提示、TP 購買） | ui | 3 | 🟢 已接線 | MENT-03, MENT-08 | 培育畫面顯示 N/6 教官席位並可看見靈感/爆發提示，UCUF 驗證通過 | [master fb02ff9 重估] NurtureFlowViewApplier 教官席位（PROG-2-0034） |  |
