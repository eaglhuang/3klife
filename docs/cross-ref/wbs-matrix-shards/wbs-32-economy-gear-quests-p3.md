# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.2 經濟裝備任務（3/3）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.2 經濟裝備任務（3/3）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.2 2. 經濟、裝備與任務 (Economy, Gear & Quests) · 第 3/3 段

> 續上段（表頭重複）。工作包 BAG-04 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **BAG-04** | M8 | 裝備效果計算合入戰場數值與品質加成範圍 | logic | 2 | ⚪ 未開始 | BAG-01 | SSR+50~100等範圍由品質決定並合入面板 | 無 |  |
| **BAG-05** | M8 | 倉庫篩選排序（品質/類型/時間） | logic | 1 | 🟢 已接線 | BAG-02 | 排序結果穩定 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **BAG-06** | M4 | 退役裝備自動回倉 | logic | 1.5 | 🟢 已接線 | BAG-03 | 退役觸發後裝備回倉，滿倉有提示 | [v16.7 更正 2026-10-28] 武將退役或老死後裝備回倉（PR #1065，PROG-2-0681）；GameSession 內有 equippedBy 清除路徑 |  |
| **BAG-07** | M8 | 物品鎖定與分解回收材料 | logic | 2 | 🟢 已接線 | BAG-03 | 鎖定品不可售/解，分解給材料 | 無 | 未開始→已接線；#1321 GearLockDecompose 接 GameSession；InventoryProjection 修改 |
| **BAG-08** | M8 | 寶物圖鑑 | content | 2 | 🟢 已接線 | BAG-02 | 取得過的寶物被記錄並顯示 | 無 | 未開始→已接線；#1324 TreasureCodex 接 ItemBagController／LobbyScene |
| **BAG-09** | M6 | 倉庫/背包 UI 與字串（UI_WAREHOUSE 等） | ui | 3 | 🟡 純邏輯 | BAG-02, BAG-03 | 顯示容量、擴容按鈕、滿倉提示 | [v8 核對 2026-10-15] 倉庫面板控制器（69b267cb）；WarehousePanelController 尚未掛載到場景 |  |
| **BAG-10** | M8 | 虎符/英靈卡不入普通格（Display_Bucket 分域） | logic | 1.5 | 🟢 已接線 | BAG-02 | 英靈卡不占倉庫格數，虎符不可丟棄販賣 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **BAG-11** | M11 | 伺服器裝備記錄表（equip_id/slot_type） | server | 2 | ⚪ 未開始 | BAG-03 | 表欄位與 schema 對齊並可同步 | server/src 僅 index.ts |  |
| **SPI-01** | M4 | 死亡結算產英靈卡+虎符卡（僅史實名將/女性名將，退役不產） | logic | 3 | ✅ 已驗收 | - | 名將死亡產生兩卡，非名將與退役不產 | [master fb02ff9 重估] tests/SpiritRelic.test.ts（run-cli 通過） |  |
| **SPI-02** | M9 | 唯一性與覆蓋：FinalStat=max、LineageScore累加、階位不倒退 | logic | 2 | ⚪ 未開始 | SPI-01 | 同模板再死亡覆蓋而非新增，單元測試通過 | 無 |  |
| **SPI-03** | M9 | 英勇事蹟/屬性/技能快照（Spirit_Archive_Snapshot） | data | 3 | ✅ 已驗收 | SPI-01 | 死亡時存下完整快照並可查詢 | [v5 核對 2026-10-14] 英靈死亡快照含英勇事蹟、最終屬性與技能（d4fe9144，PROG-2-0313）；SpiritArchiveSnapshot 2 處呼叫端，tests/SpiritRelic.test.ts 通過 |  |
| **SPI-04** | M9 | 命槽單插、雙卡同裝（1英靈+1虎符） | logic | 2 | ⚪ 未開始 | SPI-01 | 重複插入被拒，兩卡可同裝 | 無 |  |
| **SPI-05** | M9 | 光效三階 SELF/FAMILY/ECHO 與家族封頂 | logic | 3 | ⚪ 未開始 | SPI-04 | 依裝配者計算共鳴階並封頂 | 無 |  |
| **SPI-06** | M9 | 主卡/副卡模型與 CardGrowth=min(cap,pool)、溢出轉 Family_Fame/Depth | logic | 3 | ⚪ 未開始 | SPI-02 | 設為主卡後供養只灌主卡，戰鬥中鎖定 | 無 |  |
| **SPI-07** | M9 | 家族積分 HeadScore+MeritScore 與四階世家等級 | logic | 4 | ⚪ 未開始 | SPI-06 | 權重100/80/120%與階位解鎖測試通過 | 無 |  |
| **SPI-08** | M9 | 家族名聲值供養消耗與降階 | logic | 2 | ⚪ 未開始 | SPI-07 | 名聲不足時高階效果降階 | 無 |  |
| **SPI-09** | M9 | 姓氏零和與家傳絕學弱化 | logic | 2 | ⚪ 未開始 | SPI-07 | 子嗣只能計入一姓，非本姓獲弱化效果 | 無（M2 血統在 BloodlineGraph.ts，無姓氏歸屬） |  |
| **SPI-10** | M9 | 防火牆：近親衰減、同宗不相殘、質重於量 | logic | 2 | ⚪ 未開始 | SPI-07 | 內戰功勳打折、近親效率下降 | 無 |  |
| **SPI-11** | M9 | 傳道與專屬奧義權限 | logic | 2 | ⚪ 未開始 | SPI-02 | 英靈卡可授祖靈加護並消耗資源與次數 | 無 |  |
| **SPI-12** | M9 | 世家總覽/英靈陳列室/詳情/雙卡結算 UI | ui | 5 | 📄 僅資料 | SPI-06, SPI-03 | 總覽與陳列室分組顯示並可設主卡 | assets/scripts/ui/core/SpiritFamilyOverviewRoute.ts（顯示模型殼）；LobbyScene.ts onClickSpiritFamilyOverview；spirit-tally-detail-main.json |  |
| **SPI-13** | M9 | 幼兒指派低效內政（MCQ Q51）、戰場單場覺醒上限1（Q52）、姓氏匹配保證戰法提示（Q32） | logic | 2 | ⚪ 未開始 | SPI-09 | 三條 MCQ 規則各有單元測試 | 無 |  |
