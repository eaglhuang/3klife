# 人員占用系統Base框架規格書（分片索引） — 1–3 目的、核心概念、共用資料結構（種類、互斥矩陣）

> 這是 `人員占用系統Base框架規格書.md` 的「1–3 目的、核心概念、共用資料結構（種類、互斥矩陣）」分片。完整索引見 `docs/遊戲規格文件/系統規格書/人員占用系統Base框架規格書.md`。

<!-- doc_id: doc_spec_1249 -->
# 人員占用系統 Base 框架規格書

> 上層總綱：`共用框架總綱規格書.md (doc_spec_1182)`。本書是**第 7 個共用框架**（使用者 2026-11-21 裁決 #8：人員占用升格為第 7 個共用框架），所有「這個人現在忙不忙、被誰占著」的判斷一律走本框架，各玩法只做包裝與差異設定。
> 相關框架：任務 (doc_spec_1185，學府占用 refId 與任務實例共用)、物品庫存 (doc_spec_1184)、獎勵 (doc_spec_1186)、技能 (doc_spec_1187)、劇情 (doc_spec_1188)、買賣商店 (doc_spec_1183)。
> 任務卡：PROG-2-9207（OCC-M 精簡版實作，已合併）、PROG-2-9218（本書）。狀態：定案版（人員占用成為框架已由使用者裁決；數值與互斥例外由 PM 裁決，見第 10 章）。

## 1. 目的與範圍

使用者定案：很多系統本質相同；「誰被占用」現在散在八處各自查，必須收成一個共用框架。

現況八處各自記狀態（總綱 11.2 候選 A 盤點，家業規格 10.1 矩陣為其來源）：

| 占用種類 `kind` | 玩家看到的名稱 | 現況記在哪 | 本框架中的狀態 |
|---|---|---|---|
| `academy` | 學府修業（36 回合） | 學府存檔 | 可寫（OCC-M 已做） |
| `mentorAssign` | 教官指派（教官就是武將，11/21 裁決 #4） | 無（新增） | 可寫（OCC-M 已做） |
| `governance` | 太守府政務槽 | 領地治理 | 唯讀轉接器，第二版遷入可寫 |
| `hallMission` | 大廳任務、任務牆 | `hallBusyGeneralIds` | 唯讀轉接器，第二版遷入 |
| `dispatch` | 派遣 | `DispatchJobs` | 唯讀轉接器，第二版遷入 |
| `mercenary` | 傭兵出戰、義勇營 | 傭兵系統 | 唯讀轉接器，第二版遷入 |
| `expedition` | 10 歲歷練 | 歷練存檔 | 唯讀轉接器，第二版遷入 |
| `medical` | 待產（2 季）與哺乳、輕重傷 | 人物旗標 | 唯讀轉接器，第二版遷入；子狀態 `sub` 區分；**`injured` 另有伺服器 API 寫入口，見下方「`medical:injured` 寫入口」**（已與戰場專家對齊（11/28 審查））|
| `campaign` | 出征（含守城防衛 `sub=defense`） | 戰場陣容 | **新增**，第二版接戰場陣容篩選 |
| `estate`（預留） | 家業職缺 | 無（家業 E0 才有） | 預留，由家業 E0 接入（doc_spec_1181） |

範圍內：占用登記、互斥判定、查詢、候選清單過濾、釋放、冪等、存檔、網路 adapter、占用變更事件。
範圍外：各玩法自己的接取條件（如學府要 15 歲）仍歸各玩法；資格檢查只回報「是否忙碌」，不判斷「適不適任」。

## 2. 核心概念與名詞

- **占用（Occupancy）**：一筆「某人被某種來源占用」的紀錄，欄位見 3.1。
- **占用種類（kind）**：九種正式種類（上表前九列），第十種 `estate` 預留。
- **可寫種類／唯讀種類**：可寫＝登記表是唯一真相，經 `occupancy.acquire／release` 改變；唯讀＝原系統仍是真相，登記表只靠轉接器讀取，不改其狀態。每遷一處，由唯讀改可寫。
- **互斥矩陣（OccupancyMatrix）**：兩種占用能不能同時掛在同一個人身上，資料表驅動，見 3.3。預設互斥，只列「可共存」例外。
- **轉接器（Reader）**：唯讀種類由宿主提供的函式，每次查詢才呼叫、不快取。
- **子狀態（sub）**：同一種類下的細分（`medical` 的 `pregnant／nursing／injured`，`campaign` 的 `sortie／defense`）。
- **refId**：被什麼占用的來源物件；學府＝任務實例 id（`quest:<qid>`），與任務框架共用同一筆紀錄。

## 3. 共用資料結構

### 3.1 占用紀錄 `occupancy-record.v1`

```json
{ "personId": "g_zhaoyun", "kind": "medical", "sub": "nursing",
  "refId": "child:c_0007", "since": 12, "until": 15 }
```

- `since／until`：季為單位（呼叫端自定刻度，學府用「已過季數」）；`until=null` 表示到明確釋放為止；只讀轉接器沒有時間資訊時 `since=0`。
- `sub` 為第二版新增的選填欄位，舊存檔缺值視為 null，不破壞。
- 同一人同一 `kind` 只能有一筆；同種換 `refId` 視為衝突（現況行為，保留）。

