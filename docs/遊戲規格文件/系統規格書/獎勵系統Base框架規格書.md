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

## 4. 共用 API（介面草案）

```ts
interface IRewardService {
  // 內容層
  roll(poolId: string, ctx: RewardCtx, rng: RandomSource): GrantPlan;          // 抽出結果（含保底推進）
  fixed(bundleId: string, ctx: RewardCtx): GrantPlan;                          // 固定獎／懲罰
  scale(plan: GrantPlan, mul: { reward?: number; risk?: number }): GrantPlan;  // 等階與倍率縮放（沿用任務 rewardMul／riskMul）
  // 結算層
  settle(plan: GrantPlan, target: HolderRef): SettleResult;                    // 先入帳：道具→IItemStore.apply，其餘→宿主 handler；原子
  // 演出層
  present(plan: GrantPlan, override?: PresentationBinding): Promise<void>;     // 轉交演出系統播放；可跳過
}
interface IEffectHandlerRegistry { register(kind: string, h: (e: ResolvedEffect, ctx: RewardCtx) => EffectResult): void; }
interface IPresentationRegistry  { register(type: string, module: GrantPresentationModule): void; }  // 擴充新演出
```

規則：
1. **先結算、後演出**：`settle` 成功才算給獎，演出只是回放已定結果；演出被跳過、中斷、閃退重進，帳目都不變。
2. 抽取必須可重現：隨機源由呼叫端傳入（戰場用戰場種子，本機用存檔種子），保底計數器存存檔。
3. 道具類效果一律進 `IItemStore.apply`，帶 `source=REWARD`、`sourceRef=poolId`。
4. 容量不足時依物品庫存的 `overflow` 規則處置（預設轉信箱），不得丟棄獎勵。
5. 懲罰上限（例如單次不可扣超過某比例）由 `reward-bundle` 的 `cap` 欄位宣告，帳本截斷時記入 trace。
6. 演出類型缺少實作時退回 `instant`，並寫 error log，不得吞掉獎勵。

## 5. 各包裝如何只用差異設定接入

1. **任務結算（成敗四級）**：任務定義只寫「成敗樹」與各級對應的 `bundleId`／`poolId`（如 critical→`POOL_*_CRIT`、disaster→`BUNDLE_*_FAIL`），結算時呼叫 `fixed／roll`＋`scale`。現有任務核心的 `MissionEffect` 帳本與 rewardMul／riskMul 就是本系統效果帳本的前身。
2. **極限任務掉落**：一份 `reward-pool`，權重 40／30／20／10（銅錢、高粱、戰法筆記、活力丹），`presentation=chest`。對應既有 `ExtremeTaskDrop`。
3. **歷練四路大富翁（子嗣十歲歷練 doc_spec_1180，9198 修訂）**：格子事件呼叫 `roll`；「自動走寶路、連續開寶」＝ `presentation.type=treasureRoad`，路徑長度與每格獎池寫在設定，格子本身不寫獎勵邏輯。
4. **轉蛋**：獎池＝卡池（SSR 3%、SR 10%、R 87%，UP 佔比 70%／80%），保底＝小保底 50／大保底 200，`presentation=gachaReveal`；扣款走商店。見 Q1。
5. **戰場戰利品與成就里程碑**：戰後一次性原子結算 (doc_spec_0603) 即 `settle` 的原子特性；里程碑獎（現有 `MilestoneRewards`、`LegacyAchievement` 的高級貨幣 100）改為 `fixed` 套件。
6. **幕府家業產出（9199）**：每季產出 `fixed` 套件，目標持有者為公庫。
7. **藏寶圖／骰子／轉盤（新活動）**：只新增 `grant-presentation` 設定與一個演出模組；獎池內容沿用現有獎池，不新增獎勵程式。

## 6. 與其他框架的依賴

- 依賴 **物品庫存**（入帳）與 **劇情（演出）**（播放給獎演出）。
- 被 **任務、商店、轉蛋、歷練、家業、戰場、劇情選項** 呼叫。
- 與 **技能**：`tacticLearn` 效果交技能系統學習判定（保底金戰法、TP 門檻仍由技能系統判定）。

## 7. 現有程式盤點與遷移建議

