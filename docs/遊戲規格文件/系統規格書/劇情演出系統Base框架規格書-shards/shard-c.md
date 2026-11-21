# 劇情演出系統Base框架規格書（分片索引） — 11 伺服器 API（端點、Schema、權威欄位、錯誤碼、事件）

> 這是 `劇情演出系統Base框架規格書.md` 的「11 伺服器 API（端點、Schema、權威欄位、錯誤碼、事件）」分片。完整索引見 `docs/遊戲規格文件/系統規格書/劇情演出系統Base框架規格書.md`。

## 11. 伺服器 API

> 共通封包、冪等、權威、同步、存檔原則見 `共用框架總綱規格書.md (doc_spec_1182)` 第 5 章；本章只列劇情端點。演出本身（動畫、音效、鏡頭）純屬客戶端表現，不經伺服器。

### 11.1 命令與查詢

| 名稱 | 類型 | 說明 |
|---|---|---|
| `story.available` | 查詢 | 目前可觸發的劇本（已依條件、優先序、佇列排序） |
| `story.start` | 命令（需 idemKey） | 開始劇本；伺服器登記並回傳節點圖與（需要時）本次隨機種子的衍生結果 |
| `story.choose` | 命令（需 idemKey） | 送出選項；伺服器結算後果（獎勵、旗標、任務、物品、技能）並回傳下一節點 |
| `story.complete` | 命令（需 idemKey） | 完成劇本；寫已看、解鎖 CG／圖鑑 |
| `story.flags` | 查詢 | 劇情旗標 |
| `story.markSeen` | 命令（clientOwned，可樂觀） | 僅標記已看（不產生後果的演出，如回放） |

### 11.2 Schema

```json
// story.choose 請求 args
{ "storyId": "STORY_BIRTHDAY_05_JOY", "choiceId": "c1", "optionId": "kind" }
// 回應 result
{ "next": "e_kind", "effects": [ { "kind": "reward", "grantId": "gr_0012", "settled": true }, { "kind": "flag", "set": "child.trait.gentle" } ],
  "presentation": [ { "module": "popup", "args": { "textKey": "story.b05.result_kind" } } ] }
```

### 11.3 伺服器權威欄位

觸發判定、劇本可否開始（條件與冷卻）、選項合法性、選項後果（獎勵、旗標、任務、物品、技能）、旗標寫入、完成與解鎖、隨機節點的抽選結果。客戶端傳入 `effects／flags／next` → `E103`。

### 11.4 錯誤碼（E34x）

> **分段回寫（總 PM 裁決，PROG-2-9208）：** 本書原寫 E701～E706，改為 **E340～E349**（E34x）；E7xx 不再使用。分段總表見 doc_spec_1182 第 5.3 節。

| 碼 | reason | 說明 | 狀態 |
|---|---|---|---|
| E340 | `STORY_NOT_FOUND` | 劇本不存在 | 已實作（PROG-2-9208） |
| E341 | `NOT_TRIGGERABLE` | 條件不符或已看且不可重看 | 已實作 |
| E342 | `NOT_STARTED` | 未先 `trigger` 就 choose，或 `choiceId` 不是劇本目前停住的選擇節點 | 已實作 |
| E343 | `INVALID_OPTION` | 選項不存在或不可選（條件） | 已實作 |
| E344 | `CHOICE_ALREADY_MADE` | 該選擇已做過且這次選了不同的選項（同選項重送回原結果、不報錯） | 已實作 |
| E345 | `QUEUE_CONFLICT` | 與必中斷事件衝突，需先處理（訊息附待處理劇本） | 已實作 |
| E346 | `EFFECT_UNSUPPORTED` | 後果效果種類沒有 handler | 已實作 |
| E347 | `EFFECT_FAILED` | 後果結算失敗（例如獎勵套件不存在），整筆不生效、劇本仍在佇列 | 已實作 |
| E348 | `STORY_UNAVAILABLE` | 劇情系統尚未就緒（可重試） | 已實作 |

### 11.5 推送事件

`story.available`（新劇情可觸發）、`story.flag`（旗標變更）、`story.interrupt`（必中斷事件，客戶端須插隊播放）。

### 11.6 遷移與相容

- **STY-M 最小版對映（PROG-2-9208）：** 實作命令為 `story.trigger`（合併規格的 `start`；無選項的劇本在 trigger 當場走完並寫已看，因此 MVP 不需要 `story.complete`）、`story.choose`、`story.available`、`story.pending`（打斷佇列，依單一優先序）、`story.seen`、`story.flags`；`story.markSeen` 延後。選項 id 即 `selectedOptionId`；後果的獎懲交 `reward.claim`（`grantKey=story:<instanceId>:<nodeId>:<序>`）。資料在 `assets/resources/data/story-config.json`，實作見 `assets/scripts/shared/story/` 與 `core/api/localserver/StoryCommands.ts`。學府打斷四種（期中、弱冠、共鳴、結業）與結業完成訊息已改讀此資料。
- 開場進度（`OpeningProgress`）、學府打斷（`pendingInterrupt`／`RESOLVE_INTERRUPT`，學府 doc_spec_1179）的現有狀態機即 `story.start／choose` 的特例；回放時以「先存後顯示」與重開自愈（重進後重新彈出未作答的打斷）對映本章的冪等與 `E705`。
- 舊存檔無劇情旗標與已看紀錄時以空值補；已完成的開場與舊事件視為已看，避免重播。
