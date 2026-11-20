# 學府修業畫面與接線設計（分片索引） — 0–1 結論、新舊分工、舊存檔遷移

> 這是 `學府修業畫面與接線設計.md` 的「0–1 結論、新舊分工、舊存檔遷移」分片。完整索引見 `docs/遊戲規格文件/系統規格書/學府修業畫面與接線設計.md`。

# 學府修業畫面與接線設計

> 標籤：`NUR-03` · `NUR-04` · `TIME-06` · `學府修業` · `畫面接線` · `PROG-2-9188`
> 設計卡：PROG-2-9188；實作卡：PROG-2-9189（修業主畫面＋入學）、9190（打斷宿主與四種彈窗）、9191（結業與入口串接＋舊培育下線）、9192（academy playtest 步驟）。
> 共用框架依賴與實作卡拆分（依六套 base 與共通 API）：第 9~11 章（PROG-2-9210）；十歲歷練同類對應見 doc_spec_1180 第 18 章、家業見 doc_spec_1181 第 3 章。
> 上游規格：doc_spec_1127（三十六回合三階段與訓練公式）、doc_spec_1130（會話資料結構與鏡像快照）、doc_spec_0524（外界時間凍結）、doc_spec_1172（五歲抓周與及冠直通學府）、doc_spec_0302（學府總控與防 SL 引擎）。

---

## 0. 結論先講

學府引擎（`assets/scripts/core/systems/nurture/`）是純邏輯、已完成，但 `assets/scripts/ui` 沒有任何地方呼叫它；玩家按「開獎・培育」進的還是舊 `NurtureFlowController` 加舊 `NurtureSystem.train()`。本設計把學府引擎接成正式培育玩法，分三步：

1. 新增「學府宿主」`AcademyFlowController`（`ui/core`，純邏輯＋依賴注入，仿 `AcademyGraduationController`），由 LobbyScene 掛載三組畫面：入學、修業主畫面、打斷彈窗；結業重用既有 `academy-graduation-result-screen`。
2. 舊 NurtureFlow 只留抓周與開獎（fate 面板）；訓練回合、結業評級、自動培育訓練全部下線，入口改接學府。
3. 學府快照落盤走 `AcademyAntiSLManager`，存檔欄位掛進 `PlayerSaveSnapshot`（目前學府沒有任何 `IAcademySaveStore` 實作，這是本案最大的新增工）。

---

## 1. 新舊分工

### 1.1 現況（已逐項到程式碼確認）

| 項目 | 位置 | 現況 |
| --- | --- | --- |
| 底欄「培育」→「開獎・培育」 | `LobbyScene._openNurtureFlow`（約 2057 行）、`nurture: () => this._openNurtureFlow()`（約 1654 行） | 開 `nurture-flow-screen`，由 `NurtureFlowController` 驅動 |
| 舊訓練回合 | `NurtureSystem.train()`、`NURTURE_TOTAL_ROUNDS=36`、`NurtureService` | 玩家現在實際玩到的培育 |
| 學府引擎 | `AcademyTrainingEngine`、`AcademyAntiSLManager`、`AcademyGraduation`、五座 `*Academy`／`*Gimmick` | 完整可用，ui 層零呼叫 |
| 結業彈窗 | `LobbyScene._mountAcademyGraduation`（約 1430 行）、`showAcademyGraduation`（約 1448 行）、`GameSession.graduateFromAcademy`（約 1252 行） | 已寫好，沒有呼叫端 |
| 雙年開獎 toast | `LobbyScene.showAcademyInheritDraw(before, after, ancestorName?)`（約 1467 行，PROG-2-9183） | 沒有呼叫端 |
| 5 歲開蒙 | `LobbyScene` 的 `GeneralUnveiled` 事件（約 1856 行） | 只跳 toast「請到開獎・培育選擇宿命」 |
| lineage 彈窗 | `LineageMilestonePopupController.openAcademy`（約 1304 行） | 走 `_openNurtureFlow` 再 `recommendAncestorDeck` |

### 1.2 分工表

| 步驟 | 舊 NurtureFlow | 學府 |
| --- | --- | --- |
| 5 歲開蒙揭曉、抓周／宿命選擇（`fatePanel`：`btnFateAccept`、`btnFateDefy`） | **保留** | 不碰 |
| 子嗣切換（`btnPrevChild`／`btnNextChild`） | 保留（只看抓周中的子嗣） | 入學畫面自帶子嗣選擇 |
| 教官牌組選擇（`DeckRow`、`btnDeckSlot0~4`、`recommendAncestorDeck`、借將） | 下線；牌組載入與先祖置頂邏輯抽成共用函式 | 入學畫面重用（見 4.1） |
| 開始培育（`btnStartNurture`，扣入學令、建舊 session） | **下線** | 入學畫面「入學」鈕：`createAcademySnapshot` 加 `begin` |
| 訓練回合（`btnTrain_*`、`btnRest`、`btnAutoNurture`、`nurtureLog`） | **下線** | 修業主畫面 |
| 結業評級（`btnGraduate`、`btnRetake`、`btnCommitReport`、`reportBlock`） | **下線** | 結業彈窗（`academy-graduation-result-screen`） |
| 學戰法（`tacticBlock`、`btnLearnTactic`）、補元散（`btnUsePill`）、家學（`btnFamilyStudy`） | 下線 | 待裁決，見 Q4 |

交棒點：抓周完成（`fate.choice` 寫入）之後，子嗣在 nurture-flow 不再進入舊 `startBlock`，改顯示「送入學府」鈕（沿用 `btnStartNurture` 節點，改文字與行為）呼叫學府入學。nurture-flow-screen 因此縮成「抓周＋入學入口」兩個狀態，`trainBlock`／`graduateBlock`／`reportBlock`／`tacticBlock` 在 9191 整塊隱藏（節點先保留一個版本供回滾，之後清除，不新增節點）。

### 1.3 舊存檔遷移（建議方案，待使用者在 Q1 裁決）

進行中的舊會話存在 `NurtureService` 的 `sessions[]`（`status: 'active'`，欄位 `round` 0~36、`prowess`、`talent`），隨 `PlayerSaveSnapshot` 一起存。學府快照結構完全不同（五維直接累加、gimmick 狀態、確定性種子），無法無損轉換。

建議方案「依進度折算」：

1. 讀檔時（`GameSession.load` 之後、大廳可操作之前）掃描 active 舊會話，一次性處理，處理完把會話標成 `abandoned` 並寫存檔，之後不再出現。
2. 已完成回合小於 12：**退學重來**。退還入學令、解鎖教官，子嗣回到「已抓周、未入學」，toast 說明「培育系統升級為學府，請重新入學」。幾乎無損失，因為還沒到期中。
3. 已完成回合 12 以上：**依進度結業**。呼叫舊 `NurtureSystem` 的畢業折算純函式（只在遷移處保留，標 `@deprecated migration-only`）寫回五維，評級照舊；toast 說明。**不推進外界時鐘**（遷移不是玩家行為，避免讀檔憑空跳季）。
4. 兩條路徑都不碰學府快照；9191 負責實作與單元測試（舊存檔 fixture：round 5、round 12、round 36 各一）。

理由：學府公式與舊公式不同，硬轉會造成數值爭議；前 12 回合損失極小，退學重來最公平；12 回合後玩家投入較多，直接結業保住成果。替代方案（全部退學重來／全部依進度結業）列在 Q1。

---
