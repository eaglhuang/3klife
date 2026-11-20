<!-- doc_id: doc_spec_1185 -->
# 任務系統 Base 框架規格書

> 上層總綱：`共用框架總綱規格書.md (doc_spec_1182)`。本書是六套共用框架之一。
> 伺服器 API 與網路原則見總綱第 5 章（本書第 11 章只列本框架端點與 schema，不重複原則）。
> 相關框架：獎勵 (doc_spec_1186，任務結算後的獎勵與懲罰全部交給它)、物品庫存 (doc_spec_1184，物品條件)、商店 (doc_spec_1183)、技能 (doc_spec_1187)、劇情（演出）(doc_spec_1188，任務劇情)。
> 任務卡：PROG-2-9200（文件）。狀態：草案，待使用者裁決第 10 節選擇題。

## 1. 目的與範圍

使用者定案：很多系統是靠基礎任務系統用玩法包裝出來的，本質都是**接任務、解任務**；獎勵與懲罰另成獨立的獎勵系統。

範圍內：任務定義、接取條件、完成條件與進度、狀態機（開放→進行中→結算／過期）、派遣型與計數型兩種解法、成敗判定、結算入口、任務牆與清單投影、AI 委任。
範圍外：獎勵與懲罰內容（歸獎勵）、物品持有（歸庫存）、劇情與演出播放（歸劇情演出）。任務結算只輸出「成敗等級」與「呼叫哪個獎勵套件／獎池」。

## 2. 核心概念與名詞

- **任務定義（QuestDef）**：靜態設定；沿用現有 `mission-def.v1`，擴充為通用定義。
- **任務實例（QuestInstance）**：某玩家／某幕府的一張任務，帶狀態、進度、到期。
- **接取條件（AcceptWhen）**：什麼情況下可接（等級、旗標、物品、官職、季節）。
- **解法（Solver）**：`dispatch` 派遣型（派武將、看適合度與情報、擲骰分成敗，現有任務核心）／`progress` 計數型（累計事件，如擊敗 N 名敵將、累積 N 糧草）／`choice` 選擇型（劇情選項決定）／`timer` 計時型（等待 N 季）。
- **條件（Condition）**：以 JSON 描述的判斷式；接取、完成、失敗、可見都用同一套（見總綱第 11 章「條件與表達式」候選）。
- **進度（Progress）**：計數器集合，由事件（戰勝、購買、入庫、劇情旗標）推進。
- **結算（Settle）**：把任務推到終局，得出成敗等級 `critical／success／fail／disaster`，再呼叫獎勵。
- **衍生（Spawn）**：結算後產生新任務（任務鏈）。

## 3. 共用資料結構（設定 JSON 草案）

### 3.1 任務定義 `quest-def.v1`（以現有 `mission-def.v1` 為基底）

```json
{
  "schema": "quest-def.v1",
  "id": "DOM_FAMINE_RELIEF",
  "category": "domestic",
  "difficulty": "NORMAL",
  "tags": ["domestic", "famine"],
  "solver": "dispatch",
  "text": { "titleKey": "quest.DOM_FAMINE_RELIEF.title", "briefKey": "quest.DOM_FAMINE_RELIEF.brief" },
  "acceptWhen": { "all": [{ "flag": "tutorial.done" }, { "fame": { "gte": 10 } }] },
  "visibleWhen": null,
  "requirement": { "slots": 1, "keyStats": { "pol": 1, "cha": 0.3 }, "preferTags": [], "avoidTags": [] },
  "timing": { "durationSeasons": 1, "expireSeasons": 2 },
  "intel": { "initial": 45, "jitter": 10 },
  "cost": { "troops": 0, "grain": 100, "energy": 1 },
  "outcome": {
    "critical": { "reward": "POOL_FAMINE_CRIT" },
    "success":  { "reward": "BUNDLE_FAMINE_OK" },
    "fail":     { "reward": "BUNDLE_FAMINE_FAIL" },
    "disaster": { "reward": "BUNDLE_FAMINE_DISASTER", "spawn": ["DOM_FAMINE_AFTER"] }
  },
  "rewardScale": { "rewardMul": 1.0, "riskMul": 1.0 }
}
```

現有任務核心的「結果樹」（`roll／chance／switch／effects／seq` 節點）保留，作為 `dispatch` 型 `outcome` 的進階寫法；樹的葉節點「效果清單」改為「獎勵套件／獎池引用」或內嵌獎勵項（兩者等價，內嵌者由獎勵系統的效果帳本解譯）。

### 3.2 計數型任務 `solver=progress`

