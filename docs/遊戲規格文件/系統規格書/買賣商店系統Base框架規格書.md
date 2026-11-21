<!-- doc_id: doc_spec_1183 -->
# 買賣商店系統 Base 框架規格書

> 上層總綱：`共用框架總綱規格書.md (doc_spec_1182)`。本書是六套共用框架之一。
> 相關框架：物品庫存 (doc_spec_1184，商品與成交入庫)、獎勵 (doc_spec_1186，商店抽獎類商品與折價券)、任務 (doc_spec_1185，限時商店任務)、技能 (doc_spec_1187，戰法書／技能書販售)、劇情 (doc_spec_1188，商人劇情觸發商店)。
> 伺服器 API 與網路原則見總綱第 5 章（本書第 11 章只列本框架端點與 schema，不重複原則）。
> 任務卡：PROG-2-9200（文件）。狀態：草案，待使用者裁決第 10 節選擇題。

## 1. 目的與範圍

使用者定案：遊戲中會開出很多種買賣商店。**上架、下架、打折、換期商品**等功能一定要共用，各商店只做包裝與差異設定。

範圍內：商店定義、貨架（上架／下架／輪替）、商品與定價、折扣與活動價、限購與庫存量、購買流程（預檢→扣款→入庫→紀錄）、賣出與回收、商店開放條件。
範圍外：貨幣本體與物品存放（歸物品庫存）、「抽」的隨機機制（歸獎勵）、商店 UI 外觀（歸各畫面 spec）。

## 2. 核心概念與名詞

- **商店（Shop）**：一個可開關的買賣場所，有開放條件與貨架。
- **貨架（Shelf）**：商店內一組商品的排列；可有多個貨架（常駐架、限時架、每日架）。
- **商品（Listing）**：貨架上的一格，指向一個 ItemDef 或「服務」（如擴容、加速），帶價格、數量、限購。
- **價格規則（PriceRule）**：基礎價、貨幣種類、折扣、階梯價（買越多越貴／擴容階梯價）。
- **期（Rotation）**：商品換期設定，依季、週、日或事件輪替。
- **限購（Limit）**：每人、每日、每週、終身的購買次數上限。
- **成交（Deal）**：一次購買，產出一筆「扣款＋入庫」的物品庫存交易。

## 3. 共用資料結構（設定 JSON 草案）

### 3.1 商店定義 `shop-def.v1`

```json
{
  "schema": "shop-def.v1",
  "id": "SHOP_BAIBAOGE",
  "nameKey": "shop.baibaoge.name",
  "mode": "buy",
  "openWhen": { "all": [{ "flag": "tutorial.done" }] },
  "currencies": ["gems", "bronze"],
  "buyerHolder": "player",
  "deliverTo": "player",
  "shelves": ["SHELF_BAIBAOGE_MAIN", "SHELF_BAIBAOGE_LIMITED"]
}
```

`mode`：`buy`（只買）／`sell`（只賣給商人）／`both`／`exchange`（以物易物或以點數兌換，如天命商店）。

### 3.2 貨架與商品 `shelf-def.v1`

```json
{
  "schema": "shelf-def.v1",
  "id": "SHELF_BAIBAOGE_MAIN",
  "rotation": { "type": "none" },
  "listings": [
    { "listingId": "L_VITALITY_PILL", "ref": { "kind": "item", "itemId": "ITEM_VITALITY_PILL", "qty": 1 },
      "price": { "currency": "gems", "base": 10 },
      "limit": { "scope": "none" }, "stock": null, "visibleWhen": null },
    { "listingId": "L_WAREHOUSE_EXPAND", "ref": { "kind": "service", "serviceId": "expandContainer", "args": {"holder": "household", "container": "main"} },
      "price": { "currency": "gems", "ladder": [50, 100, 200] },
      "limit": { "scope": "lifetime", "max": 3 } }
  ]
}
```

- `ref.kind`：`item`／`bundle`（多道具禮包，批次入庫）／`service`（擴容、加速、解鎖等無實體商品，由玩法註冊 handler）／`rewardPool`（購買後交獎勵系統抽，如寶箱）。
- `price.ladder`：階梯價，依「已購次數」取值。
- `rotation.type`：`none`／`daily`／`weekly`／`seasonal`／`event`；輪替時由設定的候選池與權重挑出本期貨架（選取演算法可呼叫獎勵系統的獎池）。

### 3.3 折扣與活動 `shop-promo.v1`

```json
{
  "schema": "shop-promo.v1",
  "id": "PROMO_NEWBIE_WEEK",
  "target": { "shop": "SHOP_BAIBAOGE", "listings": ["L_VITALITY_PILL"], "tags": ["consumable"] },
  "discount": { "type": "percent", "value": 20 },
  "window": { "from": "2026-12-01", "to": "2026-12-07" },
  "stackable": false
}
```

