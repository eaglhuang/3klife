<!-- doc_id: doc_spec_1184 -->
# 物品庫存系統 Base 框架規格書

> 上層總綱：`共用框架總綱規格書.md (doc_spec_1182)`。本書是六套共用框架之一，所有「持有物品」的玩法一律走本框架，只做包裝與差異設定。
> 相關框架：買賣商店 (doc_spec_1183)、任務 (doc_spec_1185)、獎勵 (doc_spec_1186)、技能 (doc_spec_1187)、劇情 (doc_spec_1188)。
> 伺服器 API 與網路原則見總綱第 5 章（本書第 11 章只列本框架端點與 schema，不重複原則）。
> 任務卡：PROG-2-9200（文件）。狀態：草案，待使用者裁決第 10 節選擇題。

## 1. 目的與範圍

使用者定案：各種功能道具、寶物（傳家寶）、裝備都是「有庫存觀念的物品系統」，必須共用一套；持有者不同只是名稱不同。

| 持有者 | 玩家看到的名稱 | 例子 |
|---|---|---|
| 武將個人 | 背包 | 武將六槽裝備、隨身消耗品 |
| 家（主城／家宅） | 庫房 | 主城倉庫、傳家寶、材料 |
| 幕府 | 公庫 | 幕府公有道具、軍需（對應幕府家業 PROG-2-9199） |
| 家族 | 倉庫 | 家族共享裝備、世代傳承物 |
| 玩家帳號 | 物品欄 | 求籤令、入學令等帳號級道具 |

範圍內：物品定義、持有者與容器、堆疊、容量上限、綁定、鎖定、期限、移轉、取得與消耗紀錄、庫存查詢與投影視圖。
範圍外：貨幣定價與買賣（歸商店）、掉落權重與抽取（歸獎勵）、物品使用後的效果本體（歸各玩法註冊 handler）。

## 2. 核心概念與名詞

- **物品定義（ItemDef）**：靜態設定，描述「這是什麼」，不含數量。
- **庫存列（StockRow）**：動態資料，描述「誰持有多少、狀態如何」。
- **持有者（Holder）**：`{ kind, id }`，如 `{general, uid}`、`{household, id}`、`{shogunate, id}`、`{clan, id}`、`{player, id}`。
- **容器（Container）**：持有者的一個庫存空間，帶容量規則；同一持有者可有多個容器（如武將的「裝備槽」與「隨身包」）。
- **持有者別名（HolderAlias）**：設定表把持有者種類對映成玩家看到的名稱（背包／庫房／公庫／倉庫），只影響文案，不影響邏輯。
- **交易（Txn）**：所有增減與移轉都是一筆帳本交易，原子結算，失敗整筆回滾。
- **Source／Sink**：取得來源（商店、任務、掉落、事件、分解、系統）與消耗去向（使用、出售、分解、過期）。

## 3. 共用資料結構（設定 JSON 草案）

### 3.1 物品定義 `item-def.v1`

```json
{
  "schema": "item-def.v1",
  "id": "ITEM_ORACLE",
  "kind": "consumable",
  "category": "消耗品",
  "rarity": 2,
  "stack": { "max": 99, "mode": "stackable" },
  "bind": "none",
  "tags": ["占卜", "每季發放"],
  "expiry": { "type": "none" },
  "useEffect": { "effectType": "grantFreeDivination", "value": 1 },
  "slot": null,
  "display": { "nameKey": "item.ITEM_ORACLE.name", "iconKey": "icon_oracle", "bucket": "GENERAL_BAG" }
}
```

- `kind`：`consumable`／`material`／`special`／`currency`／`equipment`／`treasure`（寶物／傳家寶）／`card`（英靈卡、虎符，沿用既有 `InventoryItemType`）。
- `stack.mode`：`stackable`（同 id 疊加）／`unique`（每件獨立一列，裝備、寶物用）。
- `bind`：`none`／`onAcquire`／`onEquip`／`general`（綁定武將）／`household`（不可離家，傳家寶用）。
- `expiry`：`none`／`absolute`（絕對時間）／`relative`（取得後 N 季或 N 小時）。
- `slot`：裝備槽位（`WEAPON`／`ARMOR`／`ACCESSORY`／`MOUNT`／`TOME`／`TREASURE`），非裝備為 null。

### 3.2 容器規則 `container-rule.v1`

