# 學府修業畫面與接線設計（分片索引） — 9 依賴的共用框架與共通 API

> 這是 `學府修業畫面與接線設計.md` 的「9 依賴的共用框架與共通 API」分片。完整索引見 `docs/遊戲規格文件/系統規格書/學府修業畫面與接線設計.md`。

## 9. 依賴的共用框架與共通 API（PROG-2-9210 追加）

> 使用者定案：同本質的系統一律用共用 base，玩法只做包裝與差異 JSON。共六套：**商店、物品庫存、任務、獎勵、技能、劇情**（演出）。各框架正式規格由另一位企劃寫（卡號 9200 起），本章**只引用框架名稱、標出學府各功能依賴哪一套、只寫差異欄位**，不重複定義框架。寫法比照 doc_spec_1180 第 18 章、doc_spec_1181 第 3 章。框架正式欄位以 9200 系列為準，衝突時以其為準。
>
> 硬原則（使用者定案）：單機版的**重要數值、結果、存進度，一律走共通 API**，由「本機伺服器 adapter」實作；日後換「網路 adapter」即可接伺服器，學府包裝層不改一行。本章把學府目前「客戶端自己算、自己存」的地方逐項列出（9.4）。

### 9.1 現況盤點（已逐項到程式碼確認）

| 項目 | 位置 | 現況與缺口 |
| --- | --- | --- |
| 修業推進 | `AcademyTrainingEngine.resolveAcademyAction`（純函式）、`AcademyAntiSLManager`（`begin`／`commit`／`acknowledge`／`recover`） | 純邏輯、可確定性重播，**可直接當本機 adapter 的內核**；但呼叫端（`AcademyFlowController`）直接持有它，客戶端自己算結果 |
| 修業存檔 | `IAcademySaveStore` → `GameAcademySaveStore` → `GameSession._academyRecord` → `PlayerSaveSnapshot.academy` | 9189 已合併；存檔直接寫 `GameSession` 記憶體再 `persist()`，沒有經過任何 API 邊界 |
| 亂數種子 | `AcademyFlowDeps.worldSeed()`、快照 `prngSeedHex`／`inheritSeedHex`；`deriveAcademyRootSeed` | 種子由客戶端組出；網路版必須由伺服器發 |
| 開獎與印記 | `rollAncestralInheritEvent`、`rollGraduationCareerMark`（`AcademyInheritAndMarks`），設定 `data/academy-inherit-marks` | 純函式，確定性；結果寫在快照 `ancestralInheritHistory`／`graduatedCareerMark`／`pendingAptitudeBoosts` |
| 結業寫回 | `GameSession.graduateFromAcademy` → `applyAcademyGraduation`（五維、`learnedTactics`、`learnedTraits`、`careerMarks`、適性升階） | 直接改名冊武將；評級 `academyGradeOf`（總和 900／700／500，暫定） |
| 入學令 | `NurtureService.admission`（`{season, used}`、`admissionsPerSeason`、`consumeAdmissionToken`／`refundAdmissionToken`） | 只是「當季已用幾次」的計數器，不是庫存物品；與 doc_spec_0557 第 3 章（每季發 1 枚、庫存封頂 3、溢出折 100 黃金）不一致 |
| 教官 | `MentorCard`（`loadMentorCards`）、`lockedMentorIds()`、`assignYingchuanMentors`、`YINGCHUAN_MENTOR_CATALOG`（`bond`）、`MentorBorrowController`、`MentorHoldingsController` | 教官持有、鎖定、好感、借將各自一套；潁川 3 槽（祠堂 +1） |
| 戰法與 TP | 結業寫回只收 `learnedTactics`；`careerMarkTpDiscount`／`applyCareerMarkTpDiscountToCost`（TP 折扣，上限 60%）；doc_spec_1127 第 4 章 `tp`／`totalTp` | **引擎快照沒有 `tp`／`totalTp` 欄位**；TP 折扣函式存在但學府內沒有消耗端；沒有「結業戰法商店」 |
| 外界時鐘 | `AcademyFrozenError`（`GameSession` 約 5195 行）、`frozenGameTime`、`_advanceSeasonWithSalaries()` | 凍結與推季在 `GameSession` 內，無冪等鍵 |
| 打斷與演出 | `AcademyFlowController.openInterrupt` 掛鉤（9190）、`showAcademyInheritDraw`、`showAcademyGraduation` | 文案與選項 id 寫在程式與 i18n，沒有事件定義資料 |

