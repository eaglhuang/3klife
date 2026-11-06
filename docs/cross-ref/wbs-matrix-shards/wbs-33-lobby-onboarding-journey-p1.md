# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.3 大廳開場生涯（1/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.3 大廳開場生涯（1/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.3 3. 大廳、開場與生涯 (Lobby, Onboarding & Journey) · 第 1/4 段

> 涵蓋幕府大廳建設、祭壇互動、開場引導劇本、轉蛋機率與祈願池、生涯武將日誌、留存每日簽到與正式文案。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **HALL-01** | M6 | 大廳資料模型與 Lobby_Hub schema（主題/任務板/官職快照/點位/沙盤/祭壇） | data | 2 | 🟢 已接線 | - | Lobby_Hub 型別與 JSON schema 可載入範例資料並通過 schema 驗證，含 Intel_Reveal_Percent、AI_Assign_Enabled 等欄位 | [v7 核對 2026-10-14] LobbyHubSchema 由 LobbyScene、HallBoardPanelController、HallMissionBoardPresenter 等呼叫（8ee94a49、3695df97）。前次 PM 裁定「無呼叫端維持純邏輯」，現已有呼叫端，請 PM 確認是否升級 |  |
| **HALL-02** | M6 | 大廳場景骨架與頂部狀態列（資源/官職/時段） | ui | 3 | 🟢 已接線 | HALL-01 | 進入大廳可見左右牆、中央沙盤區、點位區、祭壇區與頂部狀態列，畫面符合 layout spec | assets/scripts/ui/scenes/LobbyScene.ts(1486行)、ui-spec/layouts/lobby-main-screen.json；無 runtime 驗收測試(僅 tests/fixtures/dom-to-ui/lobby-action.html) |  |
| **HALL-03** | M6 | 雙牆任務板：任務池生成/可見性過濾/已接取置頂/五級難度 | logic | 3 | 🟢 已接線 | HALL-01 | getVisibleHallTasks 依官職/沙盤階段/情報過濾；進入大廳、早中晚切換、手動刷新三時機重算；已接取任務置頂 | [v7 核對 2026-10-14] HallMissionBoardPresenter 由 HallBoardPanelController 與 LobbyScene 呼叫，雙牆任務板畫面（8ee94a49，PROG-2-0456）。前次 PM 裁定維持純邏輯，現已有呼叫端，請 PM 確認是否升級 |  |
| **HALL-04** | M6 | 任務詳情彈窗 800x900 Modal（情報度/再探/執行/等待/委任/ESC/背景關閉） | ui | 4 | 🟢 已接線 | HALL-03 | 點擊任務開啟阻斷式彈窗，顯示情報度、四耗費、基礎與完美獎勵，四按鈕橫排，X/ESC/背景點擊可關閉 | assets/scripts/ui/components/LobbyMissionDetailDialogComposite.ts(894行，含 intelRevealPercent、btnAssign、KeyCode.ESCAPE)、ui-spec/layouts/lobby-mission-detail-dialog-main.json；無單元測試 |  |
| **HALL-05** | M6 | 情報度與 AI 委任邏輯（F-5：再探升100%、Required_Intel 與 Reveal 分離、委任回看紀錄） | logic | 2 | 🟢 已接線 | HALL-04 | 再探將 Intel_Reveal_Percent 刷新到100且完整內容揭露；委任後由 AI 選將執行並可回看結算紀錄；單元測試涵蓋 F-5 四函式 | [v16 核對 2026-10-21] 情報度與委任判斷：HallTaskIntel 由 HallAutoAssign、HallDetailActionStates 呼叫（a56a17f4，PROG-2-1005，#749），HallTaskIntel.test.ts 存在；回看紀錄資料結構未核對 |  |
| **HALL-06** | M6 | 自告奮勇事件（F-2 判定、毛遂自薦標記、下拉優先提示、一次性演出） | logic | 2 | 🟢 已接線 | HALL-04 | shouldShowVolunteerEvent 判定正確且每任務僅觸發一次；下拉清單優先列出自薦者；成功率加成規則依裁定落地 | LobbyScene.ts L556/L1056/L1321 _isMissionDetailVolunteerGeneral 僅標記 volunteer 旗標；無 F-2 判定與 +50% 加成、無測試 |  |
| **HALL-07** | M6 | 武將點位刷新池（6~8點位、3~5人、60秒洗牌、Idle、頭頂姓名官職、集體反應） | logic | 3 | 🟢 已接線 | HALL-02 | rollHallCharacters 加權抽樣正確(favorite 2.0/assigned 1.2)，每60秒刷新，點擊可對話/看資訊 | [v7 核對 2026-10-14] HallCharacterPresenter 由 GameSession 與 HallBoardPanelController 呼叫（3695df97，PROG-2-0455）；6~8 點位與 60 秒洗牌未逐項核對 |  |
| **HALL-08** | M9 | 世界沙盤 S1/S2/S3 階段、遠征檔案、解鎖歷史保留 | logic | 4 | 🟢 已接線 | HALL-01 | 依官職解鎖沙盤階段；Unlock_History 在天下重組後不倒退；S3 顯示 Expedition Dossier 輪廓 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **HALL-09** | M10 | 晝夜與節慶主題配置驅動（背景/裝飾/前景粒子三層、主題切換） | ui | 3 | 🟢 已接線 | HALL-02 | 切換 Theme_ID 即可更換日夜光色與節慶三層，不含節慶硬寫分支 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **HALL-10** | M8 | 許願祭壇大廳入口（早中晚三巡、插槽三態、倒數/收取/加速） | ui | 3 | ⚪ 未開始 | HALL-02 | Wish_Pool.Active_Wishes 映射為插槽空位/進行中/可領取；加速後剩餘時間不低於0並轉可收取 | [v16.4 封鎖 blocked 2026-10-27] HALL-10 依據：ECO-03「精元與靈玉是否同一付費貨幣」仍等使用者裁決，許願祭壇的付費加速依賴此貨幣定義，故封鎖 ；等使用者裁決（PM 指示，repo 內無對應說明） ；無（grep Wish_Altar/wish 於 assets/scripts 無結果） |  |
| **HALL-11** | M9 | 官職快照讀取與功能/欄位/沙盤解鎖掛載 | logic | 2 | 🟢 已接線 | HALL-01 | 大廳讀取 Officer_Snapshot 並依階位解鎖任務難度上限、欄位數與熱點 | [v13 核對 2026-10-20] 官職快照接線到大廳任務牆與沙盤入口（d81dc669，PROG-2-0824，#592）；OfficerDisplay 由 LobbyScene 與 HallMissionSettlement 呼叫。沙盤解鎖掛載未逐項核對 |  |
| **HALL-12** | M9 | 世家總覽熱點與世家入口捷徑 | ui | 3 | 🟢 已接線 | HALL-02, HALL-11 | 已解鎖世家系統時顯示世家總覽熱點，依家族分組顯示家族名/主卡/深度/名聲；未解鎖則隱藏 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **HALL-13** | M10 | 大廳字串/劇本文案 i18n 與城市兵源顯示覆寫 | content | 1 | 🟡 純邏輯 | HALL-02 | H章20個 UI_HALL_* Key 與G章9句文案進 i18n 表；軍事成本顯示『消耗城市兵源 {N}』 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **HALL-14** | M11 | 大廳伺服端同步與驗收測試（hall_*_json、單元/整合測試） | server | 3 | 🟡 純邏輯 | HALL-03, HALL-07, HALL-08 | 大廳狀態可存取同步，並有自動化測試覆蓋任務可見性、情報度與刷新池 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 | 2026-10-28 核對 master：HallSyncSnapshot 僅測試，無 src 呼叫端；與盤點一致，維持純邏輯 |
| **GCH-01** | M8 | 雙池資料與機率表（名將池 SSR3/SR10/R87、支援池 SSR5/SR25/R70、Up 比例） | data | 2 | 📄 僅資料 | - | gacha-config 含兩池機率、Up 角色、Featured_SSR 與 Female_Role_Type_Map，載入驗證通過 | assets/resources/data/gacha-config.json（僅 hero-pool/support-pool、guaranteeThreshold 10/5，無 SSR/SR 機率與 Up）；core/models/GachaConfig.ts |  |
| **GCH-02** | M8 | 抽取引擎：單抽/十連、稀有度抽樣、Up 權重、女性名將定位 | logic | 3 | ✅ 已驗收 | GCH-01 | 固定 seed 下抽樣分佈符合規格機率(統計測試)；結果寫入 Action log | [v6 核對 2026-10-14] 轉蛋規格機率與保底接線（c0e54159，PROG-2-0335）；GachaDraw 3 處呼叫端，3 個測試檔 |  |
| **GCH-03** | M8 | 保底系統：50抽小保底SR+、200抽大保底、兩池計數獨立 | logic | 2 | ✅ 已驗收 | GCH-02 | 第50抽必出SR+、累計200抽解鎖天命商店；兩池計數互不影響，測試覆蓋 | [v12 核對 2026-10-20] 保底計數：小保底第 50 抽必出 SR+、大保底 200 抽、各池計數獨立（GachaDraw.ts，PM 2026-10-20 指示核對）；GachaDraw.test.ts 覆蓋小保底，GachaDraw 由 GameSession、LocalGachaService、PlayerSaveService 呼叫，存檔 gachaPity 有 GachaPityStorage 測試 |  |
| **GCH-04** | M8 | 貨幣系統分流（靈玉/銅錢符/求籤令）與扣款規則 | logic | 2 | 🟢 已接線 | GCH-01 | 靈玉兩池可用、銅錢符僅常設池、求籤令定向保底上限100；餘額不足拒絕 | [v6 核對 2026-10-14] 貨幣分流（7af83379）、錢包補銅錢符與求籤令（d7757bcd）、錢包併入存檔（af718aac）；LocalGachaService 接線 |  |
| **GCH-05** | M8 | 轉生機制 1~5 轉（培育機會次數與屬性上限 1000/1100/1250/1400/1500+） | logic | 3 | ✅ 已驗收 | GCH-02 | 重複抽到同名武將轉數+1，上限表與培育次數正確；溢出走結義點數 | [v5 核對 2026-10-14] 重複抽到同名武將轉生 +1 轉（18a78d57，PROG-2-0314）；Rebirth 接線，tests/Rebirth.test.ts 通過 |  |