```json
{
  "schema": "container-rule.v1",
  "holderKind": "household",
  "aliasKey": "holder.household.name",
  "containers": [
    { "id": "main",
      "capacity": { "base": 50, "expandStep": 20, "max": 200, "expandCost": [50, 100, 200] },
      "accepts": ["consumable", "material", "equipment", "treasure"],
      "grantCap": null,
      "overflow": "reject" }
  ]
}
```

- `overflow`：`reject`（拒收）／`toMail`（轉信箱）／`autoSell`（自動換價）／`toHolder:<id>`（轉其他持有者，如退役武將裝備回庫）。
- `capacity.max` 為 null 表示無上限。`grantCap` 為「免費發放持有上限」（例：求籤令 5）。

### 3.3 庫存列 `stock-row.v1`（沿用並泛化現有 `InventoryRecord`）

```json
{
  "rowId": "inv_000123", "itemId": "GEAR_SWORD_01",
  "holder": { "kind": "general", "id": "g_guanyu" }, "container": "equip",
  "quantity": 1, "quality": "SSR", "boundTo": "g_guanyu",
  "locked": false, "expiresAt": null, "attrs": {},
  "acquiredAt": 1763650000000, "source": "DROP"
}
```

### 3.4 帳本交易 `item-txn.v1`

```json
{
  "txnId": "t_20261120_0001", "atomic": true,
  "ops": [
    { "op": "add", "holder": {"kind":"household","id":"h1"}, "itemId": "ITEM_ORACLE", "qty": 3, "source": "TASK", "sourceRef": "DOM_EASY_02" },
    { "op": "consume", "holder": {"kind":"player","id":"p1"}, "itemId": "ITEM_TRIAL_TICKET", "qty": 1, "sink": "USE" }
  ]
}
```

### 3.5 資源與貨幣命名統一（9199 發現的不一致）

現況：任務核心 `MissionResourceKey`＝`grain／troops／silver`（`core/mission/MissionTypes.ts`，`cost`、`rewards` 也用 `grain／silver`）；領地治理與派遣 `DomesticResource`＝`food／gold／fame／cityTroops`（`DomesticTasks.ts`）。同一種東西兩個名字，轉換散在各處。

統一做法：新增資源定義表 `resource-def.v1`（資源與貨幣型物品的唯一名稱登記）：

```json
{ "schema": "resource-def.v1",
  "resources": [
    { "id": "food",   "nameKey": "res.food",   "kind": "currency", "aliases": ["grain"],  "cap": "holder" },
    { "id": "gold",   "nameKey": "res.gold",   "kind": "currency", "aliases": ["silver"], "cap": "holder" },
    { "id": "troops", "nameKey": "res.troops", "kind": "currency", "aliases": ["cityTroops"], "cap": "holder" },
    { "id": "fame",   "nameKey": "res.fame",   "kind": "currency", "aliases": [], "cap": null }
  ] }
```

- 規範 id 採 `food／gold／troops／fame`（Q-G 推薦；若裁決改 `grain／silver` 只換表）。別名只在**讀取邊界**轉換一次：任務資料載入（`MissionLoader`）、舊存檔載入、舊帳本，轉成規範 id 後，內部一律只見規範 id。
- 遷移方式：(1) 先上 `resource-def` 與 `normalizeResourceId()`（純函式）；(2) 任務資料 JSON 暫不改，載入時轉換；(3) 存檔格式版本加一，舊檔讀入時以別名轉換、寫出時用規範 id；(4) 全部資料與程式遷完後，移除別名（保留載入端別名一個版本以相容舊檔）；(5) `check-api-bypass`（總綱 5.10）加一條：新程式碼不得出現別名字串。
- 單位與上限：持有者的 `container-rule` 可為資源宣告上限（如城市糧倉），與道具容量同一機制。

## 4. 共用 API（介面草案，引擎中立，不 import `cc`）