| 現有實作 | 位置 | 可否抽成 base | 說明 |
|---|---|---|---|
| 任務效果帳本、rewardMul／riskMul、成敗四級 | `core/mission/MissionTypes.ts`、`MissionResolver.ts`、`MissionBalance.ts` | 可，效果種類與帳本直接成為 `EffectLedger` | 任務核心（PROG-2-9144）已把「宿主逐項套用帳本」做好，是最成熟的前身 |
| 極限任務掉落 | `core/systems/ExtremeTaskDrop.ts` | 可，標準加權獎池 | `EXTREME_TASK_DROP_WEIGHTS` 直接轉 JSON |
| 轉蛋抽取與保底 | `core/systems/GachaDraw.ts`、`GachaSystem.ts`、`GachaLocalRules.ts` | 可抽出「加權＋保底」引擎；轉蛋專屬規則留設定／插件 | 見 Q1 |
| 里程碑與傳承獎 | `core/systems/MilestoneRewards.ts`、`LegacyAchievement.ts` | 可，改為固定套件 | |
| 戰場戰利品結算 | `core/systems/BattleAftermath.ts`、`StageSalvageSettlement.ts`（規格 doc_spec_0603） | 可 | 原子入庫對應 `settle` |
| 禮包與通行證發獎 | `core/systems/GiftBundle.ts`、`SeasonPass.ts`；`HallMissionLoop` 內的發獎 | 可，固定套件 | 家業規格 doc_spec_1181 §3.1 同樣指出：獎池、掉落、發獎、保底分散各處，沒有統一給獎演出與懲罰 |
| 俘虜搜繳傳家寶 | doc_spec_0429 規格 | 可，獎池＋條件 | |
| 許願池 | `core/systems/WishPool.ts` | 部分 | 免費許願軌屬獎勵＋保底 |
| 演出 | 轉蛋演出 `ui/core/GachaFullScreenPanel.ts`、`GachaFlowCoordinator.ts`、學府開獎 toast（`LobbyScene.showAcademyInheritDraw`） | 轉為演出模組 | 目前各畫面自帶演出，沒有共用「給獎演出」介面 |

遷移順序：(1) 先做 `IRewardService` 的內容層（獎池、固定套件、效果帳本），任務核心帳本直接接上；(2) `ExtremeTaskDrop` 改讀獎池；(3) 結算層接物品庫存；(4) 演出層介面與 `instant`／`chest` 兩個模組；(5) 轉蛋依 Q1 裁決再接；(6) 新演出（藏寶圖、骰子、轉盤、寶路）逐一加模組。

## 8. 實作卡拆分建議（API 層排第一張，本框架 base 排第二張）

0. **前置 API-BASE**（總綱第 9 章第 1 張）：共通 API 層＋本機伺服器 adapter＋存檔走 API。本框架所有卡依賴它。
1. **RWD-BASE**：`reward-pool／reward-bundle` 型別、加權抽取＋保底、效果帳本、`settle`（先以假的物品庫存介面）＋單元測試。
2. 任務核心帳本接入（`MissionEffect`→效果帳本）。
3. 極限任務、里程碑改走獎池／套件。
4. 演出綁定介面與 `instant`、`chest` 模組（與演出系統 base 同步）。
5. 新演出模組：`treasureRoad`（歷練 9198）、`treasureMap`、`dice`、`wheel`。
6. 轉蛋接入（依 Q1）。
7. 家業產出接入（待 9199）。

## 9. 驗收重點

- 新增一種獎池或獎勵套件只改 JSON；新增一種給獎演出只加一個演出模組，不動獎池。
- 同一組種子與保底計數，重現同一結果。
- 演出被跳過或中斷，帳目與已入庫物品不變。
- 懲罰與獎勵走同一帳本，截斷與縮放有 trace。

## 10. 待使用者決定的大方向（推薦項為第一個）

- **Q1 轉蛋與獎勵系統的關係（請使用者裁決，本書不自行定案）：**
  A（推薦）轉蛋 = 獎勵系統的一種：共用獎池／保底引擎，轉蛋專屬規則（雙重保底、同名轉換、單鍵十連、UP 佔比）以獎池設定欄位與插件表達，扣款由商店包裝，演出用 `gachaReveal`；既有「轉蛋統一系統（所有轉蛋為同一系統的一池）」的原則保持，只是底層改接 base。
  B 轉蛋另成獨立系統：只借用獎池的加權函式，保底、記帳、卡池 UI 維持現狀，不納入獎勵框架。
  C 折衷：先維持 B，等獎勵 base 穩定且新玩法（寶路、藏寶圖）上線後再遷移為 A。
- **Q2 給獎預設演出：** A（推薦）預設 `instant`，高等階才自動升級為 `chest`；B 一律 `chest`；C 由玩家設定跳過與否。
- **Q3 保底計數是否跨獎池共用？** A（推薦）每個獎池各自計數；B 同類型共用；C 全域共用。
- **Q4 懲罰是否可被道具或特質減免？** A（推薦）可，以 `riskMul` 倍率表達（沿用任務現況）；B 不可減免；C 僅特定懲罰可減免。
- **Q5 付費抽取類演出（寶箱、轉盤）的機率公開方式（商業化）：** A（推薦）介面常駐顯示各等階機率；B 僅顯示說明頁；C 不顯示。