### 9.2 學府各功能底層對照（只寫差異欄位）

| 學府功能 | 底層框架 | 差異欄位（只寫這些） |
| --- | --- | --- |
| 36 回合修業主流程（開始、每回合、結業）；入學、暫離、退學 | **任務** | 一個「學府修業」任務實例：`taskKind=academy`、`academyId`、`totalSteps=36`、`stepActions=[TRAIN,REST,GIMMICK_INTERACT,RESOLVE_INTERRUPT]`、`gates`（第 12、24 回合開始前與第 36 回合結算後的步驟閘門）、`pause=true`（暫離）、`abandon=false`（第一版，Q6）、`seedRef`（由 adapter 簽發）、`settle=graduation`。進度＝`currentTurn`，結算＝結業 |
| 訓練增益、休息回精力、特化 Bias、控制模式效率、精力上限、先祖傳承加成 | **技能**（培育類） | `domain=nurture`、`statBiasPct`（`ACADEMY_STAT_BIAS_PCT`）、`controlEfficiencyPct`（100／95／70）、`energyMax`、`trainCost=15`、`restGain=30`、`legacyStatBonusPct`（來源標籤 `bloodline`）；全部是技能 base 的 modifier，不新增獨立屬性系統 |
| 期中方針（強項深耕、補強均衡、養精蓄銳） | **技能**（持續到結業的 modifier）＋ **劇情**（三選一） | `modifierId=policy:STRENGTH｜BALANCE｜NOURISH`、`durationUntil=graduation`；選項文案走劇情 `choices[]` |
| 打斷事件（期中、弱冠、共鳴、結業確認） | **劇情**（演出）＋ **任務**（步驟閘門） | 劇情：`storyId=academy.interrupt.<kind>`、`speaker`、`choices[]`（選項 id 即 `selectedOptionId`）、`presentation=popup`、`cancelable=false`。任務：`gate.blocksUntilResolved=true`（引擎在 `pendingInterrupt` 期間只收 `RESOLVE_INTERRUPT`）。四種彈窗共用同一組節點，劇情 base 只供資料 |
| 弱冠戰法三選一的候選池 | **獎勵**（候選池）＋ **技能**（學得） | 獎勵：`poolId=academy.rite.<academyId>`、`pick=3`、`weight`、`pityRule`（先祖門風特質種子 60% 插最前）；技能：`learn` 寫進 `learnedTactics` |
| 雙年先祖遺風開獎（第 12／24 回合）、`showAcademyInheritDraw` | **獎勵**（給獎演出） | `rollKind=ancestralInherit`、`presentation=toast`（先沿用現有 toast，日後可換 `wheel`）、`seedScope=inherit`（與訓練路徑無關，防重修刷結果）、`historyKey=turn`；結果寫入技能（五維增量、`pendingAptitudeBoosts`） |
| 共鳴（彩圈 ≥180%）與紀事 | **獎勵**（機率事件）＋ **劇情**（見證） | `resonanceThresholdPct=180`、`storyId=academy.resonance`、`hitCountKey=resonanceHitCount`（供印記機率） |
| 結業獎勵：評級、白因子印記、戰法與特質寫回、適性升階 | **獎勵**（結算發放）＋ **技能**（寫回武將） | 獎勵：`rewardRef=academy.graduation`、`grade` 門檻表（S／A／B／C）、`careerMark`（`rollGraduationCareerMark`）、`aptitudeBoosts`；技能：`grant` 五維、戰法（上限 3）、特質（上限 2） |
| 潁川清談大會手牌、抽牌、事件抉擇 | **獎勵**（抽牌）＋ **任務**（互動步驟）＋ **劇情**（事件 A／B） | 抽牌：`poolId=yingchuan.essay`、`handLimit=5`、`drawStats=[int,pol,lea]`；任務：`stepAction=GIMMICK_INTERACT`、`blockingInteraction=DEBATE｜EVENT`；劇情：`YINGCHUAN_EVENTS` 對應 `storyId` |
| 受傷、失敗、保底懲罰（精力 <30、異常中斷 3 次） | **獎勵**（懲罰） | `kind=penalty`、`injury={LIGHT,SEVERE}`、`vigorPenaltyRate`、`forceRestRounds`、`abuseFloorGain=5`、`abuseEnergyPenalty=20`、`resonanceLockTurns=2`（doc_spec_0557 第 2.2 節、0302） |
| 入學令（每季發 1 枚、封頂 3、溢出折 100 黃金） | **物品庫存**（道具）＋ **獎勵**（定期發放） | ItemDef：`itemId=academy_admission_token`、`category=consumable`、`stackCap=3`、`overflow={toCurrency:gold,amount:100}`、`holder=family:storehouse`（暫定，Q9）；發放：`grant={everySeason,count:1}` |
| 補元散、補腦湯（重修）、自動培育券、家學 | **物品庫存**（消耗品）＋ **技能**（buff） | ItemDef `consumable`；`effectKind=energyRefill｜retake｜autoTrain`；第一版隱藏（Q4），但 ItemDef 預留，不另造結構 |
| 教官（見 9.3） | **物品庫存**＋ **技能** | 見下節 |
| 學戰法、TP（技巧點）累積與花費 | **技能** | `skillPoint.tp`（`baseGain=10`、`mentorTpBonusPct`、`bondEventGain=15`）、`totalTp`（只增不減，供評級）、`learn.cost`、`learn.discount`（綠因子 0.5＋印記每星 5%、合計上限 60%，即 `applyCareerMarkTpDiscountToCost`）、`slots={tactic:3,trait:2}` |
| 結業戰法商店（用 TP 買戰法；規格新增，引擎尚無） | **商店** ＋ **技能** | `shopId=academy:tactic`、`mode=sell`、`currency=tp`、`listing=learnable tactics`（由所屬學府與畢業生涯標籤篩）、`priceFormula=tpCost×(1−discount)`、`limit=slots.tactic`、`rotation=none`；購買即呼叫技能 `learn`，不新增購買邏輯 |
| 混種戰法視窗（第 15~25 回合）、窺探（doc_spec_1109） | **技能** ＋ **獎勵**（抽樣） | `learnSource=hybrid`、`window=[15,25]`、`peekMultiplier`（雙重放大乘區）；機率判定走獎勵 base 的確定性抽樣 |
| 三份成績單、重修 | **任務**（重修＝新任務實例）＋ **物品庫存**（補腦湯） | `reportSlots=3`（FIFO）、`retakeCost={itemId:brain_soup,count:1}`；doc_spec_1150，與舊流程下線範圍見 Q4 |
| 外界一季凍結與結業推季 | 不屬於六套；共通 API 的「時間」操作 | `time.freeze`／`time.advanceSeason`；冪等鍵＝修業任務實例 id（結業恰好推 1 次，TC-TIME-14） |

