# 人員占用系統Base框架規格書（分片索引） — 4–10 共用 API、包裝接入、依賴、存檔、盤點、驗收、裁決紀錄

> 這是 `人員占用系統Base框架規格書.md` 的「4–10 共用 API、包裝接入、依賴、存檔、盤點、驗收、裁決紀錄」分片。完整索引見 `docs/遊戲規格文件/系統規格書/人員占用系統Base框架規格書.md`。

<!-- doc_id: doc_spec_1250 -->

## 4. 共用 API（介面草案，引擎中立）

```ts
interface IOccupancyService {
  query(personId: string): OccupancyRecord[];                       // 某人所有占用（登記表＋轉接器）
  listAll(): OccupancyRecord[];
  isOccupied(personId: string): boolean;
  check(personId: string, kind: OccupancyKind, sub?: string): { ok: boolean; blockedBy?: OccupancyRecord };  // 預檢，不寫入
  filterFree<T extends string>(ids: readonly T[], kind?: OccupancyKind): T[];  // 候選清單過濾；給 kind 時以矩陣判斷「這種工作能不能接」
  acquire(input: AcquireInput): { acquired: boolean; record: OccupancyRecord };  // 冪等；衝突丟 OccupancyError('CONFLICT')
  release(input: ReleaseInput): boolean;                            // 冪等；refId 對不上丟 REF_MISMATCH
  snapshot(): OccupancyRecord[]; restore(raw: unknown): void;       // 存檔
}
type OccupancyReader = () => readonly OccupancyRecord[];            // 唯讀轉接器
```

規則：
1. **任何玩法接人前必須先 `check` 或 `acquire`**，不得再自己查旗標；`filterFree` 是所有候選清單（任務牆、派遣、傭兵、出征陣容、太守任命）的唯一過濾入口。
2. `acquire／release` 冪等：同一筆重送回既有紀錄（`acquired=false`），不報錯、不改 `since／until`。
3. 占用的「生命週期」由來源系統負責：任務結算釋放學府占用、教官指派撤銷釋放 `mentorAssign`、季結算釋放到期的 `medical`。框架不自己推時間，只提供 `until` 讓來源系統與季結算管線對帳。
4. 轉接器只讀；種類遷成可寫之後，該轉接器退場，原系統改呼叫 `acquire／release`。
5. 框架之間只能經 API 命令或事件互相呼叫；占用只被「問」，不主動改其他框架的狀態。

## 5. 各包裝如何只用差異設定接入

1. **學府修業**：任務實例開始時 `acquire(kind=academy, refId=quest:<qid>)`，結算或放棄時 `release`；一個學員同時只能有一個學府任務（已做，PROG-2-9207／9215）。
2. **教官指派（教官就是武將）**：指派武將為某班教官時 `acquire(kind=mentorAssign, refId=mentor:<assignId>)`；被指派者不可出征、不可接派遣與傭兵，可兼太守。**不再有教官卡**，教官資格（將階或 40 歲以上，使用者 11/21 裁決 #23）由指派命令檢查，不由占用框架檢查。
3. **待產與哺乳**：生育事件 `acquire(kind=medical, sub=pregnant, until=+2 季)`，生產後改 `sub=nursing`；哺乳結束釋放。出征陣容用 `filterFree(ids, 'campaign')`，`campaign(sortie)` 與 `medical` 互斥，所以哺乳母親自動排除出征、仍可守城（9198 Q10）。
4. **出征**：戰場陣容選將前用 `filterFree`，部署成功 `acquire(kind=campaign, sub=sortie)`，戰後釋放；守城為 `sub=defense`。戰場細節交戰場專家，本框架只提供占用判定（戰場核心規則不由本書定）。
5. **太守府、大廳任務、派遣、傭兵、歷練**：第二版各自改為可寫種類，轉接器退場；任務框架 (doc_spec_1185) 的派遣型任務接人一律先 `acquire`。
6. **家業職缺（預留）**：家業 E0 接入時新增 `estate` 種類，矩陣沿用家業規格 10.1；不另寫一套互斥表。
7. **AI 託管**：託管季自動結算小戰時，選人同樣走 `filterFree`，被占用者不會被託管挑中（9198 Q9，使用者 11/21 裁決 #15）。

## 6. 與其他框架的依賴

```
共通 API 層（總綱第 5 章）
   └─ 人員占用（OCC）  ← 最底層，只依賴 API 層與底層工具層（時鐘）
        ▲        ▲        ▲
   任務（QST）  獎勵（RWD，懲罰讓人受傷時 acquire medical.injured）  家業／學府／戰場（包裝）
```