## 11. 伺服器 API

> 共通封包、冪等、權威、同步、存檔原則見 `共用框架總綱規格書.md (doc_spec_1182)` 第 5 章；本章只列獎勵端點。獎勵是最需要伺服器權威的框架：抽取、保底、發放都在伺服器（單機＝本機伺服器 adapter）。

### 11.1 命令與查詢

| 名稱 | 類型 | 說明 |
|---|---|---|
| `reward.pools` | 查詢 | 可見獎池與機率說明（等階機率公開用） |
| `reward.pity` | 查詢 | 某獎池保底進度（只回進度，不回亂數種子） |
| `reward.draw` | 命令（需 idemKey） | 對指定獎池抽取並入帳；由伺服器產生 `GrantPlan`、結算、回傳結果與演出參數 |
| `reward.claim` | 命令（需 idemKey） | 領取固定獎勵套件（里程碑、家業產出、任務獎）；以「已領取」標記防重 |
| `reward.settleBattle` | 命令（需 idemKey） | 戰後結算；客戶端上報戰場事件摘要，伺服器核驗後發放戰利品 |
| `reward.ack` | 命令（clientOwned） | 回報演出已播放（僅用於「未讀獎勵」標記，不影響入帳） |

懲罰沒有獨立命令：由任務結算、劇情選項等其他命令的副作用呼叫 `fixed(penalty)`。

### 11.2 Schema

```json
// reward.draw 請求 args
{ "poolId": "POOL_EXTREME_TASK", "count": 1, "source": { "kind": "quest", "ref": "EXTREME_LU_BU" } }
// 回應 result（結果已入帳，演出只是回放）
{ "grantId": "gr_0001",
  "plan": [ { "entryId": "e3", "tier": "SR", "effect": { "kind": "item", "itemId": "ITEM_TACTIC_NOTE", "qty": 1 } } ],
  "settled": true,
  "overflow": [],
  "presentation": { "type": "chest", "args": { "skin": "wood" }, "skippable": true },
  "pity": { "counterKey": "extreme.pity", "count": 12, "hardAt": 50 } }
```

`reward.draw` 的 `poolId` 必須是「呼叫端有權抽」的獎池：伺服器依來源（任務、商店成交、格子事件）核對憑證（如 `source.ref` 對應的已完成任務、已付款的 `dealId`），客戶端不可憑空抽任意獎池。

### 11.3 伺服器權威欄位

抽取結果、保底計數與推進、等階判定、縮放後數量、入帳與溢出處理、懲罰截斷、演出類型（可由客戶端的畫面設定降級為 `instant`，但不可改結果）。客戶端傳入 `plan／tier／qty` → `E103`。

### 11.4 錯誤碼（E5xx）

| 碼 | reason | 說明 |
|---|---|---|
| E501 | `POOL_NOT_FOUND` | 獎池不存在 |
| E502 | `POOL_CLOSED` | 獎池未開放或已過期 |
| E503 | `NO_TICKET` | 無抽取憑證（任務未完成、未付款、次數用盡） |
| E504 | `ALREADY_CLAIMED` | 已領取 |
| E505 | `INVALID_COUNT` | 抽取數量非法 |
| E506 | `PRESENTATION_UNSUPPORTED` | 演出類型不支援（已退回 instant，仍視為成功時不報錯，僅記 log） |
| E507 | `BATTLE_REPORT_REJECTED` | 戰場上報核驗失敗 |
| E508 | `SETTLE_ROLLBACK` | 入帳失敗，整筆回滾（附 E3xx 原因） |

### 11.5 推送事件

`reward.granted`（獎勵到帳，附 `grantId`、演出參數）、`reward.pity.changed`、`reward.pending`（離線期間累積的未播放獎勵，登入時補播）。

### 11.6 遷移與相容

- 轉蛋現行 `GachaApi`（`GACHA_API_VERSION=1`，路由 `/gacha/pools｜wallet｜pull｜history`）的 DTO 與錯誤碼保留為 `reward.draw`（轉蛋卡池）的 args／result 與 `reason`；是否整併由 Q1 決定，**在 Q1 裁決前，`GachaApi` 維持現狀並行**，只把其本機實作搬進本機伺服器 adapter。
- `GachaSyncRecord`（doc_spec_0469）作為 `reward.draw` 的同步記錄格式。
- 離線補播：登入時伺服器回傳未播放的 `reward.pending`，客戶端依序播放演出，帳目早已入帳。