一句話：修業 = 任務；打斷 = 劇情 + 任務閘門；開獎、結業、抽牌、懲罰 = 獎勵；五維、TP、戰法、教官加成 = 技能；入學令、補元散、教官卡 = 物品庫存；結業戰法商店 = 商店 + 技能。

### 9.3 教官底層歸屬（回答「教官 → ?」）

> **【依 2026-11-21 裁決修訂（PROG-2-9224；下午追加支援卡見 doc_spec_1264，PROG-2-9230）】教官就是武將，不設教官卡。下表「教官卡本身」一列與「教官提供的效果」中的屬性加成、被動技、同格協同、靈感戰法全部退場；教官入學指派改走人員占用 OCC 的 `mentorAssign`（OCC 已升格第 7 個共用框架），被指派期間不能出征。師承戰法與師徒羈絆見第 14 章（shard-i）。本節其餘內容保留作歷史紀錄。**

教官不是第七套框架，拆成三種本質：

| 教官的面向 | 底層 | 差異欄位 |
| --- | --- | --- |
| 教官卡本身（獲取五來源 doc_spec_0562、星等突破、碎片合成、退役轉化、先祖退役教官、水鏡先生預設教官） | **物品庫存** | ItemDef `category=mentorCard`、`rarity`（星等）、`fragmentOf`、`origin`（五來源）、`holder=player:cardbook`（持有者名稱：卡冊）；退役先祖教官由武將轉化產生，不另建結構 |
| 教官提供的效果（訓練加成、`tpBonus`、被動技、請益、羈絆 `bond`、靈感戰法、同格協同） | **技能** | `source=mentor`、`mentorStatBonusPct`、`tpBonusPct`、`bond`（0~100）、`inspireTactic`、`sameCellSynergyPct`；加成由技能 base 的 modifier 結算 |
| 教官入學指派（槽位、唯一性、鎖定、借將） | **物品庫存**的「指派占用」＋ 網路 API | `slot={academyId, count:3, +1@祠堂Lv.4}`、`lockedBy=academyTask:<instanceId>`；借將（好友教官每日借用快照，doc_spec_0569）本質是跨玩家借用，**天生要伺服器**，列入 9.4 第 11 項 |