```json
{
  "schema": "quest-def.v1", "id": "PASS_S1_W3_KILL", "category": "pass", "solver": "progress",
  "acceptWhen": null,
  "objectives": [
    { "id": "o1", "event": "battle.enemyGeneralDefeated", "filter": { "stageType": "any" }, "target": 5 },
    { "id": "o2", "event": "shop.purchased", "filter": { "tag": "consumable" }, "target": 2 }
  ],
  "complete": { "all": ["o1", "o2"] },
  "reset": { "period": "week" },
  "outcome": { "success": { "reward": "BUNDLE_PASS_S1_W3" } }
}
```

### 3.3 任務實例 `quest-instance.v1`

```json
{ "qid": "q_000231", "defId": "DOM_FAMINE_RELIEF", "owner": { "kind": "household", "id": "h1" },
  "state": "ACTIVE", "openedSeason": 12, "expireSeason": 14,
  "progress": { "o1": 3, "o2": 0 },
  "dispatch": { "generalIds": ["g_zhugeliang"], "lockedCost": { "grain": 100 } },
  "result": null }
```

狀態：`OPEN`（任務牆上）→ `ACTIVE`（已接／已派遣）→ `SETTLED`（含成敗等級與已領取標記）／`EXPIRED`／`CANCELLED`。

### 3.4 自動解算 `autoResolve`（歸入任務系統，來自歷練規格 18.3 的 AutoResolve）

```json
{ "autoResolve": { "enabled": true, "pointsMul": 0.8, "delegateEfficiency": 0.9, "reportStyle": "digest" } }
```

「玩家省時間，換取固定折扣」：AI 委任、自動開寶、學府自動培育、任務牆加速都用這個旗標。自動解算在伺服器側逐步執行（每一步照常走 `settle` 與獎勵），結果合併成一份摘要報表回傳；折扣與效率由設定決定，客戶端不可自報。確定性亂數與步數存伺服器側存檔（先存後顯示），重進可自愈。

## 4. 共用 API（介面草案，引擎中立）

```ts
interface IQuestService {
  board(q: BoardQuery): QuestBoardView;                            // 任務牆／清單投影（含情報分層顯示）
  accept(defId: string, owner: HolderRef): QuestResult<QuestInstance>;   // 檢查 acceptWhen，建實例，必要時鎖成本
  recon(qid: string): QuestResult<ReconInfo>;                      // 情報再探（dispatch 型）
  dispatch(qid: string, generalIds: string[]): QuestResult<QuestInstance>;
  report(event: GameEvent): void;                                  // 事件推進 progress 型（戰勝、購買…）
  settle(qid: string): QuestResult<SettleOutcome>;                 // 判成敗→呼叫 IRewardService→回成敗與獎勵 grantId
  abandon(qid: string): QuestResult<void>;
  tick(season: number): TickResult;                                // 季推進：到期、衍生、重置
}
interface IQuestSolverRegistry { register(kind: string, solver: QuestSolver): void; }   // dispatch／progress／choice／timer／自訂
interface IConditionEvaluator { eval(cond: Condition, ctx: unknown): boolean; }          // 與商店、劇情、技能共用
```

規則：
1. 結算只輸出成敗等級與獎勵引用；**獎勵與懲罰一律呼叫獎勵系統**，任務不自己加減資源。
2. 擲骰使用伺服器端亂數（單機＝本機 adapter），結果可重現（沿用 `MissionRng`）。
3. `report(event)` 只接受伺服器端事件匯流排送來的事件，客戶端不可自報「我打贏了」（戰場結果由戰場結算命令核驗後才轉成事件）。
4. 任務定義擴充新解法只需註冊 solver，不改框架。

## 5. 各包裝如何只用差異設定接入

1. **大廳任務牆（派遣型）**：`solver=dispatch`，現有 `assets/resources/data/missions/**/*.json` 就是 `quest-def.v1` 的原型；任務牆版面與可見性過濾（doc_spec_0453）屬 `board` 投影。
2. **極限任務**：`solver=dispatch` 或 `choice`，`reset.period=week`、每週 3 次，成功呼叫獎池 `POOL_EXTREME_TASK`（40／30／20／10）；週次輪替關卡用 `timing` 的週索引。對應 `ExtremeTaskBoard／ExtremeTaskDrop`。
3. **領地治理（農、商、外交、軍備、偵察）**：五個 `solver=timer`／`dispatch` 任務，產出為獎勵固定套件（糧、金、聲望、兵）；委任 AI 就是「由系統代接代派」。對應 `DomesticTasks`（doc_spec_0500）。
4. **季度通行證與成就**：`solver=progress`，目標為事件計數、`reset.period=season`；通行證的雙軌獎勵是兩個獎勵套件。對應 doc_spec_0627、0582。
5. **學府修業目標與結業評級**：`solver=progress`（回合進度）＋`outcome` 對應評級獎勵；打斷彈窗由劇情演出播放。對應 doc_spec_1179。
6. **子嗣歷練格子事件**：每個格子事件是一張 `solver=choice` 的即時任務，選項→獎勵；對應 doc_spec_1180。
7. **幕府家業（9199）**：家業目標與季度產出任務為 `progress`／`timer`，結算交獎勵固定套件（目標為公庫）。

