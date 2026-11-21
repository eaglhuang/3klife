# 獎勵系統Base框架規格書（分片索引） — 1–3 目的、核心概念、共用資料結構

> 這是 `獎勵系統Base框架規格書.md` 的「1–3 目的、核心概念、共用資料結構」分片。完整索引見 `docs/遊戲規格文件/系統規格書/獎勵系統Base框架規格書.md`。

<!-- doc_id: doc_spec_1186 -->
# 獎勵系統 Base 框架規格書

> 上層總綱：`共用框架總綱規格書.md (doc_spec_1182)`。本書是六套共用框架之一。
> 相關框架：物品庫存 (doc_spec_1184，產出物入庫)、買賣商店 (doc_spec_1183)、任務 (doc_spec_1185，任務只負責結算勝敗，獎懲交本系統)、技能 (doc_spec_1187，習得戰法也是一種獎勵)、劇情（演出）(doc_spec_1188，給獎演出由演出系統播放)。
> 伺服器 API 與網路原則見總綱第 5 章（本書第 11 章只列本框架端點與 schema，不重複原則）。
> 任務卡：PROG-2-9200（文件）。狀態：草案，待使用者裁決第 10 節選擇題。

## 1. 目的與範圍

使用者原話：「給獎的方式很多種：開寶箱、給藏寶圖去挖、給你色子去骰、轉輪圓盤……很多種。」因此獎勵系統分成兩層，彼此分開、各自可插拔：

1. **獎勵內容層**：決定「給什麼」——獎池、權重、保底、等階、固定獎、懲罰。產出物一律交物品庫存（道具類）或宿主 handler（非道具類，如經驗、聲望、狀態）。
2. **給獎演出層**：決定「怎麼給」——寶箱、藏寶圖挖寶、骰子、轉盤、自動走寶路連續開寶等。**演出層只決定「用哪種演出」，播放由劇情（演出）系統負責**（見 doc_spec_1188）。

分工一句話：**獎勵系統決定給什麼、用哪種演出；演出系統負責播放；物品庫存系統負責入帳。**

懲罰結算也在本系統：扣資源、傷兵、被擒、降聲望、失去物品、負面狀態，與獎勵共用同一套「效果帳本」，只是數量為負或型別為負面。

任何系統都可呼叫：任務結算、商店（寶箱商品）、轉蛋、歷練格子、家業產出、活動、戰場戰利品、成就里程碑、劇情選項。

## 2. 核心概念與名詞

- **獎勵項（RewardEntry）**：一個效果，如「道具×2」「銅錢+300」「聲望+5」「習得戰法」「傷兵 2 季」。
- **獎池（RewardPool）**：一組帶權重的獎勵項，可附保底與等階。
- **等階（Tier）**：獎勵品質層級（如 N／R／SR／SSR，或成功四級 critical／success／fail／disaster），決定從哪個獎池抽。
- **保底（Pity）**：累積計數器，到門檻必出指定等階；可有小保底與大保底（沿用轉蛋雙重保底）。
- **給獎方案（GrantPlan）**：本次要給的完整內容（已抽定結果＋所選演出），先結算再演出，避免演出中斷造成帳目不一致。
- **演出綁定（PresentationBinding）**：獎池或呼叫端指定的演出種類與參數，如 `chest`、`treasureMap`、`dice`、`wheel`、`treasureRoad`。
- **效果帳本（EffectLedger）**：結算後的有序效果清單，宿主逐項套用；道具類走物品庫存 `apply`。

## 3. 共用資料結構（設定 JSON 草案）

### 3.1 獎池 `reward-pool.v1`