### 3.4 購買紀錄 `shop-deal.v1`

```json
{ "dealId": "d_001", "shop": "SHOP_BAIBAOGE", "listingId": "L_VITALITY_PILL", "qty": 2,
  "paid": { "currency": "gems", "amount": 20 }, "promoApplied": null, "at": 1763650000000 }
```

## 4. 共用 API（介面草案）

```ts
interface IShopService {
  openShops(ctx: PlayerCtx): ShopSummary[];                       // 依 openWhen 過濾
  getShelf(shopId: string, ctx: PlayerCtx): ShelfView;            // 已套用輪替、折扣、限購剩餘
  quote(shopId: string, listingId: string, qty: number, ctx: PlayerCtx): Quote;   // 含折扣明細
  buy(shopId: string, listingId: string, qty: number, ctx: PlayerCtx): DealResult; // 預檢→扣款→交付→紀錄，原子
  sell(shopId: string, rowId: string, qty: number, ctx: PlayerCtx): DealResult;
  // 營運面（上架、下架、打折、換期）
  list(shopId: string, listing: ListingDef): void;
  delist(shopId: string, listingId: string, reason: string): void;
  setPromo(promo: ShopPromo): void;
  rotate(shopId: string, nowMs: number): RotationResult;
}
interface IServiceHandlerRegistry { register(serviceId: string, h: (args: unknown, ctx: PlayerCtx) => ServiceResult): void; }
```

規則：
1. `buy` 內部只做三件事：向價格規則取價、向物品庫存 `apply` 一筆「消耗貨幣＋新增商品」的原子交易、寫成交紀錄。商店自己不存任何道具數量。
2. 上架、下架、打折、換期都是改設定資料，不得寫死在各商店程式內。
3. 限購與每日次數以「重置時間」為準，重置規則共用同一個時鐘介面（季／日／週）。
4. 購買失敗原因碼：`CLOSED`／`SOLD_OUT`／`LIMIT_REACHED`／`INSUFFICIENT`／`FULL`／`NOT_VISIBLE`。

## 5. 各包裝如何只用差異設定接入

1. **百寶閣（精元道具商店）**：`shop-def` 一份、貨架一份，列出 ITEM_VITALITY_PILL 10、高階活力丸 25、求籤令 15、入學令 20、轉職令 50、延壽丹 100（皆精元）。對應既有 `ITEM_SHOP_OFFERS`，只要把表搬進 `shelf-def`。
2. **天命商店（轉蛋滿轉兌換）**：`mode=exchange`，貨幣是「天命點數」（轉蛋保底滿轉累積），商品為 `rewardPool`/自選 SSR 兌換；開放條件為保底記帳（`openWhen` 讀轉蛋保底狀態）。對應既有 `DestinyShop`（`exchangeDestinyShop`），其餘差異全在設定。
3. **主城倉庫擴容與背包擴容**：不是商品實體，是 `ref.kind=service`、`serviceId=expandContainer`，價格用階梯價 50／100／200，限購 3 次；handler 呼叫物品庫存 `expand`。取代現有 `warehouseExpandGemCost` 寫死階梯。
4. **每日／每週輪替商人（新）**：`rotation=daily`，候選池列材料與裝備，權重由獎勵系統獎池提供；開放條件為幕府等級。這是新玩法，只需新增設定，不需新程式。
5. **幕府軍需處（幕府家業，新）**：買方持有者為 `shogunate`，用公庫資金付款，貨品交付到公庫；與玩家商店共用 `IShopService`，差異只在 `buyerHolder`、`deliverTo`。

## 6. 與其他框架的依賴

- 依賴 **物品庫存**：商品、貨幣、成交入庫皆為庫存交易。
- 依賴 **獎勵**：`rewardPool` 類商品（寶箱）、輪替貨架挑選、折價券發放。
- 被 **任務**（限時商店任務、以任務換兌換券）、**劇情**（劇情選項開啟特定商店）呼叫。
- 與 **技能**：戰法書、技能書是 ItemDef，由商店販售，學習走技能系統。

## 7. 現有程式盤點與遷移建議

