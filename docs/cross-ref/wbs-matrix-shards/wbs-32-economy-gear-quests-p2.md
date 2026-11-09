# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.2 經濟裝備任務（2/3）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.2 經濟裝備任務（2/3）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.2 2. 經濟、裝備與任務 (Economy, Gear & Quests) · 第 2/3 段

> 續上段（表頭重複）。工作包 EQP-01 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **EQP-01** | M8 | Inventory Service 統一資料層（Item_Type/Display_Bucket/Slot_Type） | data | 3 | 🟢 已接線 | - | 單一服務可表達道具/裝備/虎符/英靈卡四類投影 | 規格見 doc_spec_0421；InventoryProjection.ts、BagDomain.ts 統一物件庫與投影視圖推導 | [v18.26 核對 2026-11-07] 規格 doc_spec_0421 定案；InventoryProjection／BagDomain／InventoryRecordBridge 由 GameSession、PlayerSaveService 引用 |
| **EQP-02** | M8 | 物件分類與來源追蹤欄位（含死亡結算、退役回收、俘虜） | logic | 2 | 🟡 純邏輯 | EQP-01 | 所有入庫記錄 source，退役與俘虜共用欄位 | 規格見 doc_spec_0422；BagDomain.ts、InventoryProjection.ts 物件分類、來源追蹤與容量計算 | [v18.27 核對 2026-11-07] 規格 doc_spec_0422 定案 |
| **EQP-03** | M8 | 武將六槽裝備與數值累加 final_stat=base+Σbonus | logic | 3 | 🟢 已接線 | EQP-01 | 裝備後面板與戰場數值含加成，單元測試通過 | 規格見 doc_spec_0423；GeneralBackpack.ts 六槽、GearDefinitions.ts 24件、EquipmentBonus.ts 屬性累加 | [v18.27 核對 2026-11-07] 規格 doc_spec_0423 定案 |
| **EQP-04** | M8 | 虎符唯一性、轉交與拔除降忠誠 | logic | 3 | 🟢 已接線 | EQP-01 | 同虎符只由一人持有，拔除降忠誠 | 規格見 doc_spec_0424；TigerTallyHoldings.ts 一將一符約束、TigerTallyLoyalty.ts 拔除降忠誠與反洗硬限制 | [v18.27 核對 2026-11-07] 規格 doc_spec_0424 定案；TigerTallyHoldings 由 GameSession 呼叫 |
| **EQP-05** | M7 | 虎符升星（1~3戰鬥經驗）與突破（4~5虎符精華） | logic | 3 | 🟢 已接線 | EQP-04 | 星級與材料消耗規則測試通過 | 規格見 doc_spec_0425；TigerTallyStar.ts（1~3★戰鬥經驗）、TigerTallyBreakthrough.ts（4~5★精華突破） | [v18.28 核對 2026-11-07] 規格 doc_spec_0425 定案；由 GameSession 呼叫 |
| **EQP-06** | M9 | 英靈卡命槽單插與替換提示 | logic | 2 | 🟢 已接線 | EQP-01 | 每將僅1張，替換需確認並解除原被動 | 規格見 doc_spec_0426；SpiritSlotFlow.ts 命槽單插與被動解除、戰鬥鎖定防護 | [v18.28 核對 2026-11-07] 規格 doc_spec_0426 定案；SpiritSlotFlow 接 GeneralDetailBloodlineChild |
| **EQP-07** | M4 | 退役裝備回倉庫與傳承給後代 | logic | 2 | 🟢 已接線 | EQP-03 | 退役觸發自動回倉庫，可轉移後代 | 規格見 doc_spec_0427；GearEquipFlow.ts transferGearToHeir 與自動回倉防覆蓋 | [v18.28 核對 2026-11-07] 規格 doc_spec_0427 定案；GearEquipFlow 回倉＋GameSession.retireGeneral 傳承 |
| **EQP-08** | M4 | 取得管道：死亡結算產虎符/英靈卡、封賞招降移交虎符 | logic | 3 | 🟢 已接線 | EQP-04, EQP-06 | 死亡結算同時生成兩張卡 | 規格見 doc_spec_0428；LegacyService.ts、TallyDeathSettlement.ts 引入 produceDeathTally、GeneralArchiver 建英靈卡快照 | [v18.29 核對 2026-11-07] 規格 doc_spec_0428 定案；TRP-07 測試通過 |
| **EQP-09** | M9 | 傳家寶與俘虜無期徒刑產出 | logic | 2 | 🟢 已接線 | EQP-02 | 無期徒刑產出傳家寶並可裝備/販賣 | 規格見 doc_spec_0429；PrisonerOfWar.ts rollPrisonTreasureDonors 5%機率、ITEM_TREASURE 入庫 | [v18.29 核對 2026-11-07] 規格 doc_spec_0429 定案；GameSession 季節結算引用 |
| **EQP-10** | M7 | 參謀官/後勤官 Sortie_Loadout 資料與 HUD 顯示 | logic | 3 | 🟢 已接線 | EQP-01 | 提供計謀點與糧草上限且不暗示額外武將 | 規格見 doc_spec_0430；SortieDeploy.ts 計謀點與軍糧加成、SortieSetupController.ts 純輔助不佔部隊槽 | [v18.29 核對 2026-11-07] 規格 doc_spec_0430 定案；SortieSetupController 接 LobbyScene |
| **EQP-11** | M8 | 商業化：欄位解鎖、自動整理、強化材料消耗 | logic | 2 | 🟡 純邏輯 | EQP-03 | 付費解鎖欄位與整理功能 | 規格見 doc_spec_0629；BagExpansionRules 背包倉庫欄位雙軌擴容、3秒冷卻免費整理、不碎裝強化保底消耗 | [v18.28 核對 2026-11-08] 規格 doc_spec_0629 定案；商業化與免費整理裁決完結 |
| **EQP-12** | M10 | 人物頁 命/寶/兵 三頁裝配分工 | ui | 4 | 🟡 純邏輯 | EQP-03, EQP-04, EQP-06 | 三頁各自負責對應裝配且 overview 不承接 | 規格見 doc_spec_0630；GeneralDetailComposite 命(英靈槽)/寶(6槽裝備+傳家寶)/兵(虎符槽+適性)/將(純唯讀) 職責邊界契約 | [v18.28 核對 2026-11-08] 規格 doc_spec_0630 定案；三頁裝配職責裁決完結 |
| **TSK-01** | M7 | 前置共識：移除 SMART 兵種入口、統一參謀官/後勤官稱謂 | logic | 1 | 🟢 已接線 | - | 程式與 UI 無 SMART 與舊稱 | 未查得相關清理（需檢查 grep SMART） | 未開始→已接線；協調線確認：#1286 完成，結案 |
| **TSK-02** | M10 | 人物頁 tab 收斂 將/屬/命/技/寶/兵 與 route key | ui | 2 | 📄 僅資料 | - | GeneralDetailComposite tab 與 route key 對齊 | assets/scripts/ui/components/GeneralDetailComposite.ts、general-detail/GeneralDetail*Child.ts（Basics/Stats/Bloodline/Skills/Extended/Aptitude），未與 Overview/Stats/Bloodline/Tactics/Equip/Aptitude 完全對齊 |  |
| **TSK-03** | M10 | 命頁 UI spec（14祖譜、五階奧義軌、StoryDock） | ui | 4 | 🟢 已接線 | TSK-02 | 命頁依 2.0 規格完成 layout 並通過 validate-ui-specs | [v16.8 更正 2026-10-28] 命頁 layout 由 GDUI-04/05/06 的 cc 接線推定完成（左右兩欄、StoryDock）；未逐項核對 layout JSON 與 validate-ui-specs |  |
| **TSK-04** | M10 | 寶頁 2x3 六槽 UI + HeirloomCard/ItemSummaryCard | ui | 3 | 🟢 已接線 | TSK-02 | 六槽鍵值 WEAPON/HEAD/BODY/BOOTS/ACCESSORY_A/B 顯示空槽 placeholder | character-ds3-equip-content.json；CharacterDs3EquipChild.ts TODO | 僅資料→已接線；協調線回報：#1313（af9094bf）合併；HeirloomCard 以模組名未查到 src 呼叫端，待核對 |
| **TSK-05** | M10 | 兵頁虎符槽/兵種·地形·天氣適性/戰鬥定位 | ui | 3 | 🟢 已接線 | TSK-02 | TallySlotCard 與五段 layout 完成 | GeneralDetailAptitudeChild.ts 存在但無 TallySlotCard；contracts 無 aptitude schema | 未開始→已接線；#1312 AptitudeView 接 CharacterDs3AptitudeChild |
| **TSK-06** | M10 | 將頁 名聲/官職/統領軍勢 區塊 | ui | 2 | 🟢 已接線 | ECO-02 | 顯示帶兵上限、城市兵源、預估出征軍勢 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **TSK-07** | M10 | general-detail-equip / aptitude content schema 與 Mapper | tool | 3 | 🟢 已接線 | TSK-04, TSK-05 | schema 通過 validate-ui-specs --strict，Mapper 組裝三/五段資料 | contracts 僅 general-detail-content/overview schema；無 EquipMapper/AptitudeMapper | 未開始→已接線；#1334 EquipPageSegments 接 GeneralDetailOverviewMapper |
| **TSK-08** | M10 | GearModules/AptitudeModules fragment 與 BindPathPolicy | ui | 2 | 🟢 已接線 | TSK-07 | layout JSON 與 runtime bind path 一致 | EquipBindPathPolicy 被 CharacterDs3EquipChild 匯入；PROG-2-1394（#1339） | [v17.2 更正 2026-11-07] 未開始→已接線 |
| **TSK-09** | M9 | Data Read Model：Spirit_Card_Collection/Spirit_Family_State/Inventory_Service Display_Bucket | data | 3 | 🟡 純邏輯 | EQP-01 | 欄位補齊並可算 SELF/FAMILY/ECHO | SpiritFamilyReadModel.ts（PROG-2-1965 #1868） | [v17.7 更正 2026-11-07] 未開始→純邏輯；已做、待接存檔／UI |
| **TSK-10** | M10 | Profile_Presentation 與 Bloodline_Ultimate read model | data | 2 | 🟢 已接線 | TSK-09 | Default_Tab/StoryDock 狀態/五階奧義可讀 | 無 | 未開始→已接線；#1287（c1693f52）GeneralReadModel 補 Bloodline_Ultimate 子欄位；GDART-08 未改 |
| **TSK-11** | M5 | 戰場與治理新增軍勢欄位及人口貢獻 UI | ui | 3 | 🟡 純邏輯 | ECO-02 | 顯示 City_Troops_Current/Cap、Sortie_Troop_Pool 與 Returned_Troops | [v6 核對 2026-10-14] 城市兵源與出征軍勢面板 Presenter（50dc5f1a）純邏輯；畫面接線未核對 |  |
| **TSK-12** | M10 | Dialog shell 共用與 spirit-tally-detail 共用入口 | ui | 2 | 📄 僅資料 | TSK-03, TSK-05 | 英靈卡/虎符詳情都導向 spirit-tally-detail-main.json | assets/resources/ui-spec/layouts/spirit-tally-detail-main.json 存在，尚未接線 |  |
| **TSK-13** | M9 | 多家族卡平衡檢查 | test | 1.5 | 🟡 純邏輯 | TSK-09 | 多卡不線性疊加的平衡測試通過 | tests/MultiSpiritCardBalance.test.ts（PROG-2-1966 #1870） | [v17.7 更正 2026-11-07] 未開始→純邏輯；平衡測試已過 |
| **BAG-01** | M8 | 武將背包基礎結構與六欄定義與解鎖（3基礎+3進階） | logic | 2 | ✅ 已驗收 | - | Unlocked_Slots 控制各欄可用，錯類型被拒 | [v6 核對 2026-10-14] 武將背包六欄結構與解鎖（fbc60396，PROG-2-0324）；GeneralBackpack 1 處呼叫端與 2 個測試 |  |
| **BAG-02** | M8 | 主城倉庫：50格、擴容+20、上限200 | logic | 2 | 🟢 已接線 | - | capacity=50+n×20 且不超過200，滿倉拒絕存入 | 規格見 doc_spec_0431；WarehouseCapacity.ts 容量計算與 storeIntoWarehouse 零部分存入原子性 | [v18.30 核對 2026-11-07] 規格 doc_spec_0431 定案；WarehouseCapacity 接 GeneralEquipTransfer |
| **BAG-03** | M8 | 裝備/卸下操作（倉庫↔武將）含鎖定檢查 | logic | 2 | 🟢 已接線 | BAG-01, BAG-02 | 移動後兩端資料一致 | 規格見 doc_spec_0434；GearEquipFlow.ts equipGear、unequipGear 與舊裝備自動頂替回倉 | [v18.31 核對 2026-11-07] 規格 doc_spec_0434 定案；GearEquipFlow 接 GameSession 與 GearSlotPickController |