- OCC 不依賴 QST；QST 在派遣型任務接取時呼叫 OCC。學府占用 refId 指向任務實例，兩者對同一筆紀錄的狀態一致，結算時 QST 先結算、再 `release`。
- 禁止循環：OCC 不得 import 任務、獎勵、技能內部狀態；與它們只經命令與事件溝通。

## 7. 存檔、相容與底層

- 存檔欄位 `occupancy`（現況：`GameSession.occupancyHost`），內容只含可寫種類的紀錄；學府占用讀檔後由學府任務實例對帳重建（現況行為，保留）。
- 讀檔缺值補預設空表；壞資料整筆忽略（`normalizeOccupancyRecord`）；新增 `sub` 欄位缺值視為 null。
- 種類遷成可寫時，遷移步驟：(1) 以轉接器資料一次性匯入登記表；(2) 原系統旗標改為讀登記表（唯讀投影）；(3) 一版之後移除原旗標。每遷一處配一張卡（第 12 章）。

## 8. 現有程式盤點與遷移建議

| 現有實作 | 位置 | 狀態 | 遷移說明 |
|---|---|---|---|
| 占用型別與服務（OCC-M） | `shared/occupancy/OccupancyTypes.ts`、`OccupancyService.ts` | 已合併（PROG-2-9207） | 型別註解仍寫「Q-B 尚未裁決」，OCC-2 卡一併改註；種類清單補 `campaign` |
| 本機命令 | `core/api/localserver/OccupancyCommands.ts`；命令定義 `shared/api/ApiCommands.ts`（`occupancy.query／acquire／release`） | 已合併 | 補 `occupancy.check` |
| 錯誤碼 | `shared/api/ApiErrors.ts`（E330～E334） | 已合併 | 補 E335～E337 |
| 存檔宿主 | `GameSession.occupancyHost`、`PlayerSaveService` 欄位 `occupancy` | 已合併 | 不動 |
| 學府呼叫端 | `ui/core/AcademyApi.ts`、`AcademyFlowController` | 已接（9215） | 不動 |
| 唯讀轉接器 | `GameSession.ts`、`ServiceLoader.ts`（六處讀取） | 已接 | 第二版逐處遷入可寫 |
| 戰場陣容、AI 陣容 | `battle/controllers/EnemyAI.ts`、`core/systems/AiLaneStrategy.ts` | 含「occupancy」字樣，與登記表無關 | 出征陣容接 `filterFree` 時由戰場專家排程 |
| 契約測試 | `tests/OccupancyBase.test.ts` | 已合併 | 補矩陣與 `sub` 測試 |

## 9. 驗收重點

- 新增一種占用只加一列 `occupancy-kind` 設定與一個轉接器；改互斥例外只改 `occupancy-matrix` 資料。
- 同一人修業中，任務牆、派遣、傭兵、出征候選皆排除；重送 `acquire／release` 結果相同。
- 哺乳母親不能列入出征陣容、可列入守城；教官不能出征、可兼太守。
- 舊存檔缺 `occupancy`／`sub` 欄位開檔不壞；轉接器全移除後行為不變。

## 10. 使用者與 PM 裁決紀錄

| 題 | 裁決 | 來源 |
|---|---|---|
| 人員占用是否成為獨立框架（總綱 Q-B） | **升格為第 7 個共用框架**（沒有併入任務） | 使用者 11/21 裁決 #8 |
| 教官與占用 | 教官就是武將，不設教官卡；指派教學走 `mentorAssign`，被指派者不可出征 | 使用者 11/21 裁決 #4 |
| 哺乳期母親可否出征（9198 Q10） | 不可出征，由 OCC `medical` 擋下；仍可守城、當太守、做內政 | 使用者 11/21 裁決 #15、#19 |
| AI 託管自動結算小戰（9198 Q9） | 每季自動結算；選人走 `filterFree` | 使用者 11/21 裁決 #15 |
| 互斥矩陣的可共存例外（3.3） | 如表列 6 組，其餘互斥 | PM 裁決（依家業規格 10.1 與上列裁決推得） |
| `campaign`、`estate` 種類與 `sub` 欄位 | 新增，欄位選填向下相容 | PM 裁決 |
| 網路 adapter 的占用事件與冪等鍵規則 | 同總綱第 5 章，不另立 | PM 裁決 |

> 仍待使用者決定的大方向：無（占用框架本身已定案）。守城能否由特殊狀態（如重傷）參加，屬戰場核心規則，交戰場專家與總 PM。
