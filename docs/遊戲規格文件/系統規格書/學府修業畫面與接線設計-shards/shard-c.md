# 學府修業畫面與接線設計（分片索引） — 4 入學、修業主畫面、打斷宿主、結業串接

> 這是 `學府修業畫面與接線設計.md` 的「4 入學、修業主畫面、打斷宿主、結業串接」分片。完整索引見 `docs/遊戲規格文件/系統規格書/學府修業畫面與接線設計.md`。

## 4. 各畫面設計

### 4.1 A 入學／選學府（PROG-2-9189）

目的：選子嗣、學府、教官、控制模式，按「入學」建快照。第一版只開潁川，其餘四座（幽州、江東、洛陽、隆中）顯示「即將開放」不可按。

- **引擎 API**：`AcademyId`；`createAcademySnapshot`；`assignYingchuanMentors`；`AcademyAntiSLManager.begin`；`AcademyControlMode`（`MANUAL`／`SEMI_AUTO`／`AUTO`，效率 100／95／70）；`ACADEMY_STAT_BIAS_PCT[academyId]` 顯示學府特化（潁川：智力 +30%、政治 +25%、統率 +10%）。
- **狀態流**：`browsing` → 選子嗣（只列已抓周、未結業、無進行中學府、存活、非俘虜）→ 選學府 → 選教官（先祖退役教官置頂高亮「先祖傳承」；缺教官時提供水鏡先生，見 doc_spec_1172 §三）→ 選控制模式 → 「入學」。入學成功即 `begin`，切到 B。
- **資格檢查**：重用 `NurtureService.checkStart` 的子嗣類條件（`child-dead`、`child-captive`、`child-underage`、`not-unveiled`、`fate-pending`、`already-graduated`、`already-nurturing`）；教官類改查學府教官插槽；入學令與季節模式見 Q3。
- **可重用**：`nurture-flow-screen`／`nurture-flow-main` 的 `flowCard`、`flowTitle`、`flowPager`、`btnPrevChild`／`btnNextChild`、`btnCloseFlow`、`DeckRow`（`btnDeckSlot0~4`，學府版前 3 槽有效、第 4 槽依祠堂等級、第 5 槽隱藏）、`deckHint`、`btnMentorGuide`；`mentor-card-detail-screen`（點教官看詳情）；`mentor-borrow-screen`（借將，見 Q4）。skin 沿用 `nurture-flow-default`。
- **新增 layout**：`academy-enroll-main.json`（加對應 screen／content，skin 引用 `nurture-flow-default`，不新增圖）：5 張學府卡橫列（潁川啟用，其餘帶「即將開放」鎖定字樣）、教官槽列、控制模式切換鈕（循環切換，仿 `btnDelegatePolicy`）、`btnEnrollConfirm`、`btnEnrollBack`。
- **宿主**：`AcademyFlowController`（新，`ui/core`）持有 `mode: 'enroll' | 'session' | 'interrupt'`；LobbyScene 只掛載與轉接，規則全在 controller（可單元測試）。

### 4.2 B 36 回合修業主畫面（PROG-2-9189）

目的：顯示目前狀態，讓玩家選訓練、休息、專屬互動，每回合結算。