```json
{
  "schema": "reward-pool.v1",
  "id": "POOL_EXTREME_TASK",
  "draw": { "mode": "weighted", "picks": 1, "replacement": true },
  "tiers": ["N", "R", "SR", "SSR"],
  "entries": [
    { "id": "e1", "weight": 40, "tier": "N",  "effect": { "kind": "currency", "id": "bronze", "amount": { "min": 100, "max": 500 } } },
    { "id": "e2", "weight": 30, "tier": "R",  "effect": { "kind": "item", "itemId": "ITEM_SORGHUM", "qty": 1 } },
    { "id": "e3", "weight": 20, "tier": "SR", "effect": { "kind": "item", "itemId": "ITEM_TACTIC_NOTE", "qty": 1 } },
    { "id": "e4", "weight": 10, "tier": "SSR","effect": { "kind": "item", "itemId": "ITEM_VITALITY_PILL", "qty": 1 } }
  ],
  "pity": { "counterKey": "extreme.pity", "soft": null, "hard": { "count": 50, "guaranteeTier": "SSR" } },
  "presentation": { "type": "chest", "args": { "skin": "wood" } }
}
```

### 3.2 固定獎與懲罰 `reward-bundle.v1`

```json
{
  "schema": "reward-bundle.v1",
  "id": "BUNDLE_MISSION_FAIL_FAMINE",
  "kind": "penalty",
  "effects": [
    { "kind": "resource", "res": "grain", "amount": -200 },
    { "kind": "fame", "amount": -3 },
    { "kind": "generalState", "state": "injured", "seasons": 1 }
  ],
  "presentation": null
}
```

### 3.3 效果種類（沿用任務核心的帳本種類並擴充）

`item`、`currency`、`resource`、`generalExp`、`fame`、`officerExp`、`relation`、`generalState`、`trait`、`flag`、`spawn`（觸發新任務）、`unlock`、`tacticLearn`（習得技能，交技能系統）、`story`（觸發劇情，交演出系統）、`morale`、`memoryNote`。新增種類只需註冊宿主 handler，不改框架。

### 3.4 演出綁定 `grant-presentation.v1`

```json
{
  "schema": "grant-presentation.v1",
  "type": "treasureMap",
  "args": { "mapId": "MAP_WEI_01", "digSpots": 3, "revealOrder": "random" },
  "skippable": true,
  "autoPlay": false
}
```

演出類型表（可插拔，每種對應演出系統的一個「演出模組」）：

| type | 玩家看到 | 資料需求 |
|---|---|---|
| `instant` | 直接跳出獎勵清單（預設，最省） | 無 |
| `chest` | 開寶箱，逐件揭示 | 箱皮膚、揭示順序 |
| `treasureMap` | 拿到藏寶圖，選點挖寶 | 地圖、挖點數、每點對應獎池 |
| `dice` | 擲骰決定點數，點數對應檔位 | 骰數、點數→檔位表 |
| `wheel` | 轉盤，指針停在哪給哪 | 扇區與權重（需與獎池一致） |
| `treasureRoad` | 自動走寶路，連續開寶（歷練 9198） | 路徑長度、每格獎池、自動速度 |
| `gachaReveal` | 轉蛋抽卡演出（單抽／十連） | 稀有度光效、跳過 |

### 3.5 加權表與確定性亂數（歸入獎勵系統與共通底層）

- **加權表（WeightedTable）**：`reward-pool.v1` 的 `entries[].weight` 就是加權表；命名建議、心願、商店輪替、出生禮、機緣格等「抽一個」需求都呼叫同一個純函式 `weightedPick(table, rng)`（共通底層工具層，總綱 Q-A），並支援保底與去重。
- **確定性亂數工作階段（DeterministicRngSession）**：`rngSession = { seedHex, stepIndex }`，每次抽取 `stepIndex+1`，同一 `(seedHex, stepIndex)` 必得同一結果。**種子與步數只存在伺服器側存檔（本機模式＝本機伺服器 adapter 的存檔），不下發客戶端**；回應只含結果與演出參數。
- **先存後顯示**：伺服器先把 `stepIndex` 與結果寫入存檔，再回應；重送同一 `idemKey` 回原結果，不再前進 `stepIndex`；斷線重進讀回已存結果補播演出（即防 SL 與重開自愈）。連續異常退出的保底懲罰由 `reward-bundle` 的 `penalty` 表達。
- 與總綱 5.4、5.5、5.11 一致：抽獎結果由伺服器權威，客戶端不可預知、不可重抽。
