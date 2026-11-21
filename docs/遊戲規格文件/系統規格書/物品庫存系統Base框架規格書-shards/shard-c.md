# 物品庫存系統Base框架規格書（分片索引） — 11 伺服器 API（端點、Schema、權威欄位、錯誤碼、事件）

> 這是 `物品庫存系統Base框架規格書.md` 的「11 伺服器 API（端點、Schema、權威欄位、錯誤碼、事件）」分片。完整索引見 `docs/遊戲規格文件/系統規格書/物品庫存系統Base框架規格書.md`。

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

### 11.4 錯誤碼（E31x）

> **分段回寫（總 PM 裁決，PROG-2-9208）：** 本書原寫 E301～E309，改為 **E310～E319**（E31x）。E301～E303 已被錢包命令使用（`INSUFFICIENT_BALANCE`／`CURRENCY_UNKNOWN`／`WALLET_UNAVAILABLE`），不得再分配給物品庫存。分段總表見 doc_spec_1182 第 5.3 節。

| 碼 | reason | 說明 | 狀態 |
|---|---|---|---|
| E310 | `HOLDER_UNKNOWN` | 持有者不存在或尚未開放（MVP 只開家庭倉庫） | 已實作（PROG-2-9203） |
| E311 | `NOT_ACCEPTED` | 容器不接受此類物品；使用條件不符或 handler 拒絕時以子 reason `USE_REJECTED` 區分（暫定） | 已實作（子 reason 待補） |
| E312 | `BOUND` | 綁定限制不可移轉 | 已實作 |
| E313 | `FULL` | 容量不足；已達擴容上限時以子 reason `EXPAND_MAXED` 區分（暫定） | 已實作（子 reason 待補） |
| E314 | `INSUFFICIENT` | 數量不足 | 已實作 |
| E315 | `SOURCE_INVALID` | 取得或消耗來源不合法 | 已實作 |
| E316 | `RULE_UNKNOWN` | 定期發放規則不存在 | 已實作 |
| E317 | `LOCKED` | 物品已鎖定（指派占用中） | 預留，待指派占用旗標實作 |
| E318 | `NOT_OWNER` | 該列不屬於此持有者 | 預留 |
| E319 | `EXPIRED` | 已過期 | 預留 |

E31x 十碼已用滿；`USE_REJECTED`、`EXPAND_MAXED` 因此暫以子 reason 併入 E311／E313，若日後需要獨立碼，須先向總 PM 申請新分段並同步登記到 doc_spec_0655。

### 11.5 推送事件

`inventory.changed`（附持有者、受影響列與新數量、`rev`）、`inventory.expired`（過期清算結果）、`inventory.overflow`（溢出轉信箱）、`inventory.capacity`（擴容）。

### 11.6 遷移與相容

- 現有 `PlayerInventory`（id→數量表）在存檔中的形狀保持不變，作為 player 持有者的伺服器側存檔；`GameSession._inventory` 改為檢視快取（總綱 5.9 的 P0 項）。
- 取得紀錄（`ItemAcquisitionLog`，上限 200 筆）由伺服器側產生，與 `GachaSyncRecord` 一同上傳。
- 伺服器表對應 `server/schema/bag11-equip-row.ts`（doc_spec_0439）；`stock-row.v1` 欄位需與其列驗證器對照，缺欄位以預設值補。