- **引擎 API**：`commit({ actionType: 'TRAIN', targetStat })`、`commit({ actionType: 'REST' })`、`commit({ actionType: 'GIMMICK_INTERACT', selectedOptionId })`；讀 `snapshot.currentTurn`／`energy`／`energyMax`／`stats`／`learnedTactics`／`learnedTraits`／`chronicles`／`controlMode`／`resonanceLockTurns`；階段用 `academyPhaseOf(turn)`；潁川專屬狀態用 `yingchuanStateOf(snapshot)`（手牌、清談、事件）；`gimmick.blockingInteraction` 決定訓練鈕是否可按。
- **狀態流**：`idle`（可操作）→ 點訓練或休息 → `commit`（落盤）→ `settling`（顯示本回合增益、精力變化、共鳴；播完或玩家點確認）→ `acknowledge()` → 若 `pendingInterrupt` 非 null 切 C；若 `graduated` 切 D；否則回 `idle`。讀檔 `recover().recovered` 為真時直接進 `settling`、略過動畫；`warning` 為真時 toast 提醒異常中斷次數。`AUTO` 模式引擎自己代選打斷與互動，畫面只顯示結果。
- **畫面元素**：
  - 標頭：學府名、`第 N / 36 回合`、階段名（建基期 1~12、造詣期 13~24、大成期 25~36；與 doc_spec_1127 名詞差異見 Q5）。
  - 五維列：`str`／`lea`／`int`／`pol`／`cha` 現值（單項上限 500、總量上限 2000）、學府特化標示、訓練鈕。
  - 精力條：`energy / energyMax`；訓練耗 15、休息 +30（`ACADEMY_TUNING`，暫定值）。
  - 教官列：目前教官與好感（潁川 `mentors[].bond`）。
  - 專屬互動區：潁川清談大會手牌與事件抉擇（`DEBATE:i,j,k`、`DISCARD:i`、`DECLINE`、`SKIP`、`EVENT:A`／`EVENT:B`），第一版以文字列表加點選實作，不做牌面圖。
  - 回合結算紀錄：重用 `nurtureLog` 單一文字節點，顯示最近一筆結算與 `chronicles` 最近一筆。
  - 控制模式鈕（MANUAL／SEMI_AUTO／AUTO）。
  - 「暫離」鈕：存檔不丟、回大廳；再進入由 `recover()` 還原。
  - 「退學」鈕：待裁決（Q6）。
- **可重用**：`nurture-flow-main` 的 `nurturePanel`（`nurtureName`、`nurturePhase`、`nurtureRound`、`nurtureVigor`、`nurtureMentors`、`nurtureLog`）、`trainBlock`（`SlotRow`、`Slot_str`~`Slot_cha`、`slotStat_*`、`slotMentors_*`、`btnTrain_*`、`trainLabel_*`）、`btnRest`、`btnAutoNurture`（改作控制模式鈕）、`btnAbandon`、`flowNotice`；`nurture-session-main` 的 `TurnLabel`、`PhaseBlockHeader`、`MentorModeChip`。
- **新增 layout**：`academy-session-main.json`：以 `nurture-flow-main` 的 `trainBlock` 結構為底複製子樹（同一批 skin），新增特化標籤、清談互動區（最多 5 張手牌文字鈕加出牌／略過鈕）、暫離鈕。不新增圖。
- **存檔**：`GameSession` 新增 `academyRecord` 存取與 `PlayerSaveSnapshot.academy`；`GameAcademySaveStore` 實作 `IAcademySaveStore`（`write` 失敗必拋）。

### 4.3 C 打斷宿主與四種彈窗（PROG-2-9190）

目的：當 `snapshot.pendingInterrupt` 非 null，在修業主畫面上疊一個共用打斷彈窗，玩家作答後 `RESOLVE_INTERRUPT`。

| 打斷 | 觸發 | 內容 | `selectedOptionId` | 結算後 |
| --- | --- | --- | --- | --- |
| `MIDTERM` 期中方針 | 第 12 回合開始前 | 方針三選一：`STRENGTH` 強項深耕（最高屬性 120%、其餘 90%）、`BALANCE` 補強均衡（最低屬性 130%、每次訓練多耗 5 精力）、`NOURISH` 養精蓄銳（每回合回 10 精力） | 方針 id | 呼叫 `showAcademyInheritDraw(before, after, ancestorName)` |
| `COMING_OF_AGE` 弱冠戰法 | 第 24 回合開始前 | 戰法三選一：`snapshot.interruptOptions`（潁川優先列教官頓悟與背水立論，不足補 `TACTIC_GENERIC_*`；先祖門風特質種子 60% 機率插到最前） | 戰法 id | 呼叫 `showAcademyInheritDraw` |
| `RESONANCE` 共鳴 | 訓練彩圈達 180% 以上的該回合後 | 單鍵「見證」，顯示重大共鳴與紀事 | `WITNESS` | 回修業主畫面 |
| `GRADUATION` 結業確認 | 第 36 回合結算後 | 單鍵「結業」，顯示最終五維預覽 | `CONFIRM` | `snapshot.graduated` 為真，進 D |

