# 物品庫存系統Base框架規格書（分片索引） — 4–10 共用 API、包裝接入、依賴、遷移、實作卡、驗收、待決

> 這是 `物品庫存系統Base框架規格書.md` 的「4–10 共用 API、包裝接入、依賴、遷移、實作卡、驗收、待決」分片。完整索引見 `docs/遊戲規格文件/系統規格書/物品庫存系統Base框架規格書.md`。

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
8. **CUR-1 資源定義表與糧草改名**（使用者 11/21 裁決 #14）：`resource-def.v1`、`normalizeResourceId()`、玩家可見「糧草」、舊存檔遷移。依賴：ITM-BASE。驗收：全專案無玩家可見「糧食」；舊存檔 `grain` 欄位開檔轉 `food`；大廳任務舊 `silver` 讀入轉 `gold`。
9. **CUR-2 銀兩錢包與持有者幣別**：新增 `silver` 貨幣、`container-rule.wallet.currencies`、家與家族持有者用銀兩、公庫用金。依賴：CUR-1。驗收：用金支出只能從公庫扣、用銀兩支出只能從家族庫房扣；錯誤幣別回 E302；契約測試。
10. 公私轉移命令見貨幣與資源總規格書 (doc_spec_1241) 第 9 章 CUR-3。

## 9. 驗收重點

- 任一持有者新增、消耗、移轉皆為原子交易，失敗不留半套。
- 新增一種持有者只需加一份 `container-rule`，不需新增程式檔。
- 舊存檔載入後數量一致。

## 10. 待決題的裁決結果（2026-11-21 回寫；Q1、Q3～Q5 為 PM 採推薦項）

- **Q1 傳家寶是否獨立持有者？** A（推薦）傳家寶是 `kind=treasure` 的一般物品，綁家宅、由庫房持有；B 另開「傳家寶殿」持有者；C 傳家寶只存在武將身上。
- **Q2 貨幣是否併入物品庫存：** **PM 裁決**（總綱第 10 章同題，以該處為準）A 貨幣為 `kind=currency` 的物品，經 `wallet.*` 命令共用 `apply`。**使用者 11/21 裁決 #14、#28 補充：保留金與銀兩兩種貨幣，公庫用金、家族庫房用銀兩，不合併**（見本書 1 與貨幣與資源總規格書 doc_spec_1241）；付費貨幣（精元）的商業化與定價仍另題。
- **Q3 容量滿時的預設處置？** A（推薦）預設拒收並提示，獎勵類改轉信箱；B 一律自動轉信箱；C 自動換成銅錢。
- **Q4 綁定物品能否交給後代？** A（推薦）可，經繼承移轉自動解綁；B 不可，隨武將退役封存；C 付費解綁。
- **Q5 公庫容量是否隨幕府等級成長？** A（推薦）依等級階梯；B 固定上限；C 無上限。（與幕府家業 9199 連動）