### 3.2 占用種類設定 `occupancy-kind.v1`（`assets/resources/data/occupancy/`）

```json
{ "schema": "occupancy-kind.v1",
  "kinds": [
    { "id": "academy",      "writable": true,  "owner": "quest",      "labelKey": "occ.academy" },
    { "id": "mentorAssign", "writable": true,  "owner": "mentor",     "labelKey": "occ.mentorAssign" },
    { "id": "governance",   "writable": false, "owner": "governance", "labelKey": "occ.governance" },
    { "id": "hallMission",  "writable": false, "owner": "hallMission","labelKey": "occ.hallMission" },
    { "id": "dispatch",     "writable": false, "owner": "dispatch",   "labelKey": "occ.dispatch" },
    { "id": "mercenary",    "writable": false, "owner": "mercenary",  "labelKey": "occ.mercenary" },
    { "id": "expedition",   "writable": false, "owner": "expedition", "labelKey": "occ.expedition" },
    { "id": "medical",      "writable": false, "owner": "family",     "subs": ["pregnant", "nursing", "injured"], "labelKey": "occ.medical" },
    { "id": "campaign",     "writable": false, "owner": "battle",     "subs": ["sortie", "defense"], "labelKey": "occ.campaign" }
  ] }
```

新增一種占用只加一列設定與一個轉接器，不動框架。

### 3.3 互斥矩陣 `occupancy-matrix.v1`

預設：任何兩種占用互斥（一個人同時只做一件事）。以下為**可共存例外**（PM 裁決，依使用者 11/21 裁決 #15、#19 與家業規格 10.1）：

| 組合 | 條件 | 理由 |
|---|---|---|
| `medical(pregnant／nursing)` ＋ `governance` | 無 | 待產與哺乳可當太守、做內政（#19） |
| `medical(pregnant／nursing)` ＋ `hallMission` | 僅內政類（`category=domestic`） | 同上，低風險 |
| `medical(pregnant／nursing)` ＋ `estate` | 僅低風險崗位（商店、酒店、學院、歌劇廳） | 家業規格 10.1 例外 |
| `medical(nursing)` ＋ `campaign(defense)` | 無 | 哺乳期**不可出征但仍可守城**（9198 Q10，使用者 11/21 裁決 #15） |
| `mentorAssign` ＋ `governance` | 無 | 老將退居幕後當教官，可兼太守 |
| `mentorAssign` ＋ `estate` | 榮養位 | 家業規格 10.3 |

其餘全部互斥，包含：`mentorAssign` 與 `campaign`（被指派的教官不能出征，使用者 11/21 裁決 #4）、`medical(pregnant／nursing)` 與 `campaign(sortie)`、`mercenary`、`dispatch`、`expedition`；`medical(injured)`（輕傷、重傷皆同）**不再與出征、守城互斥**（使用者 11/28 裁決：傷者可出戰，只扣屬性，已與戰場專家對齊（11/28 審查）），但仍與 `mercenary`、`dispatch`、`expedition`、`academy` 互斥（暫定，沿用原規則）；`academy` 與一切（入學即自動卸任其他職務）。

```json
{ "schema": "occupancy-matrix.v1", "default": "exclusive",
  "allow": [
    { "a": "medical:pregnant", "b": "governance" },
    { "a": "medical:nursing",  "b": "governance" },
    { "a": "medical:pregnant", "b": "hallMission", "when": { "category": "domestic" } },
    { "a": "medical:nursing",  "b": "hallMission", "when": { "category": "domestic" } },
    { "a": "medical:nursing",  "b": "campaign:defense" },
    { "a": "medical:injured",  "b": "campaign:sortie" },
    { "a": "medical:injured",  "b": "campaign:defense" },
    { "a": "mentorAssign",     "b": "governance" }
  ] }
```

矩陣只存資料；`OccupancyCompatibility` 函式（現況全互斥的預設函式）改讀此表，呼叫端不動。

### `medical:injured` 寫入口（使用者 11/28 裁決；已與戰場專家對齊（11/28 審查））

`medical` 種類整體仍是唯讀轉接器（`writable:false`，owner＝family），**但 `sub=injured` 開一個可寫入口，一律走伺服器 API，客戶端不直接寫**：

- 寫入：`occupancy.acquire(kind=medical, sub=injured, level=light|severe, until=+1 季｜+2 季, refId=duel:<seed>:<季>)`；冪等，同一鍵重送不重複寫。呼叫端是生活單挑（QLIFE-01 第 6.4.1 節）與戰場名將重傷（`doc_spec_0720`）。
- **同一人只有一筆 `injured`**：再次受傷時不疊加，`level` 取較重者、`until` 取較晚者；戰場 WOUNDED 與生活單挑輕傷是同一個狀態。
- 屬性扣減：輕傷 −10%、重傷 −20%（暫定），走戰場既有 buff 乘算管線，取較重者，不疊加。
- **互斥表**：`injured` 與 `campaign(sortie／defense)` 可並存（見上方 allow 表），傷者可出征、可守城，只扣屬性。
- 釋放：休養期滿由季結算釋放，或醫館看診（輕傷痊癒、重傷降輕傷）。
- 主角不受傷：對主角本人（及主角代理頭）的 `acquire(injured)` 一律拒絕。
