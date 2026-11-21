# 任務系統Base框架規格書（分片索引） — 1–3 目的、核心概念、共用資料結構

> 這是 `任務系統Base框架規格書.md` 的「1–3 目的、核心概念、共用資料結構」分片。完整索引見 `docs/遊戲規格文件/系統規格書/任務系統Base框架規格書.md`。

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