| 現有實作 | 位置 | 可否抽成 base | 說明 |
|---|---|---|---|
| 百寶閣精元定價與購買 | `core/systems/ItemShopPricing.ts`（`ShopOffer`、`ITEM_SHOP_OFFERS`、`purchaseShopOffer`） | **可從此抽出核心**（購買原子操作；家業規格 doc_spec_1181 §3.1 同樣指出），最小的商店雛形 | `ShopOffer` 只有 itemId／currency／price；缺限購、折扣、輪替、上下架。`purchaseShopOffer` 的「先扣款成功才發貨」即 `buy` 流程 |
| 商城畫面 | `ui/core/ShopMainController.ts` | 可，改成讀 `IShopService` | 目前為單一畫面 |
| 天命商店兌換 | `core/systems/DestinyShop.ts`、`ui/core/DestinyShopController.ts` | 可，列為 `mode=exchange` 包裝 | 資格計算（保底點數）保留在轉蛋端 |
| 轉蛋貨幣與扣款 | `core/systems/GachaCurrency.ts`、`core/services/GachaWalletRules.ts` | 扣款部分可併入商店 `quote/buy`；抽取留獎勵 | 詳見獎勵系統 Q1 |
| 擴容階梯價 | `core/systems/WarehouseCapacity.ts` | 可，改 `service` 商品 | 數值進設定 |
| 加速卡、治理效率道具 | `GovernanceEfficiencyItem.ts`、`ItemRefreshEffect.ts` | 只剩 handler | 販售走商店，使用走物品 |
| 許願池與許願祭壇 | `core/systems/WishPool.ts`（PROG-2-1198，另一套價格與倍率）、`WishAltarController` | 屬獎勵／商店混合，購買核心併入 `buy`，見獎勵書 | 現在各寫各的購買邏輯 |
| 他國 AI 貿易兌換 | doc_spec_0496 規格 | 可，`mode=exchange` 包裝 | 尚無程式 |

既有規格：百寶閣商城與許願祭壇 (doc_spec_0420)、百寶閣玉璧貨幣定價與扣款 (doc_spec_0628)、道具精元定價表 (doc_spec_0407)、加速卡縮期與商店定價 (doc_spec_0410)、轉蛋雙重保底與天命商店 (doc_spec_0463)、滿轉溢出轉化與天命商店自選兌換 (doc_spec_0466)、太守府商業化 (doc_spec_0635)、官職俸祿商業加速 (doc_spec_0634)、裝備背包擴容 (doc_spec_0629)。

### 7.1 商店分界與商業化（沿用家業規格 doc_spec_1181 §3.3）

- 家族商店＝`mode=sell` 的實例，只用金幣；商城＝`mode=buy` 的實例，用付費貨幣；兩者貨架（listing 池）完全分開。
- 家族商店不售加速卡、入學令、轉職令、傳道令、歸宗令、抽卡券與任何 `premium／token／speedup` 標籤物品；商城不售家業貨物、菜餚、食材、配方卷。金幣不能換付費貨幣。
- 商業化接口只留空欄位 `monetizationHook`（`listing` 可選欄位），不在本書定案（見 Q1、Q2）。

遷移順序：(1) 新增 `shop-def／shelf-def` 與 `IShopService`，先接百寶閣（資料表搬移，行為不變）；(2) 擴容改成 `service` 商品；(3) 天命商店以 `exchange` 包裝；(4) 補限購、折扣、輪替；(5) 新商店（輪替商人、軍需處）只加設定。

## 8. 實作卡拆分建議（API 層排第一張，本框架 base 排第二張）

0. **前置 API-BASE**（總綱第 9 章第 1 張）：共通 API 層＋本機伺服器 adapter＋存檔走 API。本框架所有卡依賴它。
1. **SHP-BASE**：`shop-def／shelf-def／shop-promo／shop-deal` 型別、`IShopService` 純邏輯與測試（依賴物品庫存 base 的 `apply`，可先以記憶體假實作）。
2. 百寶閣資料遷移＋畫面改讀 `IShopService`。
3. 服務型商品（擴容）。
4. 限購、重置時鐘、折扣活動。
5. 輪替貨架（挑選接獎勵獎池）。
6. 天命商店 `exchange` 包裝。
7. 公庫軍需處（待 9199）：公庫商店用**金**結算，家族商店與家族庫房用**銀兩**結算（使用者 11/21 裁決 #14、#28；貨幣與資源總規格書 doc_spec_1241），兩者貨架與貨幣完全分開，不得混用。
8. **SHP-TP 戰法商店（第二批，使用者 11/21 裁決 #5）**：TP 戰法商店與結業戰法商店（學府 A2）**第二批**才做，等商店框架（SHP-BASE）完成後再做；TP 價格另題。本卡暫不開，依賴：SHP-BASE、技能 base（SKL-M）、學府結業串接（9191-a）。驗收（屆時）：TP 不足不可買（E603）、已學會不可重複買（E602）、價格由 `shop-def` 設定。

## 9. 驗收重點

- 新增一間商店或換一期商品，只改 JSON。
- 購買任何商品都是單一原子交易，扣款失敗不發貨、入庫失敗不扣款。
- 折扣與限購在報價與成交兩處結果一致。