- **引擎 API**：`commit({ actionType: 'RESOLVE_INTERRUPT', selectedOptionId })`；常數 `ACADEMY_MIDTERM_POLICIES`、`ACADEMY_RESONANCE_WITNESS`、`ACADEMY_GRADUATION_CONFIRM`、`ACADEMY_GENERIC_RITE_OPTIONS`；`ancestralInheritHistory`（開獎紀錄，供 `showAcademyInheritDraw` 比對 before／after）。
- **狀態流**：`interrupt-open` → 玩家選項（互斥高亮，按確認）→ `commit` → 取得 `after` → 若為 `MIDTERM` 或 `COMING_OF_AGE`：`showAcademyInheritDraw(before, after, ancestorName)`（`ancestorName` 取自 `legacySupport` 對應先祖教官名）→ `acknowledge()` → 關彈窗 → 回 B 或進 D。
- **可重用**：`nurture-graduation-main` 的卡片框與行（`NurtureGraduationCard`、`graduationRow0~4`）作為彈窗外框與選項行；`toast-message-main` 顯示開獎演出（已由 `showAcademyInheritDraw` 處理）；按鈕樣式沿用 `btnDeckSlot`／`btnFateAccept`。
- **新增 layout**：`academy-interrupt-main.json`：單一彈窗，節點 `interruptTitle`、`interruptBody`、`interruptOption0~2`（3 個選項鈕）、`interruptConfirm`、`interruptHint`；四種打斷共用，靠 `setTexts` 切文案、`setActives` 控制選項個數（單鍵類只亮 `interruptConfirm`）。文案走 i18n 四語（zh-TW、zh-CN、en、ja）。
- **不可取消**：打斷彈窗沒有關閉鈕（引擎在 `pendingInterrupt` 期間只接受 `RESOLVE_INTERRUPT`）；暫離只能在 B 主畫面做；重進時 `recover()` 還原打斷狀態並重新彈出。

### 4.4 D 結業串接（PROG-2-9191）

- **流程**：`GRADUATION` 確認後 `snapshot.graduated` 為真，宿主依序：
  1. `LobbyScene.showAcademyGraduation(generalId, snapshot)`，內部呼叫 `graduateFromAcademy`（寫回五維、戰法、特質、白因子印記，自動存檔），彈 `academy-graduation-result-screen`。
  2. 玩家關閉結算彈窗（`btnAcademyGradClose`）後，宿主清掉 `academyRecord`（存檔）。
  3. 外界時鐘推進 1 季：呼叫既有 `_advanceSeasonWithSalaries()`（走完季報、俸祿、換季事件），依 doc_spec_0524 恰好 1 次。
  4. 回大廳；`SeasonAdvanced` 之後的 `_refreshNurtureFlow` 照常。
- **失敗處理**：`showAcademyGraduation` 回傳 null（查無武將、快照未結業）時 toast 並保留 `academyRecord`，玩家可重進再試，不推進時鐘、不清存檔。
- **入口串接**（同 9191）：
  - 5 歲開蒙 toast（約 1856 行）：文案改成指向「培育」的抓周與入學；抓周完成後出現「送入學府」。
  - lineage 彈窗 `openAcademy`（約 1304 行）：改為 `openAcademyEnroll(childId)`，入學畫面預選該子嗣並預設先祖教官置頂。
  - 及冠直通（doc_spec_1172 §二.3，15 歲）：【送入學府】直接開入學畫面。
  - 底欄「培育」「開獎・培育」：保留為抓周入口；有進行中學府時，入口直接回修業主畫面。
- **下線**：舊 `NurtureFlowController` 的 `start`／`train`／`graduate`／`retake`／`commitReport` 路徑與 `NurtureSystem.train()` 的呼叫端；`NurtureService.start`／`checkStart` 的入學令邏輯依 Q3 決議處理。純邏輯檔（遷移與單元測試需要）至少保留一個版本。

---