「同一件物品同時只能被一個修業占用」就是 9199 候選 A「人員占用登記」的同類需求，建議併入該候選裁決，不在學府單獨實作（`lockedMentorIds()` 屬此類）。

### 9.4 需改走共通 API 的重要數值與存檔（清單）

「改後」欄的 API 名稱是**語意名稱**（暫名），正式名稱以 9200 系列 B0 共通 API 規格為準。

| # | 項目 | 現況（客戶端自己做） | 改後（走共通 API；本機 adapter 內仍可呼叫現有純函式） |
| --- | --- | --- | --- |
| 1 | 修業快照與存檔（`AcademyStateSnapshot`、`AcademySaveRecord`） | `GameAcademySaveStore` 直寫 `GameSession._academyRecord`，`persist()` 落盤 | `save.write(domain=academy)`／`save.read`；寫失敗必拋；快照 `schemaVersion` 由 adapter 遷移 |
| 2 | 每回合結果（TRAIN 增益、彩圈、失敗率、受傷、共鳴、清談判定） | `resolveAcademyAction` 在客戶端算 | `task.advance(instanceId, action)` 回傳新快照；本機 adapter 內呼叫 `resolveAcademyAction`，網路 adapter 由伺服器算 |
| 3 | 亂數種子（`prngSeedHex`、`inheritSeedHex`、`worldSeed`） | 客戶端組出 | `rng.issueSeed(scope)` 由 adapter 簽發；客戶端不得自行生成 |
| 4 | 防 SL：先落盤後演出、`sessionCrashCounter`、`recover()` 保底懲罰 | `AcademyAntiSLManager` 客戶端 | 內核移到 adapter 端；API 仍是 `commit`／`acknowledge`／`recover` 三語意 |
| 5 | 雙年開獎、結業印記、共鳴次數 | 客戶端擲、存快照 | `reward.roll(poolId, seedScope)`；結果與 `history` 由 adapter 回傳並存 |
| 6 | 結業寫回名冊（五維、戰法、特質、`careerMarks`、適性升階）與評級 | `GameSession.graduateFromAcademy` 直接改武將 | `task.settle(instanceId)` → `reward.grant` → `skill.grant`；一筆交易，失敗回滾 |
| 7 | 入學令餘額、季發放、溢出折黃金 | `NurtureService.admission` 計數 | `inventory.consume／grant`、`reward.grantPeriodic`；餘額就是庫存數量 |
| 8 | 黃金等貨幣入帳（入學令溢出 100） | 無 | `inventory.currency.credit`（走貨幣操作，不另開管道） |
| 9 | 外界時鐘：凍結、`frozenGameTime`、結業推季 1 次、年齡 +0.25 | `GameSession` 內 `AcademyFrozenError`、`_advanceSeasonWithSalaries` | `time.freeze`、`time.advanceSeason(idempotencyKey=instanceId)`；結業重送不會推第 2 次 |
| 10 | TP、`totalTp`、已學戰法／特質槽、TP 折扣結算 | 引擎無欄位；折扣函式孤立 | `skill.spendPoint`、`skill.learn`、`skill.slots`；商店購買走 `shop.purchase` |
| 11 | 教官持有、碎片、指派鎖定、好感 `bond`、借將 | `MentorCard`／`lockedMentorIds`／`MentorBorrowController` 各一套 | `inventory.hold／assign／release`；`skill.bondAdjust`；借將 `inventory.borrow`（網路版天生需伺服器） |
| 12 | 補元散、補腦湯、自動培育券消耗 | 舊 `NurtureService` | `inventory.consume` |
| 13 | 成績單三份與重修計次 | 舊 `NurtureFlowController`（下線中） | `task.settle` 結果存為任務紀錄；`retake` 開新實例 |
| 14 | 舊存檔遷移（`NurtureService.sessions[]`） | 讀檔時在 `GameSession.load` 後處理 | `save.migrate(from=nurture.v1, to=academy.v1)` 在 adapter 邊界；遷移不推時鐘 |
| 15 | 開局與建檔身分（`clanUuid`、`childId`、`admissionTurn`） | 客戶端傳入 | adapter 從存檔讀，客戶端只傳 `childId` 與 `academyId` |