```ts
interface IItemStore {
  count(holder: HolderRef, itemId: string, container?: string): number;
  canAdd(holder: HolderRef, itemId: string, qty: number): AddCheck;   // 預檢：容量、類型、綁定
  apply(txn: ItemTxn): TxnResult;                                      // 唯一寫入口；原子
  transfer(from: HolderRef, to: HolderRef, rowId: string, qty: number, reason: string): TxnResult;
  query(q: StockQuery): StockRow[];                                    // 持有者／分類／標籤／品質篩選排序
  sweepExpired(nowMs: number): ExpirySweep;                            // 過期清算
  lock(rowId: string, locked: boolean): void;
  expand(holder: HolderRef, container: string): ExpandResult;          // 擴容（扣款走貨幣物品）
}
interface IItemRegistry { get(id: string): ItemDef | null; byTag(tag: string): ItemDef[]; }
interface IItemUseRegistry {                                           // 沿用 ItemEffectDispatcher
  register(effectType: string, handler: ItemEffectHandler): void;
  use(holder: HolderRef, itemId: string, ctx: unknown): ItemUseResult;
}
interface IItemLedger { append(rec: AcquisitionRecord): void; query(q: LedgerQuery): AcquisitionRecord[]; }
```

規則：
1. 所有玩法只能透過 `apply(txn)` 改庫存，不得自行寫庫存欄位。
2. `apply` 失敗（容量、餘額、綁定、鎖定）整筆不生效，回傳原因碼（`FULL`／`NOT_ACCEPTED`／`LOCKED`／`BOUND`／`INSUFFICIENT`）。
3. 每筆成功交易自動寫入取得與消耗紀錄（沿用 `ItemAcquisitionLog` 的 `SHOP／TASK／DROP／EVENT／DECOMPOSE`，擴充 `REWARD／STORY／SYSTEM`）。
4. 讀取走投影視圖（沿用 `deriveInventoryViews`），UI 不直接掃全表。

## 5. 各包裝如何只用差異設定接入

1. **武將背包（六槽裝備）**：持有者 `general`，容器 `equip` 六個固定槽（基礎三槽＋高階三槽），`accepts=[equipment]`，`stack.mode=unique`，`bind=onEquip`。差異僅在 `container-rule` 的槽位列表與解鎖條件。對應既有 `GeneralBackpack`。
2. **主城庫房（傳家寶與材料）**：持有者 `household`，容器 `main` 容量 50 起、每次擴 20、上限 200、擴容價 50／100／200 精元，`overflow=reject`。傳家寶 `kind=treasure`、`bind=household`。對應既有 `WarehouseCapacity`，數值直接搬進設定。
3. **幕府公庫**：持有者 `shogunate`，容器 `treasury`；家業產出（糧草、軍需道具）以 `source=SYSTEM` 呼叫 `apply`，由家業包裝觸發，不另寫庫存。
4. **家族倉庫**：持有者 `clan`，容器 `shared`，`overflow=toMail`；世代傳承物走 `transfer(reason="inherit")`，沿用「退役武將裝備自動回庫與後代繼承轉移」規則 (doc_spec_0427)。
5. **玩家物品欄（求籤令、入學令）**：持有者 `player`，`stackable`，每季發放與免費上限寫進 `grantCap`，取代現有寫死常數 `ORACLE_TOKEN_FREE_CAP`。

## 6. 與其他框架的依賴

- 被依賴：商店（上架商品是 ItemDef，成交呼叫 `apply`）、獎勵（產出物一律交 `apply`）、任務（物品條件）、劇情（選項給物品）、技能（技能書、戰法筆記類道具）。
- 本框架不依賴其他框架。貨幣型物品（銅錢、精元、結義點數）是 `kind=currency` 的 ItemDef，擴容與商店扣款共用同一個 `consume`（見 Q2）。

## 7. 現有程式盤點與遷移建議

