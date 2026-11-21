# 獎勵系統Base框架規格書（分片索引） — 11 伺服器 API（端點、Schema、權威欄位、錯誤碼、事件）

> 這是 `獎勵系統Base框架規格書.md` 的「11 伺服器 API（端點、Schema、權威欄位、錯誤碼、事件）」分片。完整索引見 `docs/遊戲規格文件/系統規格書/獎勵系統Base框架規格書.md`。

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

### 11.4 錯誤碼（E32x）

> **分段回寫（總 PM 裁決，PROG-2-9208）：** 本書原寫 E501～E508，改為 **E320～E329**（E32x）；E5xx 不再使用。分段總表見 doc_spec_1182 第 5.3 節。入帳失敗附的原因碼為物品庫存 E31x 或錢包 E301～E303。

| 碼 | reason | 說明 | 狀態 |
|---|---|---|---|
| E320 | `POOL_NOT_FOUND` | 獎池不存在 | 已實作（PROG-2-9205） |
| E321 | `BUNDLE_NOT_FOUND` | 獎勵套件不存在 | 已實作 |
| E322 | `POOL_CLOSED` | 獎池未開放或已過期 | 已實作 |
| E323 | `NO_TICKET` | 無抽取憑證（來源種類無權領取；任務未完成、未付款、次數用盡）；戰場上報核驗失敗（原 `BATTLE_REPORT_REJECTED`）暫以子 reason 併入 | 已實作（核驗待補） |
| E324 | `INVALID_COUNT` | 抽取數量非法 | 已實作 |
| E325 | `SETTLE_ROLLBACK` | 入帳失敗，整筆回滾（附 E31x／E301～E303 原因） | 已實作 |
| E326 | `EFFECT_UNSUPPORTED` | 效果種類沒有 handler（預檢失敗，尚未動帳） | 已實作 |
| E327 | `GRANT_KEY_CONFLICT` | 去重鍵 `grantKey` 已被別的獎池或套件使用 | 已實作 |
| E328 | `REWARD_UNAVAILABLE` | 獎勵系統尚未就緒（可重試） | 已實作 |
| E329 | `ALREADY_CLAIMED` | 已領取（以「已領取」標記作第二道防線，同 `grantKey` 重送仍回原結果，不報錯） | 預留 |

`PRESENTATION_UNSUPPORTED`（原 E506）不再是錯誤碼：演出類型不支援時退回 `instant` 並記 log，不報錯。

### 11.5 推送事件

`reward.granted`（獎勵到帳，附 `grantId`、演出參數）、`reward.pity.changed`、`reward.pending`（離線期間累積的未播放獎勵，登入時補播）。

### 11.6 遷移與相容

- 轉蛋現行 `GachaApi`（`GACHA_API_VERSION=1`，路由 `/gacha/pools｜wallet｜pull｜history`）的 DTO 與錯誤碼保留為 `reward.draw`（轉蛋卡池）的 args／result 與 `reason`；是否整併由 Q1 決定，**在 Q1 裁決前，`GachaApi` 維持現狀並行**，只把其本機實作搬進本機伺服器 adapter。
- `GachaSyncRecord`（doc_spec_0469）作為 `reward.draw` 的同步記錄格式。
- 離線補播：登入時伺服器回傳未播放的 `reward.pending`，客戶端依序播放演出，帳目早已入帳。