**留在客戶端的**（不是重要數值，不走 API）：畫面模式（`enroll`／`session`／`interrupt`）、入學選擇暫存、toast、結算動畫、節點顯示。**QA 快進入口 `qaAcademy`** 只在本機 adapter 提供（`debug.fastForward`），網路 adapter 一律拒絕，避免變成外掛入口。

### 9.5 本機 adapter 與網路 adapter 的界線（學府側要求）

1. 學府包裝層（`AcademyFlowController`、View、`LobbyScene` 掛鉤）只依賴「共通 API 介面」，不 import `AcademyAntiSLManager`／`GameSession` 的學府方法。現有 `AcademyFlowDeps.store`、`persist`、`consumeToken`、`worldSeed`、`admissionTurn` 全部換成 API 呼叫。
2. 純函式（`resolveAcademyAction`、`rollAncestralInheritEvent`、`applyAcademyGraduation`）**不刪、不改簽名**，下沉成本機 adapter 的內核；單元測試照舊。
3. 每個寫入操作回傳「完整新狀態」，客戶端只做顯示，不再自行推導數值。
4. 失敗語意統一：API 回傳錯誤碼，客戶端保留舊狀態並 toast；與現行「寫失敗不前進」一致。
5. 本機 adapter 通過的情境，網路 adapter 以同一組契約測試（replay 同一種子應得同一結果，TC-CORE-03 確定性）驗證。

### 9.6 不屬於六套、需注意的地方

- 確定性隨機與防 SL 工作階段（doc_spec_1180 第 18.3 節候選 1）：學府 `AcademyRng`＋`AcademyAntiSLManager` 是最完整的現有實作，建議以它當候選的抽出來源。
- 必中斷事件佇列（候選 7）：學府 `pendingInterrupt` 與 1180 的多子嗣節點佇列同類。
- 解鎖條件評估（候選 5）：入學資格（年齡 15、已抓周、無進行中修業）與祠堂教官槽等級屬此類。
- 自動解算與折扣（候選 6）：學府控制模式 `SEMI_AUTO`（95%）／`AUTO`（70%）是「玩家省時間、換固定折扣」的標準例子。
- 以上候選待總 PM 裁決，本章不定案；學府的 JSON 已盡量用「權重表」「持續效果」「解鎖條件」三種通用形狀書寫。

---