## 10. 待使用者決定的大方向（推薦項為第一個；2026-11-21 已裁決 TP 戰法商店排第二批，貨幣見 doc_spec_1241）

- **Q1 價格與貨幣體系（商業化）：** A（推薦）沿用現行「精元（付費）＋銅錢（免費）」雙貨幣，商品各自標註；B 全商品雙價（精元價／銅錢價）可擇一；C 另增專屬貨幣（如商會點數）。
- **Q2 折扣由誰訂？（商業化）** A（推薦）活動折扣由企劃設定檔營運，玩家端不可疊加；B 允許與折價券疊加（上限 50%）；C 完全不做折扣，只做換期。
- **Q3 輪替週期預設：** A（推薦）日常商人每日、特殊商人每季；B 全部每週；C 由玩家以貨幣手動刷新（加付費刷新）。
- **Q4 賣出（回收）是否開放：** A（推薦）只開放材料與裝備回收，價格為買價的 20%；B 全部物品可賣；C 不開放賣出，只能分解。
- **Q5 抽獎類商品（寶箱）是否算商店商品：** A（推薦）算，`rewardPool` 商品，抽取機制屬獎勵系統；B 一律另開獎勵入口，不進商店。（與轉蛋歸屬連動，見獎勵書 Q1）

## 11. 伺服器 API

> 共通封包、冪等、權威、同步、存檔原則見 `共用框架總綱規格書.md (doc_spec_1182)` 第 5 章；本章只列商店端點。單機時由本機伺服器 adapter 實作，命令名稱與 schema 不變。

### 11.1 命令與查詢

| 名稱 | 類型 | 說明 |
|---|---|---|
| `shop.list` | 查詢 | 回傳目前可見商店清單（依 `openWhen`） |
| `shop.shelf` | 查詢 | 回傳某商店貨架（已套用輪替、折扣、限購剩餘、庫存量） |
| `shop.quote` | 查詢 | 報價（含折扣明細），僅供預覽，成交以 `buy` 為準 |
| `shop.buy` | 命令（需 idemKey） | 購買商品；原子：扣款＋入庫＋成交紀錄 |
| `shop.sell` | 命令（需 idemKey） | 賣出／回收 |
| `shop.admin.list／delist／setPromo／rotate` | 營運命令（僅營運後台／配表下發，客戶端呼叫回 `E105`） | 上架、下架、打折、換期；單機版由配表載入觸發 |

### 11.2 Schema

```json
// shop.buy 請求 args
{ "shopId": "SHOP_BAIBAOGE", "listingId": "L_VITALITY_PILL", "qty": 2, "expectPrice": { "currency": "gems", "amount": 20 } }
// 回應 result
{ "dealId": "d_001", "paid": { "currency": "gems", "amount": 20 }, "delivered": [ { "itemId": "ITEM_VITALITY_PILL", "qty": 2 } ],
  "limitLeft": null, "promoApplied": null }
```

`expectPrice` 只是防「看到的價格已變」的比對值：不一致回 `E205 PRICE_CHANGED` 並附新報價，**不會以客戶端價格成交**。

### 11.3 伺服器權威欄位

價格、折扣、限購剩餘、貨架內容與輪替結果、庫存量、成交與發貨內容、重置時間。客戶端傳入 `price／discount／delivered` 一律 `E103`。

### 11.4 錯誤碼（E2xx）

| 碼 | reason | 說明 |
|---|---|---|
| E201 | `SHOP_CLOSED` | 商店未開放 |
| E202 | `SOLD_OUT` | 庫存量用盡 |
| E203 | `LIMIT_REACHED` | 超過限購 |
| E204 | `INSUFFICIENT` | 貨幣不足 |
| E205 | `PRICE_CHANGED` | 報價已變（附新價） |
| E206 | `LISTING_NOT_VISIBLE` | 商品未上架或條件未達 |
| E207 | `CONTAINER_FULL` | 入庫容量不足（依庫存 overflow 規則可轉信箱則不報） |
| E208 | `SERVICE_FAILED` | 服務型商品 handler 失敗，整筆回滾 |

### 11.5 推送事件

`shop.rotated`（換期，附新貨架 rev）、`shop.shelf.changed`（上下架）、`shop.promo.started／ended`、`shop.limit.reset`。庫存與貨幣變動由 `inventory.changed` 推送。

### 11.6 遷移與相容

- 百寶閣現行 `purchaseShopOffer(offer, qty, wallet, grant)` 的「先扣款成功才發貨」語意即 `shop.buy`；本機 adapter 內部呼叫庫存 `apply`，不再由畫面傳入 `wallet`／`grant` 回呼。
- 舊存檔無商店狀態（限購計數、輪替期）時以預設值補；限購與輪替狀態存伺服器側存檔。