## 6. 與其他框架的依賴

- 依賴 **獎勵**（成敗後的獎懲，必須）、**物品庫存**（物品條件、成本扣除經 `apply`）、**劇情演出**（任務劇情、打斷彈窗，經事件觸發）。
- 依賴 **人員占用登記**（若總綱 Q-B 通過）：派遣前檢查武將是否忙碌、派遣時登記占用；占用互斥矩陣見家業規格 doc_spec_1181 第 10 章。
- 被 **劇情**（選項接任務）、**商店**（限時商店任務）、**獎勵**（`spawn` 效果）呼叫。
- 條件判斷與商店、技能、劇情共用 `IConditionEvaluator`。

## 7. 現有程式盤點與遷移建議

| 現有實作 | 位置 | 可否抽成 base | 說明 |
|---|---|---|---|
| 牆任務舊循環 | `core/systems/HallMissionLoop.ts`、`HallMissionData.ts`、`DispatchJobs.ts`、`DispatchCatalog.ts`、`GovernanceAssignment.ts`、`MissionSave.ts` | 家業規格 doc_spec_1181 §3.1 指出「`HallMissionLoop` 的接取、派人、到期結算、記錄可抽」；本書建議抽取來源改為下一列的新核心，`HallMissionLoop` 與派遣各有一套佔用與結算，遷移後合併 | 派遣與指派的佔用檢查交人員占用登記（總綱 11.2 候選 A） |
| 通用任務核心 | `assets/scripts/core/mission/`（`MissionTypes／Resolver／Balance／Branch／Intel／Fitness／Spawn／Save／Loader／Rng`；PROG-2-9144） | **可直接成為 base**：已是引擎中立、定義用 JSON | `dispatch` 解法的完整實作；需補 `progress`／`choice`／`timer` 解法與條件語言 |
| 任務服務介面 | `core/mission/service/IMissionService.ts`、`OfflineMissionService.ts`、`MissionPorts.ts` | 可，已是 adapter 型態 | `IMissionService` 即 `IQuestService` 的前身；Offline 版＝本機 adapter |
| 任務資料 | `assets/resources/data/missions/**`、`mission-boards.json`、`mission-themes.json`、`mission-balance.json`、`mission-index.json` | 直接沿用 | 即 `quest-def.v1` 資料 |
| 大廳任務舊系統 | `core/systems/HallMission*.ts`（Board／Generator／Dispatch／Loop／Rules／Data）、`HallTaskIntel.ts`；`hall-mission-templates.json` | 舊系統，由 `convert-hall-templates.js` 已轉為新定義 | 遷移完成後刪除重複，不再並行 |
| 領地治理（注意資源命名為 `food／gold`，任務核心為 `grain／silver`，統一見庫存書 3.5） | `core/systems/DomesticTasks.ts`、`GovernanceEfficiencyItem.ts` | 可，資料表進定義 | 五類任務與產出表 |
| 極限任務 | `ExtremeTaskBoard.ts`、`ExtremeTaskDrop.ts`、`ui/core/ExtremeTaskPanelController.ts` | 可 | 週次、次數、掉落分別進 `reset`、`outcome`、獎池 |
| 成就／傳承／里程碑 | `LegacyAchievement.ts`、`MilestoneRewards.ts` | 可，`progress` 型 | 計數＋門檻＋領取 |
| 事件系統 | `EventSystem.ts`、`JournalEvents.ts`、`NurtureEvents.ts`、`RelationEvents.ts`、`SeasonPersonalityEvents.ts` 等 | 部分：事件匯流排可作 `report(event)` 的來源；事件本身多屬劇情 | 見劇情書 |
| 任務牆 UI | `ui/components/LobbyMissionDetailDialogComposite.ts`、`ui/core/HallMissionDialogState.ts` | 共用任務清單面板 | 換成讀 `board` |

遷移順序：(1) 以現有任務核心為 base，補 `IConditionEvaluator` 與 `progress` 解法；(2) 任務結算的「效果帳本」改接獎勵系統（`MissionEffect` 種類即獎勵效果種類）；(3) 極限任務、領地治理改為定義＋獎池；(4) 成就、通行證改 `progress`；(5) 舊 `HallMission*` 退場。

## 8. 實作卡拆分建議（API 層排第一張，本框架 base 排第二張）

0. **前置 API-BASE**（總綱第 9 章第 1 張）。
1. **QST-BASE**：`quest-def.v1／quest-instance.v1` 型別，`IQuestService`，把現有任務核心整理成 `dispatch` solver，補 `progress` solver 與條件評估（純邏輯＋測試），結算接獎勵介面（假實作）。
2. 任務服務命令化（`quest.*` 命令，本機 adapter）。
3. 極限任務、領地治理遷移。
4. 成就與通行證（progress）。
5. choice／timer solver（歷練格子、學府目標）。
6. 舊 `HallMission*` 清理。

