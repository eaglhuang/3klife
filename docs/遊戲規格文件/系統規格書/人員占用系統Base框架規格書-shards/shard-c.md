# 人員占用系統Base框架規格書（分片索引） — 11–12 伺服器 API、實作卡切分

> 這是 `人員占用系統Base框架規格書.md` 的「11–12 伺服器 API、實作卡切分」分片。完整索引見 `docs/遊戲規格文件/系統規格書/人員占用系統Base框架規格書.md`。

<!-- doc_id: doc_spec_1251 -->

## 11. 伺服器 API

> 共通封包、冪等、權威、同步、存檔原則見總綱第 5 章；本章只列占用端點。占用是「權威在伺服器」的資料：客戶端只送意圖，是否衝突由伺服器依矩陣判定（單機＝本機伺服器 adapter）。

### 11.1 命令與查詢

| 名稱 | 類型 | 狀態 | 說明 |
|---|---|---|---|
| `occupancy.query` | 查詢 | 已實作 | `personId` 省略＝全部（登記表加轉接器），回 `records` 與 `occupiedIds` |
| `occupancy.check` | 查詢 | 預留（OCC-2） | 預檢「這個人能不能接這種工作」，回 `ok` 與 `blockedBy`；不寫入 |
| `occupancy.acquire` | 命令（需 idemKey） | 已實作（只開 academy／mentorAssign） | 登記占用；同一筆重送冪等；衝突 E330；唯讀種類 E333 |
| `occupancy.release` | 命令（需 idemKey） | 已實作 | 釋放占用；冪等；refId 對不上 E332 |

學府占用通常不由客戶端直接呼叫，而是任務命令（`task.accept`）在伺服器內呼叫，保證「接任務」與「占用」同一筆原子交易。

### 11.2 Schema

```json
// occupancy.acquire 請求 args（客戶端只送意圖）
{ "personId": "g_zhaoyun", "kind": "mentorAssign", "refId": "mentor:cls_0003", "since": 12, "until": null }
// 回應 result
{ "acquired": true, "record": { "personId": "g_zhaoyun", "kind": "mentorAssign", "refId": "mentor:cls_0003", "since": 12, "until": null } }
// 衝突回應（ok=false，errorCode=E330）
{ "ok": false, "errorCode": "E330", "reason": "OCC_CONFLICT", "message": "g_zhaoyun 已被 campaign（battle:b_0012）占用",
  "retryable": false, "data": { "blockedBy": { "kind": "campaign", "refId": "battle:b_0012" } } }
```

### 11.3 伺服器權威欄位

占用紀錄全部欄位（`since／until／sub／refId`）、互斥判定結果、可寫種類清單。客戶端要求寫入唯讀種類 → `E333`；傳入 `blockedBy／acquired` 等結果欄位 → `E103`。

### 11.4 錯誤碼（E33x，分段見總綱 5.3）

| 碼 | reason | 說明 | 狀態 |
|---|---|---|---|
| E330 | `OCC_CONFLICT` | 已被別種來源或同種不同 refId 占用（附 `blockedBy`） | 已實作 |
| E331 | `OCC_KIND_UNKNOWN` | 未知的占用種類 | 已實作 |
| E332 | `OCC_REF_MISMATCH` | 釋放時 refId 對不上（別人的占用，不誤放） | 已實作 |
| E333 | `OCC_READONLY_KIND` | 該種類由原系統管理，登記表只讀 | 已實作；種類遷成可寫後該種類不再回此碼 |
| E334 | `OCC_UNAVAILABLE` | 占用服務尚未就緒（可重試） | 已實作 |
| E335 | `OCC_NOT_ELIGIBLE` | 資格不符（如教官指派的將階／年齡門檻未達，由指派命令借用本碼回報） | 預留 |
| E336 | `OCC_WINDOW_INVALID` | `until` 早於 `since` 或格式錯 | 預留 |
| E337 | `OCC_PERSON_UNKNOWN` | personId 不存在 | 預留 |

### 11.5 推送事件

`occupancy.changed`（某人的占用新增或釋放，附 `personId／kind／sub／refId`，客戶端據此更新「目前狀態」顯示）。連線版離線期間的變更，登入時以 `GET /api/v1/events?since=<rev>` 補收。

### 11.6 網路 adapter 與相容

- 本機 adapter（`OccupancyCommands.ts`）與網路 adapter 共用命令名稱、封包（`v、reqId、idemKey、saveRev`）與錯誤碼，只換傳輸。契約測試以同一組案例（衝突、冪等重送、`REF_MISMATCH`、唯讀擋寫）跑兩個 adapter。
- 網路版轉接器讀取的來源改為伺服器側各系統；客戶端沒有任何自己判斷「忙不忙」的權力，UI 只顯示 `occupancy.query` 的結果。
- 與既有 `check-api-bypass` 規則（skill-write 等）並列：新增規則「不得直接改人物占用旗標（`hallBusyGeneralIds` 等）」，基準棘輪只減不增。

## 12. 實作卡切分（只列建議，不開卡）

| 卡（暫名） | 範圍 | 依賴 | 驗收 | 估計 |
|---|---|---|---|---|
| OCC-M（已合併，PROG-2-9207） | 登記表、academy／mentorAssign、六處唯讀轉接器、E330～E334 | B0 | 修業者排除於任務牆／派遣／傭兵候選 | 已完成 |
| OCC-2 框架補完 | `occupancy-kind`／`occupancy-matrix` JSON 與載入、`sub` 欄位、`campaign` 種類、`occupancy.check`、`filterFree(ids, kind)`、E335～E337、型別註解改寫（移除「Q-B 尚未裁決」） | OCC-M、本書 | 矩陣例外 6 組有契約測試；舊存檔缺 `sub` 開檔不壞；新增種類只改 JSON | 0.5～1 |
| OCC-3a 太守府與大廳任務遷入 | `governance`、`hallMission` 由唯讀轉接器改可寫；舊旗標改唯讀投影 | OCC-2 | 太守任命與任務牆接人走 `acquire`；`hallBusyGeneralIds` 移除 | 1 |
| OCC-3b 派遣與傭兵遷入 | `dispatch`、`mercenary` 遷入 | OCC-3a | 派遣、傭兵出戰互斥測試；舊存檔轉入 | 1 |
| OCC-3c 歷練與待產哺乳遷入 | `expedition`、`medical`（`pregnant／nursing／injured`）遷入，與 9198 卡 7（母乳與乳母）併做 | OCC-2、9198 | 待產 2 季、哺乳期不可出征、可守城可當太守 | 1 |
| OCC-4 出征接戰場 | `campaign`：戰場陣容選將走 `filterFree`、部署 `acquire`、戰後釋放；守城 `sub=defense` | OCC-2、OCC-3c；**戰場專家** | 哺乳母親與被指派教官不在出征候選；守城仍可選；AI 託管挑人排除占用者 | 1 |
| OCC-5 網路 adapter 與事件 | `occupancy.changed` 事件、網路 adapter 契約測試、`check-api-bypass` 新規則 | OCC-2、網路 adapter 卡 | 同案例兩個 adapter 結果一致；繞過基準只減不增 | 0.5～1 |
| OCC-6 武將詳情占用顯示 | 武將詳情與派任前提示「目前狀態」與「派去後會失去的選項」（家業規格 10.1） | OCC-2、UI 卡 | 顯示文案與 `occupancy.query` 一致，不另算 | 0.5 |