| 現有實作 | 位置 | 可否抽成 base | 說明 |
|---|---|---|---|
| 玩家道具表（id→數量） | `core/systems/PlayerInventory.ts` | 可抽，但**目前只有玩家一個持有者、沒有持有者概念，必須補**（家業規格 doc_spec_1181 §3.1 同樣指出） | 成為 player 持有者的最薄實作；`addItem／consumeItem` 對應 `apply` |
| 道具定義 | `core/systems/ItemDef.ts` | 可抽，擴成 `item-def.v1` | 目前只有 id／name／category／rarity（稀有度暫全 1），缺堆疊、綁定、期限；`EquipPageSegments.ts`（裝備頁）亦各自存取 |
| 統一物件庫列 | `InventoryProjection.ts`、`InventoryRecordBridge.ts`、`BagDomain.ts` | 可，已是庫存列雛形 | `InventoryRecord` 已含 Bound_General_UID、expiresAt、isLocked、Display_Bucket，即 `stock-row.v1` 前身 |
| 武將背包／裝備槽 | `GeneralBackpack.ts`、`GearEquipFlow.ts`、`GearPageSlots.ts`、`GearDefinitions.ts`、`EquipmentBonus.ts` | 部分：槽位邏輯留玩法層，存放走 base | 槽位解鎖、品質加成區間屬差異設定 |
| 主城倉庫容量與排序 | `WarehouseCapacity.ts`、`WarehouseSort.ts` | 可，搬成 `container-rule` | 數值進 JSON |
| 取得紀錄 | `ItemAcquisitionLog.ts` | 可，即 `IItemLedger` | 上限 200 筆；`diffAcquisitions` 由前後庫存差推導 |
| 到期清算 | `ItemExpiry.ts` | 可 | 即 `sweepExpired` |
| 使用與效果分派 | `ItemUseFlow.ts`、`ItemEffectDispatcher.ts` | 可 | 已是註冊制，保留 |
| 其他道具包裝 | `BreedingAuxItems.ts`、`GovernanceEfficiencyItem.ts`、`WeatherItem.ts`、`MercenaryTrialTicket.ts`、`BackpackScripts.ts` | 只剩 handler，資料進 ItemDef | 屬差異設定 |
| 寶物圖鑑 | `TreasureCodex.ts`、`HeirloomCardView.ts` | 保留為投影視圖 | 讀 `kind=treasure` 的列 |
| 分解鎖定 | `GearLockDecompose.ts` | 保留為包裝 | 呼叫 `apply` 的 `sink=DECOMPOSE` |
| UI | `ui/core/ItemBagController.ts`、`WarehousePanelController.ts` | 共用一個容器面板，傳入持有者與別名 | 背包／庫房／公庫／倉庫只換文案 key |

以上檔案皆位於 `assets/scripts/core/systems/`（UI 在 `assets/scripts/ui/core/`）。

既有規格：統一物件庫 InventoryService (doc_spec_0421)、DisplayBucket (doc_spec_0438)、ItemDef (doc_spec_0412)、道具五大分類 (doc_spec_0413)、道具使用效果引擎 (doc_spec_0414)、限時過期 (doc_spec_0417)、主城倉庫 (doc_spec_0431)、武將背包 (doc_spec_0017)、武將六槽裝備 (doc_spec_0423)。本書不推翻它們，而是把共同骨架抽成 base，原規格降為「包裝層差異設定」。

遷移順序：(1) 新增 `IItemStore` 並以 `InventoryRecord` 為列型別；(2) `PlayerInventory` 改為薄轉接；(3) 倉庫容量與背包槽位改讀 `container-rule`；(4) 取得紀錄與過期清算掛在 `apply` 內；(5) 其餘道具包裝逐一把常數搬進 `item-def`。每步維持舊檔相容（缺欄位補預設，不改舊存檔）。

## 8. 實作卡拆分建議（API 層排第一張，本框架 base 排第二張）

0. **前置 API-BASE**（總綱第 9 章第 1 張）：共通 API 層＋本機伺服器 adapter＋存檔走 API。本框架所有卡依賴它。
1. **ITM-BASE**：四種 schema 型別與 `IItemStore` 純邏輯＋單元測試，不接 UI、不動舊存檔。
2. 舊存檔與 `PlayerInventory` 轉接層。
3. 倉庫容量／擴容改讀設定。
4. 背包六槽改走 base。
5. 取得／消耗紀錄與過期清算整合。
6. 共用容器面板（背包／庫房／公庫／倉庫共用，換別名文案）。
7. 公庫與家族倉庫接入（等幕府家業 9199 開工）。

## 9. 驗收重點

- 任一持有者新增、消耗、移轉皆為原子交易，失敗不留半套。
- 新增一種持有者只需加一份 `container-rule`，不需新增程式檔。
- 舊存檔載入後數量一致。

## 10. 待使用者決定的大方向（推薦項為第一個）