## 9. 驗收重點

- 新增一種任務只需一份 JSON（必要時註冊一個 solver），不新增結算程式。
- 結算不直接加減任何資源，全部經獎勵系統。
- 同一任務重複送出結算（重送）只結算一次。

## 10. 待使用者決定的大方向（推薦項為第一個）

- **Q1 條件語言是否獨立成共用框架？** A（推薦）獨立成「條件與表達式」框架（總綱候選），任務、商店、劇情、技能共用；B 先在任務框架內做，之後再抽出；C 各框架各自寫條件。
- **Q2 成就與通行證是否併入任務框架？** A（推薦）併入，作為 `progress` 型任務；B 另立「進度與里程碑」框架。
- **Q3 現有 `HallMission*` 舊系統退場時機：** A（推薦）新核心涵蓋全部資料後一次移除；B 保留兩套一段時間；C 立即移除。
- **Q4 任務失敗與災難的懲罰強度預設（涉及核心體驗）：** A（推薦）沿用現行 `riskMul` 與上限規則，不新增永久性懲罰；B 加入永久後果（如武將受傷長期）；C 去除懲罰只留獎勵差。
- **Q5 AI 委任可代接的任務範圍：** A（推薦）只限領地治理與日常任務，極限任務不可委任；B 全部可委任；C 全部不可委任。

## 11. 伺服器 API

> 共通封包、冪等、權威、同步、存檔原則見 `共用框架總綱規格書.md (doc_spec_1182)` 第 5 章；本章只列任務端點。

### 11.1 命令與查詢

| 名稱 | 類型 | 說明 |
|---|---|---|
| `quest.board` | 查詢 | 任務牆（已依情報分層遮蔽文字與機率） |
| `quest.detail` | 查詢 | 單一任務詳情 |
| `quest.accept` | 命令（需 idemKey） | 接取（伺服器核對 `acceptWhen`、鎖成本） |
| `quest.recon` | 命令（需 idemKey） | 情報再探（消耗行動／資源） |
| `quest.dispatch` | 命令（需 idemKey） | 派遣武將；伺服器鎖定成本與武將狀態 |
| `quest.settle` | 命令（需 idemKey） | 結算（派遣型到期後；計數型達標後領取） |
| `quest.abandon` | 命令 | 放棄 |
| `quest.choose` | 命令（需 idemKey） | choice 型任務送出選項 |

戰場與其他系統達成目標的事件由伺服器內部匯流排產生，**無客戶端 `quest.report` 命令**。

### 11.2 Schema

```json
// quest.dispatch 請求 args
{ "qid": "q_000231", "generalIds": ["g_zhugeliang"] }
// quest.settle 回應 result
{ "qid": "q_000231", "tier": "success", "narrative": "…", "grantId": "gr_0007",
  "spawned": [], "reward": { "settled": true } }
```

### 11.3 伺服器權威欄位

任務實例的產生與到期、接取資格判定、成本鎖定、適合度與成功率、擲骰與成敗等級、進度計數、衍生任務、獎勵內容。客戶端傳入 `tier／progress／result` → `E103`。

### 11.4 錯誤碼（E4xx）

| 碼 | reason | 說明 |
|---|---|---|
| E401 | `NOT_AVAILABLE` | 任務不存在、已被取走或已過期 |
| E402 | `CONDITION_UNMET` | 接取條件未達 |
| E403 | `SHORTAGE` | 資源不足（附 need／have） |
| E404 | `GENERAL_BUSY` | 武將不可用（受傷、被擒、已派遣） |
| E405 | `BAD_SLOT` | 派遣人數或武將不符需求 |
| E406 | `NOT_READY` | 尚未到可結算時間／目標未達 |
| E407 | `ALREADY_SETTLED` | 已結算（重送冪等命中時回原結果） |
| E408 | `INVALID_CHOICE` | 選項不存在 |

沿用現有 `MissionErrorCode` 字串作為 `reason`。

### 11.5 推送事件

`quest.board.changed`（新任務、到期）、`quest.progress`（計數型進度）、`quest.ready`（派遣完成可結算）、`quest.settled`（含 tier 與 grantId）、`quest.spawned`。

### 11.6 遷移與相容

- `IMissionService` 的方法與 `MissionResult<T>`（附 `revision`、`ledger`、`events`）直接對映本章回應的 `saveRev`／`delta`／`events`；`OfflineMissionService` 搬為本機 adapter 的任務模組，DTO 不變。
- 任務存檔（`MissionSave`）納入伺服器側存檔，舊檔缺欄位補預設。
