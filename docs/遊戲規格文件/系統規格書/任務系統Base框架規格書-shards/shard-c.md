# 任務系統Base框架規格書（分片索引） — 11 伺服器 API（端點、Schema、權威欄位、錯誤碼、事件）

> 這是 `任務系統Base框架規格書.md` 的「11 伺服器 API（端點、Schema、權威欄位、錯誤碼、事件）」分片。完整索引見 `docs/遊戲規格文件/系統規格書/任務系統Base框架規格書.md`。

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

### 11.4 錯誤碼（E35x）

> 分段裁決（總 PM，PROG-2-9215 回寫）：任務段由 E4xx 改為 **E35x**，與物品 E31x、獎勵 E32x、占用 E33x、劇情 E34x 同為十碼一段。實作見 `assets/scripts/shared/api/ApiErrors.ts`。

| 碼 | reason | 說明 |
|---|---|---|
| E350 | `DEF_NOT_FOUND` | 任務定義不存在 |
| E351 | `NOT_FOUND` | 任務實例不存在、已被取走或已過期 |
| E352 | `BAD_STATE` | 實例狀態不允許此操作（已結算、已放棄等） |
| E353 | `GATE_PENDING` | 步進被關卡擋住，需先 clearGate |
| E354 | `NOT_READY` | 尚未到可結算時間／目標未達 |
| E355 | `STEP_MISMATCH` | fromStep 與目前步數不符 |
| E356 | `ACTOR_INVALID` | 派遣人員不符需求 |
| E357 | `CONDITION_UNMET` | 接取條件未達 |
| E358 | `QUEST_UNAVAILABLE` | 任務不可接取 |
| E359 | `KEY_CONFLICT` | 冪等鍵衝突 |

沿用現有 `MissionErrorCode` 字串作為 `reason`。

### 11.5 推送事件

`quest.board.changed`（新任務、到期）、`quest.progress`（計數型進度）、`quest.ready`（派遣完成可結算）、`quest.settled`（含 tier 與 grantId）、`quest.spawned`。

### 11.6 遷移與相容

- `IMissionService` 的方法與 `MissionResult<T>`（附 `revision`、`ledger`、`events`）直接對映本章回應的 `saveRev`／`delta`／`events`；`OfflineMissionService` 搬為本機 adapter 的任務模組，DTO 不變。
- 任務存檔（`MissionSave`）納入伺服器側存檔，舊檔缺欄位補預設。