- **Q1 傳家寶是否獨立持有者？** A（推薦）傳家寶是 `kind=treasure` 的一般物品，綁家宅、由庫房持有；B 另開「傳家寶殿」持有者；C 傳家寶只存在武將身上。
- **Q2 貨幣是否併入物品庫存？（涉及商業化）** A（推薦）貨幣為 `kind=currency` 的物品，共用 `apply`；B 貨幣獨立錢包，庫存只管道具；C 精元（付費）獨立、其餘併入。
- **Q3 容量滿時的預設處置？** A（推薦）預設拒收並提示，獎勵類改轉信箱；B 一律自動轉信箱；C 自動換成銅錢。
- **Q4 綁定物品能否交給後代？** A（推薦）可，經繼承移轉自動解綁；B 不可，隨武將退役封存；C 付費解綁。
- **Q5 公庫容量是否隨幕府等級成長？** A（推薦）依等級階梯；B 固定上限；C 無上限。（與幕府家業 9199 連動）

## 11. 伺服器 API

> 共通封包、冪等、權威、同步、存檔原則見 `共用框架總綱規格書.md (doc_spec_1182)` 第 5 章；本章只列庫存端點。

### 11.1 命令與查詢

| 名稱 | 類型 | 說明 |
|---|---|---|
| `item.query` | 查詢 | 依持有者、容器、分類、標籤、品質查詢庫存列（走投影視圖） |
| `item.count` | 查詢 | 某持有者某物品數量 |
| `item.use` | 命令（需 idemKey） | 使用物品；效果由已註冊 handler 於伺服器端執行 |
| `item.transfer` | 命令（需 idemKey） | 持有者間移轉（繼承、退役回庫、贈與） |
| `item.lock` | 命令 | 鎖定／解鎖列（防分解） |
| `item.expand` | 命令（需 idemKey） | 容器擴容（扣款由伺服器處理） |
| `item.decompose` | 命令（需 idemKey） | 分解回收（sink=DECOMPOSE） |
| `item.sort` | 命令（clientOwned，可樂觀） | 僅排序偏好，不影響數量 |

**沒有** `item.add`／`item.grant` 客戶端命令：增加物品只能由獎勵、商店、任務、系統發放的副作用產生，客戶端無法直接加物品。

### 11.2 Schema

```json
// item.use 請求 args
{ "holder": { "kind": "player", "id": "p1" }, "itemId": "ITEM_ORACLE", "qty": 1, "ctx": { "targetGeneralId": "g_guanyu" } }
// 回應 result
{ "consumed": [ { "itemId": "ITEM_ORACLE", "qty": 1 } ], "effect": { "effectType": "grantFreeDivination", "applied": true, "data": {} } }
// item.transfer 請求 args
{ "from": { "kind": "general", "id": "g1" }, "to": { "kind": "household", "id": "h1" }, "rowId": "inv_000123", "qty": 1, "reason": "retire" }
```

### 11.3 伺服器權威欄位

數量、列 id 配發、容量判定、綁定與期限、取得與消耗紀錄、使用效果結果、擴容價格與次數。`rowId`、`qty` 由客戶端指定「意圖」，伺服器核對持有者擁有該列才執行。

### 11.4 錯誤碼（E3xx）

| 碼 | reason | 說明 |
|---|---|---|
| E301 | `FULL` | 容量不足 |
| E302 | `NOT_ACCEPTED` | 容器不接受此類物品 |
| E303 | `LOCKED` | 物品已鎖定 |
| E304 | `BOUND` | 綁定限制不可移轉 |
| E305 | `INSUFFICIENT` | 數量不足 |
| E306 | `NOT_OWNER` | 該列不屬於此持有者 |
| E307 | `EXPIRED` | 已過期 |
| E308 | `USE_REJECTED` | 使用條件不符或 handler 拒絕 |
| E309 | `EXPAND_MAXED` | 已達擴容上限 |

### 11.5 推送事件

`inventory.changed`（附持有者、受影響列與新數量、`rev`）、`inventory.expired`（過期清算結果）、`inventory.overflow`（溢出轉信箱）、`inventory.capacity`（擴容）。

### 11.6 遷移與相容

- 現有 `PlayerInventory`（id→數量表）在存檔中的形狀保持不變，作為 player 持有者的伺服器側存檔；`GameSession._inventory` 改為檢視快取（總綱 5.9 的 P0 項）。
- 取得紀錄（`ItemAcquisitionLog`，上限 200 筆）由伺服器側產生，與 `GachaSyncRecord` 一同上傳。
- 伺服器表對應 `server/schema/bag11-equip-row.ts`（doc_spec_0439）；`stock-row.v1` 欄位需與其列驗證器對照，缺欄位以預設值補。
