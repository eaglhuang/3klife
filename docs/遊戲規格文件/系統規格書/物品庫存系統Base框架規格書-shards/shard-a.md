# 物品庫存系統Base框架規格書（分片索引） — 1–3 目的、核心概念、共用資料結構

> 這是 `物品庫存系統Base框架規格書.md` 的「1–3 目的、核心概念、共用資料結構」分片。完整索引見 `docs/遊戲規格文件/系統規格書/物品庫存系統Base框架規格書.md`。

<!-- doc_id: doc_spec_1255 -->
# 物品庫存系統 Base 框架規格書

> 上層總綱：`共用框架總綱規格書.md (doc_spec_1182)`。本書是六套共用框架之一，所有「持有物品」的玩法一律走本框架，只做包裝與差異設定。
> 相關框架：買賣商店 (doc_spec_1183)、任務 (doc_spec_1185)、獎勵 (doc_spec_1186)、技能 (doc_spec_1187)、劇情 (doc_spec_1188)。
> 伺服器 API 與網路原則見總綱第 5 章（本書第 11 章只列本框架端點與 schema，不重複原則）。
> 任務卡：PROG-2-9200（文件）、PROG-2-9218（使用者 2026-11-21 裁決回寫：金與銀兩兩種貨幣、公庫用金、家族庫房用銀兩、糧草命名）。狀態：Q2 已裁決（見第 10 節），其餘由 PM 定案。

## 1. 目的與範圍

使用者定案：各種功能道具、寶物（傳家寶）、裝備都是「有庫存觀念的物品系統」，必須共用一套；持有者不同只是名稱不同。

| 持有者 | 玩家看到的名稱 | 例子 |
|---|---|---|
| 武將個人 | 背包 | 武將六槽裝備、隨身消耗品 |
| 家（主城／家宅） | 庫房 | 主城倉庫、傳家寶、材料 |
| 幕府 | 公庫 | 幕府公有道具、軍需（對應幕府家業 PROG-2-9199） |
| 家族 | 倉庫 | 家族共享裝備、世代傳承物 |
| 玩家帳號 | 物品欄 | 求籤令、入學令等帳號級道具 |

**持有者與貨幣（使用者 2026-11-21 裁決 #14、#28）**：遊戲保留金與銀兩兩種貨幣，各有用途，持有者依性質只持有其中一種：

| 持有者 | 可持有的貨幣 | 用途 |
|---|---|---|
| 幕府（公庫） | **金**（`gold`）；另有糧草、兵源、聲望等公共資源 | 國家軍政資金：征兵、城建、外交、俸祿 |
| 家（庫房）、家族（倉庫） | **銀兩**（`silver`） | 家族私房：家業起蓋與營運、婚嫁聘禮、養子嗣、學府費用 |
| 玩家帳號 | 付費貨幣、帳號級代幣（精元、結義點數、求籤令、免費銅錢符等轉蛋貨幣） | 不受公私帳影響；付費貨幣定價另題 |
| 武將個人（背包） | 不持有貨幣，只持有道具 | — |

公私帳互不混用：用金的支出只能從公庫扣，用銀兩的支出只能從家族庫房扣。兩者可以轉移但有代價（捐公庫換名望、挪用公庫補家用），規則與數值見貨幣與資源總規格書 (doc_spec_1247)。

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
- `wallet.currencies`（選填）宣告該持有者可持有的貨幣：公庫 `["gold"]`、家與家族 `["silver"]`；錢包命令對不屬於該持有者的貨幣回 `E302 CURRENCY_UNKNOWN`。
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

### 3.5 資源與貨幣命名統一（2026-11-21 使用者裁決 #14 修正）

現況：任務核心 `MissionResourceKey`＝`grain／troops／silver`（`core/mission/MissionTypes.ts`，`cost`、`rewards` 也用 `grain／silver`，其中 `silver` 實際對映到錢包的 `gold`）；領地治理與派遣 `DomesticResource`＝`food／gold／fame／cityTroops`（`DomesticTasks.ts`）；基礎資源規格 doc_spec_0404 用 `food／gold／troops／fame`。同一種東西兩個名字，轉換散在各處。

**使用者 11/21 裁決（修正原 PM 建議）**：原案「`silver` 為 `gold` 別名、兩者同一種」**作廢**。金（國家／公庫）與銀兩（家族私房）是兩種貨幣，各有用途；只統一糧食命名為「糧草」（PM 定名，規範 id 沿用 `food`）。完整規則見貨幣與資源總規格書 (doc_spec_1247)。

資源定義表 `resource-def.v1`（資源與貨幣型物品的唯一名稱登記）：

```json
{ "schema": "resource-def.v1",
  "resources": [
    { "id": "food",   "nameKey": "res.food",   "kind": "resource", "aliases": ["grain"],      "holders": ["shogunate"], "cap": "holder" },
    { "id": "gold",   "nameKey": "res.gold",   "kind": "currency", "aliases": [],             "holders": ["shogunate"], "cap": "holder" },
    { "id": "silver", "nameKey": "res.silver", "kind": "currency", "aliases": [],             "holders": ["household", "clan"], "cap": "holder" },
    { "id": "troops", "nameKey": "res.troops", "kind": "resource", "aliases": ["cityTroops"], "holders": ["shogunate"], "cap": "holder" },
    { "id": "fame",   "nameKey": "res.fame",   "kind": "resource", "aliases": [],             "holders": ["shogunate"], "cap": null }
  ] }
```

- 規範 id：`food／gold／silver／troops／fame`；玩家可見名稱：**糧草**、金、銀兩、兵源、名聲（「糧食」一律改名為「糧草」）。別名只在**讀取邊界**轉換一次：任務資料載入（`MissionLoader`／`HallMissionData`）、舊存檔載入、舊帳本，轉成規範 id 後，內部一律只見規範 id。
- 大廳任務與任務牆的舊 `silver` 欄位（實際扣入錢包 `gold`）讀入時對映為 `gold`（公務屬國家）；**銀兩只來自家業、家族事務與公私轉移**，不由任務牆直接產出。
- 遷移方式：(1) 先上 `resource-def` 與 `normalizeResourceId()`（純函式），別名表只有 `grain→food`、`silver(舊任務欄位)→gold`、`cityTroops→troops`；(2) 任務資料 JSON 暫不改，載入時轉換；(3) 存檔格式版本加一，舊檔讀入時以別名轉換、寫出時用規範 id；(4) 新增 `silver` 錢包與家族庫房持有者（CUR-2 卡）；(5) 全部資料與程式遷完後移除別名（保留載入端別名一個版本以相容舊檔）；(6) `check-api-bypass`（總綱 5.10）加一條：新程式碼不得出現別名字串與玩家可見「糧食」。
- 單位與上限：持有者的 `container-rule` 可為資源宣告上限（如城市糧倉），與道具容量同一機制。
