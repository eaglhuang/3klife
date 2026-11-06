# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.5 血統家族培育（7/9）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.5 血統家族培育（7/9）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture) · 第 7/9 段

> 續上段（表頭重複）。工作包 KIN-02 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **KIN-02** | M2 | 史實相性資料表 HISTORICAL_PAIR/ENEMY_PAIR（以 Template_ID）收錄首批名單 | data | 3 | ✅ 已驗收 | KIN-01 | 至少收錄 MVP 範圍的夫妻/義兄弟/宿敵配對並通過 Template_ID 驗證 | [v7 核對 2026-10-14] HistoricalPairs 史實相性配對表（0d17062b）與測試，2 處呼叫端 |  |
| **KIN-03** | M2 | 相性標籤引擎（14 人祖先標籤共鳴/純血判定） | logic | 3 | 🟢 已接線 | KIN-01 | countSharedTags≥3 判共鳴，≥5 觸發家風，14 人全同族純血+30，測試通過 | [v7 核對 2026-10-14] 相性標籤引擎（58403015）接爆發力（4596e08f，KIN-03 接線）；純血判定與 14 人祖先共鳴細節未逐項核對 |  |
| **KIN-04** | M2 | 爆發力關係加成接線（契合+25、宿敵受孕×0.7） | logic | 2 | 🟢 已接線 | KIN-02, KIN-03 | BreedingService 以資料表解析史實配對與宿敵並影響 EP/受孕率 | [v7 核對 2026-10-14] 契合 +25、宿敵受孕 ×0.7 接線（0d17062b、4596e08f）；未逐項驗算 |  |
| **KIN-05** | M2 | 宿敵配種『狼性』白色因子引入 | logic | 1 | ⚪ 未開始 | KIN-04 | 宿敵配對有機率給予子嗣狼性白色因子 | 無 |  |
| **KIN-06** | M9 | 動態關係建立（戰場共鬥→戰友、結義傭兵→義兄弟、結緣→夫妻、親子） | logic | 3 | 🟢 已接線 | KIN-01 | 對應事件發生時建立 DynamicRelation 並寫入存檔 | [v7 核對 2026-10-14] 動態關係建立與存檔快照（7bf4c941）、存讀與互動觸發（ccb7ca10）；KinDynamicRelations 2 處呼叫端；戰場共鬥、結義、親子等建立點未全數核對 |  |
| **KIN-07** | M9 | 關係圖鑑 UI（節點+連線） | ui | 4 | ⚪ 未開始 | KIN-02 | 武將詳情可開啟關係網路圖並顯示類型標籤 | 無 |  |
| **KIN-08** | M9 | 關係事件觸發（戰場/治理專屬事件） | content | 3 | 🟢 已接線 | KIN-06 | 指定關係組合在對應場景觸發一次事件並顯示劇本 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **KIN-09** | M7 | 合攻聯動（義兄弟/夫妻相鄰格合攻+30%） | logic | 3 | 🟢 已接線 | KIN-06 | 相鄰格有義兄弟時合攻觸發率+30% 並有戰場演出 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **KIN-10** | M9 | 關係衰退與維護（Intimacy 衰減） | logic | 2 | 🟢 已接線 | KIN-06 | 每季依 Decay_Rate 減親密度，互動可回補 | [v7 核對 2026-10-14] 親密度衰退與互動回補（22026f7b）、換季衰退（52d7efa1）、歸零保留（aa272829）；KinSeasonWiring 測試 |  |
| **KIN-11** | M9 | 家風傳承 Buff 與關係圖鑑完成稱號（內容待設計） | content | 2 | ⚪ 未開始 | KIN-03 | 同族三代 5+ 標籤觸發家風被動，內容定義後實作 | 無 |  |
| **KIN-12** | M10 | 相性劇本與字串（契合/共鳴/宿敵/家風） | content | 1 | 🟡 純邏輯 | - | 字串 Key 進 i18n | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **SAME-01** | M2 | Template_ID 多版本資料模型（同 Bloodline_ID 不同 Template_ID、Initial_Genes、Is_Limited） | data | 2 | 🟢 已接線 | - | 版本表 schema 與資料載入完成，趙雲至少 2 版本可載入 | [v9 核對 2026-10-15] GeneralVersion 呼叫端與測試（checkFormationBloodlines，PROG-2-0422）；同名武將版本圖鑑 GeneralVersionGallery（89f56c2d，PROG-2-0707）尚無呼叫端。協調者回報為 P0，WBS 規格為 P1，請 PM 確認 |  |
| **SAME-02** | M5 | 名號限定制：編隊同 Bloodline_ID 拒絕 | logic | 2 | 🟢 已接線 | SAME-01 | 編入同 Bloodline_ID 武將被拒並顯示 UI_SAME_NAME_REJECT，測試通過 | [v4 核對 2026-10-13] 戰場整隊同血統檢查（commit「戰場整隊同血統檢查，出征帳本拒絕同血統整隊」）；SortieDeploy.validateSortieLoadout SAME_BLOODLINE；整隊層級專屬測試未逐一核對 |  |
| **SAME-03** | M8 | 重複抽卡分流 UI（復生重練/血脈灌注選擇彈窗） | ui | 3 | ⚪ 未開始 | SAME-04, SAME-05 | 重複卡彈窗顯示兩選項並呼叫對應邏輯 | 無；LobbyScene 只顯示『N 位已持有』（/tmp/integ/assets/scripts/ui/scenes/LobbyScene.ts） |  |
| **SAME-04** | M9 | 復生重練邏輯（新同名本體、嵌回英靈卡、Rebirth_Count+1） | logic | 3 | ⚪ 未開始 | SAME-01, LIFE-06 | 選擇復生後建立新本體並嵌入既有英靈卡 | 無 |  |
| **SAME-05** | M9 | 血脈灌注邏輯（Bloodline_Level+1、Spirit_Power、Linked_Tally_Level） | logic | 3 | 🟢 已接線 | SAME-01, LIFE-06 | 灌注後既有英靈卡/虎符等級上升，數值依釐清後規則 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **SAME-06** | M6 | 重複卡偵測與 addGenerals duplicates 回報 | logic | 1 | ✅ 已驗收 | - | 重複抽到已持有武將不重複加入並回報 duplicates | GameSession.addGenerals（/tmp/integ/assets/scripts/core/managers/GameSession.ts）；tests/GameSession.test.ts『大廳：重複抽到已持有武將不重複加入，只回報 duplicates』『全部重複時不存檔、不廣播』 |  |
| **SAME-07** | M10 | 版本圖鑑與版本差異展示 UI | ui | 3 | 🟢 已接線 | SAME-01 | 顯示 UI_COLLECTION 收集進度與同名版本因子/戰法/立繪對比 | [v16.6 核對 2026-10-28] master #1199 後已接上（已接線）；待 QA／實機驗收 |  |
| **SAME-08** | M9 | 戰魂寄宿（死後 TP×0.2 轉同 Bloodline_ID 他版本） | logic | 2 | 🟡 純邏輯 | SAME-01 | 死亡武將 Soul_Fragment 可注入同血源版本，TP 增加量=0.2×Total_TP | [v11 核對 2026-10-20] 戰魂寄宿純邏輯（076fb54e，PROG-2-0857）與測試；SoulTransfer 無 src 呼叫端 |  |
| **SAME-09** | M9 | 血脈歸宗（歸宗令、轉移 1 個特殊因子） | logic | 2 | ✅ 已驗收 | SAME-01 | 消耗歸宗令使 V1 獲得 V2 的 1 因子，V2 保留並標記已歸宗 | [v12 核對 2026-10-20] 血脈歸宗成功扣 1 張歸宗令（0570d7e7，PROG-2-0862，#562）；BloodlineMerge 由 GameSession 呼叫，測試 2 個 |  |
| **SAME-10** | M10 | 同名劇本與字串（初見/寄宿/歸宗/衝突） | content | 1 | 🟡 純邏輯 | - | 字串 Key 進 i18n | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **ORAC-01** | M9 | 名士資料表（Sage_ID/Bias_Type/Accuracy_Base/Unlock_Condition）六位名士 | data | 1 | ⚪ 未開始 | - | 六位名士資料載入並通過 schema 驗證 | 無 |  |
| **ORAC-02** | M9 | 預言生成引擎（accuracy 判定、WeightedSample 偏見、Distort、Comment 模板） | logic | 3 | 🟢 已接線 | ORAC-01 | 以固定種子覆寫 Random() 驗證三個規格示例（0.10/0.90/0.50）結果 | [v16.7 全面核對 2026-10-28] SageDivination（WeightedSample 等）由 GameSession、SageRemarks、BondingSetupController 呼叫；預言生成引擎已接線 |  |
| **ORAC-03** | M9 | 預言輸入：父母因子→子嗣預期因子分布（與結緣預覽共用） | logic | 2 | 🟢 已接線 | ORAC-01 | 可由父母因子與 14 人祖譜得出子嗣預期色系/屬性分布供 WeightedSample 使用 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **ORAC-04** | M8 | 求籤令消耗與占卜次數累計 | logic | 1 | 🟢 已接線 | ORAC-02 | 占卜扣 1 求籤令，不足時拒絕，累計次數存檔 | [v16.4 核對 2026-10-27] GameSession.divineFactor 扣求籤令並累計占卜次數（_spendOracleToken），由 SageOracleController 呼叫；有 SageDivination.test.ts / SageOracle.test.ts ；無 |  |
| **ORAC-05** | M9 | 占卜介面（放入父母→選擇名士→結果、嵌入結緣主介面） | ui | 4 | 🟢 已接線 | ORAC-02, ORAC-03 | 結緣畫面中央血統模擬器+左右批語區+底部求籤令入口可操作 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
