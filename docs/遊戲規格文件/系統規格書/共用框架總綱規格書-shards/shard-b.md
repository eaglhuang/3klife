# 共用框架總綱規格書（分片索引） — 5 共通網路協定層（核心原則）

> 這是 `共用框架總綱規格書.md` 的「5 共通網路協定層（核心原則）」分片。完整索引見 `docs/遊戲規格文件/系統規格書/共用框架總綱規格書.md`。

## 5. 共通網路協定層（核心原則）

使用者定案：共用框架必須有一套共通 API，可透過網路協定與伺服器溝通，**不能只考慮單機**。單機版現在就要走同一套 API。

### 5.1 核心原則（硬規則，所有框架與玩法一律遵守）

1. **玩法與 UI 程式不准直接改重要數值，也不准直接寫存檔。** 重要數值包括：貨幣、庫存、獎勵、任務結算、技能等級、劇情旗標、聲望、武將屬性成長、保底計數器等。一律呼叫共用 API。
2. **單機時由「本機伺服器 adapter」實作這套 API。** 抽獎、結算、扣款、存檔都在這層完成。之後只把 adapter 換成網路 adapter，玩法與 UI 程式零修改。
3. **存檔也是 API 的一部分。** 進度讀寫、版本戳、增量或全量都走同一套命令；格式與未來伺服器同步相容（沿用既有 `/sync/delta`、`/sync/full`、`baseHash`、`ActionRecord`）。
4. **現有程式盤點**列出目前直接改數值、直接寫存檔的地方，給遷移清單與優先序（見 5.9）。
5. **實作卡第一張**是「共通 API 層＋本機伺服器 adapter＋存檔走 API」，各框架 base 都依賴它（見第 9 章）。
6. **可自動檢查**：以 lint／腳本／測試防止玩法程式繞過 API（見 5.10）。

### 5.2 分層與位置

```
玩法 / UI（assets/scripts/ui, battle, core/systems 的包裝）
        │  只呼叫 IApiClient（命令與查詢）；只讀「檢視快取」
        ▼
共通 API 契約（assets/scripts/shared/api/：封包型別、錯誤碼、命令表；零依賴，伺服器可直接 import）
        │
   ┌────┴─────────────────────┐
   ▼                          ▼
本機伺服器 adapter           網路 adapter
(assets/scripts/core/api/local/)   (assets/scripts/core/api/remote/)
 - 權威邏輯：抽獎、結算、扣款      - 封包編碼、HTTPS、重送、退避
 - 自己的「伺服器側存檔」          - 連到真伺服器（server/src）
 - 同一份框架純邏輯（base）         
```

- 各框架的純邏輯（`IItemStore`、`IShopService`、`IRewardService`、任務引擎、技能引擎、演出腳本解譯）是**伺服器側邏輯**，本機 adapter 直接呼叫它，真伺服器 `server/` 也以同一份純邏輯實作（引擎中立、不 import `cc`）。
- 玩法程式持有的是**檢視快取（ReadModel）**：由 API 回應與推送事件更新，只讀，不可自行改寫。UI 的臨時狀態（選中、捲動）不在此限。
- 本機 adapter 的「伺服器側存檔」與玩家端檢視快取分開存放；轉成連線模式時，伺服器側存檔即可用 `/sync/full` 上傳作為初始快照。

### 5.3 封包格式（所有框架共用）

請求（命令）：

```json
{
  "v": 1,
  "reqId": "r_20261120_000123",
  "idemKey": "shop.buy:SHOP_BAIBAOGE:L_VITALITY_PILL:p1:s812:n7",
  "cmd": "shop.buy",
  "saveRev": 812,
  "clientTime": 1763650000000,
  "args": { "shopId": "SHOP_BAIBAOGE", "listingId": "L_VITALITY_PILL", "qty": 2 }
}
```

回應：

```json
{
  "v": 1,
  "reqId": "r_20261120_000123",
  "ok": true,
  "saveRev": 813,
  "serverTime": 1763650000123,
  "result": { },
  "delta": [ { "path": "/inventory/ITEM_VITALITY_PILL", "op": "replace", "value": 5 } ],
  "events": [ { "evt": "inventory.changed", "rev": 813, "data": {} } ]
}
```

失敗：`{ "v":1, "reqId":"…", "ok":false, "errorCode":"E203", "reason":"SOLD_OUT", "message":"…", "retryable":false }`。

- `v`：協定版本；伺服器拒絕過舊版本回 `E005 SCHEMA_TOO_OLD`（沿用）。
- `reqId`：每次請求唯一；`idemKey`：同一個玩家意圖的重送必須帶同一個值（見 5.4）。
- `saveRev`：存檔版本戳（單調遞增整數），搭配既有 `baseHash`（SHA-256）做衝突偵測。
- 命令路由：`POST /api/v1/cmd`（單一命令或陣列批次，批次內可宣告 `atomic:true`）；查詢：`GET /api/v1/q/<name>`；事件：長連線推送或 `GET /api/v1/events?since=<rev>` 輪詢。單機時這些都只是函式呼叫，路徑與命令名稱不變。
- 錯誤碼分段（沿用 E001～E099 為傳輸與同步層，見 doc_spec_0655；新增分段，需同步登記到該文件）：

| 範圍 | 層級 |
|---|---|
| E001～E099 | 傳輸、驗證、同步（既有，原樣沿用） |
| E100～E199 | 共通命令層：重複請求、saveRev 衝突、權限、維護中 |
| E200～E299 | 買賣商店 |
| E300～E399 | 物品庫存 |
| E400～E499 | 任務 |
| E500～E599 | 獎勵 |
| E600～E699 | 技能 |
| E700～E799 | 劇情（演出） |

既有字串碼（`GachaApiErrorCode`、`MissionErrorCode` 等）保留為 `reason`，`errorCode` 由對照表映射，畫面可繼續依 `reason` 顯示。

共通命令層（E1xx）：`E101 DUPLICATE_REQUEST`（冪等命中，附原結果）、`E102 REV_CONFLICT`（saveRev 落後）、`E103 FORBIDDEN_FIELD`（客戶端嘗試傳入權威欄位）、`E104 MAINTENANCE`、`E105 COMMAND_UNKNOWN`、`E106 BATCH_PARTIAL_REJECT`。

### 5.4 冪等與防重送

- 所有「會改狀態」的命令必須帶 `idemKey`；伺服器（本機 adapter 亦同）保存 `idemKey → 結果` 一段時間（預設 24 小時或最近 500 筆），重送回傳**原結果**且不再執行，回應帶 `E101` 標記但 `ok:true`。
- `idemKey` 由「命令名＋對象＋玩家＋saveRev＋本機單調序號」組成；斷線重送沿用同一個。
- 領獎、購買、擲骰、開寶、結算任務必須有伺服器端的「已領取／已成交」標記作第二道防線，不得只靠 idemKey。
- 排隊：同一玩家的狀態命令在伺服器端序列化執行；客戶端同一對象的命令鎖在 UI 層防連點（只是體驗，不是安全）。

### 5.5 伺服器權威原則

**一定由伺服器（或本機伺服器 adapter）計算**，客戶端只能預覽與演出：

| 類別 | 伺服器算 | 客戶端可做 |
|---|---|---|
| 抽獎／掉落／骰子／轉盤結果 | 結果與保底推進 | 演出（動畫、揭示順序），不可自選結果 |
| 商店購買 | 價格、折扣、限購、扣款、發貨 | 報價預覽（以最近一次伺服器報價為準） |
| 庫存變動 | 所有增減與移轉、容量判定 | 顯示 |
| 獎勵發放與懲罰 | 內容、縮放、截斷、入帳 | 演出 |
| 任務結算 | 成敗判定、擲骰、帳本 | 顯示進度估計 |
| 技能習得／升級 | 判定與扣點 | 預覽效果 |
| 劇情旗標與選項後果 | 旗標寫入、獎懲 | 播放、本地「已看」緩存 |
| 時間 | 季／日／週重置、到期 | 僅顯示倒數 |
| 存檔 | 唯一真相 | 檢視快取 |

客戶端可傳入的只有「意圖」（命令與選擇）與非權威欄位；若在命令中夾帶權威欄位（價格、數量結果、獎勵內容、時間）→ `E103`。

### 5.6 樂觀更新、回滾、斷線重送、對帳

- **樂觀更新**：只允許在「低風險、可回滾」的命令（開關、排序、已讀）；涉及貨幣、庫存、獎勵的命令預設**不做樂觀更新**，等回應再更新並播演出（可先播「處理中」）。
- **回滾**：樂觀更新失敗（`ok:false` 或 `E102`）時，檢視快取還原到命令前快照並提示。
- **斷線重送**：未收到回應的命令保存在「待送佇列」（持久化），重連後依序以原 `idemKey` 重送；以 `E101` 回應視為成功並對帳。
- **對帳與同步**：
  - 每個回應帶 `saveRev`；客戶端本地 rev 與伺服器差一個以上就拉增量。
  - **增量**：`GET /api/v1/events?since=<rev>`（事件）＋既有 `POST /sync/delta`（存檔補丁）；**全量**：既有 `POST /sync/full`；`E011 BASE_HASH_MISMATCH` 自動退全量（沿用）。
  - 推送事件（各框架列於自己的「伺服器 API」章）：`shop.rotated`、`inventory.changed`、`quest.progress`、`reward.granted`、`skill.changed`、`story.flag`、`save.rev`。
  - 事件必須可重複套用（以 `rev` 去重、以最新 rev 為準）。

### 5.7 存檔即 API

存檔命令（單機與連線同一套）：

| 命令 | 說明 |
|---|---|
| `save.load` | 讀取進度；回 `saveRev`、`snapshot`（沿用 `PlayerSaveSnapshot`）、`serverTime` |
| `save.commit` | 玩家端非權威欄位的增量補丁（RFC 6902，路徑白名單）；帶 `baseHash`、`saveRev` |
| `save.full` | 全量上傳（換機、首次連線、`E011` fallback）；Gzip＋Base64，≤5MB |
| `save.rev` | 只問目前 `saveRev` 與 hash（輕量對帳） |

規則：
1. 權威欄位（5.1 所列）**只能由命令的副作用改變**，不能經 `save.commit` 補丁寫入；補丁白名單分兩類：`clientOwned`（偏好、已讀、收藏、介面）可寫；`critical`（貨幣、庫存、任務、技能、旗標…）補丁一律 `E002 PATCH_PATH_FORBIDDEN`。
2. 本機 adapter 在每個狀態命令成功後，由 adapter 自己原子寫入伺服器側存檔並遞增 `saveRev`，玩法程式不寫檔。
3. 存檔格式維持現有 `PlayerSaveSnapshot`（含 `validatePlayerSaveSnapshot` 缺值相容）；新增欄位只增不改，舊檔缺值補預設。
4. 滾動雜湊鏈（`SyncHash`）與簽章（`E021`）沿用，防本機外掛竄改。

### 5.8 單機與連線兩種模式用同一介面

```ts
interface IApiClient {
  cmd<T>(name: string, args: unknown, opts?: { idemKey?: string; optimistic?: boolean }): Promise<ApiResult<T>>;
  query<T>(name: string, args?: unknown): Promise<ApiResult<T>>;
  subscribe(evt: string, handler: (e: ApiEvent) => void): Unsubscribe;
  readonly view: ReadModel;          // 只讀檢視快取
  readonly mode: 'local' | 'remote';
}
```

- 玩法只持有 `IApiClient`；以依賴注入（`ServiceLoader`）在啟動時二選一綁定 `LocalApiAdapter` 或 `RemoteApiAdapter`。
- 兩個 adapter 必須通過同一份「契約測試」（同一組命令腳本，結果等價），這是保證零修改切換的依據。
- 既有範例：`GachaApi`／`LocalGachaApi`（`GACHA_API_VERSION=1`，註明「日後換伺服器實作」）與 `IMissionService`／`OfflineMissionService`，都已是同樣模式；本章把它們統一成同一個 `IApiClient`，現有 DTO 保留為各命令的 `args／result`。
- 模式切換設定：`api.mode = local | remote | hybrid`（hybrid＝只有存檔與帳號走遠端，用於逐步上線）。

### 5.9 現有程式盤點：直接改重要數值或直接寫存檔之處（遷移清單與優先序）

| 優先 | 位置 | 現況 | 遷移目標 |
|---|---|---|---|
| P0 | `core/managers/GameSession.ts`（約 6600 行的總管類） | 以 `this._inventory = addItem／consumeItem(...)` 直接改庫存，約二十餘處（試煉券、生育符、歸宗令、求籤令、轉職令、入學令、極限挑戰令、傳承令、掉落入庫等）；另直接持有貨幣、聲望等 | 全部改為 `item.*`／`reward.*`／`shop.*` 命令；GameSession 退化為檢視快取與編排 |
| P0 | `core/services/LocalGachaService.ts`（`spendCurrency`）、`GachaWalletRules.ts` | 直接扣貨幣、發錢 | 貨幣併入庫存／錢包命令（見庫存 Q2） |
| P0 | `core/services/PlayerSaveService.ts`、`GameSession` 存檔流程 | 玩法端直接組快照寫檔、讀檔 | `save.load／commit／full`，由 adapter 寫檔 |
| P1 | `core/systems/GachaDraw.ts`、`GachaSystem.ts` | 客戶端本機抽卡與保底計數 | 移入本機 adapter 的獎勵引擎（抽取在 adapter） |
| P1 | `core/mission/service/OfflineMissionService.ts` 與 `HallMission*` | 任務結算與帳本在本機服務 | 已近 adapter 型態，掛上 `quest.*` 命令 |
| P1 | 戰場結算（`BattleScene` 戰利品入庫、掉落） | 戰後直接入庫 | `reward.settleBattle` 命令（戰場事件列表由客戶端上報，伺服器核驗） |
| P2 | `TacticLearning`、`TacticLoadout`（技能習得與配置） | 由 GameSession 直接寫武將戰法 | `skill.learn／equip` |
| P2 | 劇情旗標、開場進度（`OpeningProgress` 等） | 直接寫旗標 | `story.setFlag` 由選項命令副作用寫入 |
| P3 | 設定、音效、收藏等 `localStorage` 使用（`AudioSystem`、`BattleSettingsView`、`HallChatLines`） | 直接寫 | 屬 `clientOwned`，列入豁免清單，不強制走命令 |
| P3 | 武將養成成長（屬性、經驗） | 直接改 | 隨獎勵 `generalExp` 效果與培育命令一起遷（培育另案） |

遷移策略：先建 API 層與本機 adapter（第 9 章第 1 張），再依優先序「一次遷一個框架」：先庫存與錢包（P0）、再存檔、再商店、獎勵、任務、技能、劇情。每個框架遷完，其繞過點從「基準清單」移除，基準只減不增（5.10）。

### 5.10 自動檢查規則

新增 `node tools_node/check-api-bypass.js`，納入 `compute-gate --profile quick／standard`：

1. **禁止清單（遷移完成後的終態）**：在 `assets/scripts/ui/**`、`assets/scripts/battle/**`、`assets/scripts/core/systems/**`（adapter 目錄除外）禁止：
   - 呼叫庫存寫入函式（`addItem`、`consumeItem`、`spendCurrency`、框架 `apply`）；
   - 直接 `import` `PlayerSaveService` 的寫入函式或使用 `localStorage`／`sys.localStorage`（`clientOwned` 豁免清單內的檔案除外）；
   - 對受保護欄位賦值（`_inventory =`、`fame +=` 等，清單放設定檔）。
2. **基準棘輪（遷移期）**：`tools_node/api-bypass-baseline.json` 記錄現有繞過點數；數量只准減少不准增加（比照 `tools_node/test-tsc-baseline.json` 作法）。新增繞過點即 exit 1。
3. **ESLint**：`no-restricted-imports` 禁止在 adapter 目錄外引用庫存／存檔寫入模組；`no-restricted-syntax` 禁止 `localStorage`。
4. **測試**：`tests/ApiBypassGuard.test.ts`（單元測試：以假程式碼片段驗證偵測器）與 `tests/ApiContract.test.ts`（本機 adapter 與網路 adapter 的 mock 契約等價測試）。
5. 例外需在檔案頂端寫 `// api-bypass-allowed: <原因>`，並由總 PM 審核（清單固定放設定檔，不得就地新增）。

### 5.11 防作弊要點

- 價格、機率、數量結果、獎勵內容、時間，一律伺服器決定；客戶端傳入者忽略或 `E103`。
- 抽取使用伺服器端亂數與保底計數，種子與計數不下發；回應只含結果與必要的演出參數。
- 命令頻率限制：沿用 `E008` 每分鐘上限；高價值命令（購買、領獎）另設每秒上限。
- 時間：以 `serverTime` 為準；本機模式以單調時鐘＋離線回撥偵測（沿用 doc_spec_0469 離線防回撥）。
- 重放與偽造：`idemKey`、`saveRev`、滾動雜湊鏈（`E021`）、HTTPS 與 PII 遮蔽（doc_spec_0683）。
- 異常偵測：保底計數倒退、庫存憑空增加、saveRev 回退，標記並上報。
- 本機模式明確承認：單機玩家可改本機檔，不視為安全邊界；以雜湊鏈提高門檻，真正權威在連線模式。

### 5.12 既有伺服器規格與程式（對齊慣例、相容與遷移）

| 既有項目 | doc_id／位置 | 新協定如何對齊 |
|---|---|---|
| 同步 API 規格書（`/sync/delta`、`/sync/full`） | doc_tech_0010 | 完全沿用；`save.commit`＝delta、`save.full`＝full，僅在外面包 `v／reqId／idemKey` |
| 同步 API 契約型別與錯誤碼 E001～E099 | doc_spec_0655 | 沿用並擴充分段（5.3），擴充內容須回寫該文件 |
| 伺服端存檔快照與靜態配置同步 | doc_spec_0334 | `save.load` 的快照格式 |
| 伺服器同步限流 429 與 5MB 413 | doc_spec_0656 | 命令層沿用 E007／E008 |
| 抽卡伺服端同步記錄與離線防回撥 | doc_spec_0469 | 獎勵／轉蛋命令的記錄格式；`GachaSyncRecord` |
| 伺服端裝備記錄表與客端同步協議 | doc_spec_0439 | 庫存的伺服器表（`server/schema/bag11-equip-row.ts`）；`stock-row` 對映 |
| 伺服端數值配表熱更新下發 | doc_spec_0662 | 設定 JSON（獎池、貨架、任務定義）以配表下發，客戶端以版本比對快取 |
| HTTPS 與 PII 遮蔽 | doc_spec_0683 | 所有封包遵守 |
| 官職系統權限快照 API | doc_spec_0591 | 權限檢查範例 |
| Data Schema（本機端與 Server 端） | doc_tech_0013 | 各框架 schema 草案需入此文件的表 |
| SYNC-06 補丁白名單 | `server/schema/sync06-patch-whitelist.ts`（PROG-2-1396）；WBS 在 `docs/cross-ref/wbs-matrix-shards/wbs-36-formula-architecture-backend-p2.md` | 白名單拆 `clientOwned`／`critical`（5.7）；不改現有驗證函式簽章，只擴充清單 |
| 伺服器程式 | `server/src/sync.ts`、`sync-limits.ts`、`sync-security.ts`；`server/schema/*.ts` 列驗證器；`shared/protocols.ts` | 新增 `server/src/api/`（命令路由）；契約型別放 `assets/scripts/shared/api/` 與 `shared/` 共用 |
| 客戶端同步 | `core/systems/SyncManager.ts`、`SyncHash.ts`、`NetworkService.ts`、`core/storage/CloudSyncGuard.ts`、`HallSyncSnapshot.ts` | 網路 adapter 的底層重用；`SyncManager` 退避狀態機沿用 |
| 既有 adapter 型態 | `core/gacha/GachaApi.ts`、`LocalGachaApi.ts`；`core/mission/service/IMissionService.ts`、`OfflineMissionService.ts` | 作為第一批納入 `IApiClient` 的命令組，DTO 沿用 |
| OPEN-12（Mock） | 本次索引未找到專屬文件 | 「本機伺服器 adapter」即為 Mock 伺服器的正式版；請總 PM 指認 OPEN-12 出處，確認不衝突 |

相容方式：
- **加封包不改內容**：`save.commit／save.full` 的 body 維持現有欄位，只在外層加 `v／reqId／idemKey`；舊客戶端不帶新欄位時，伺服器以預設值處理（`v=0` 視為舊協定，僅允許存檔命令）。
- **分階段**：階段 0（單機，本機 adapter 為權威，補丁白名單不變）→ 階段 1（測試連線，命令走網路、補丁白名單維持）→ 階段 2（上線，`critical` 路徑補丁一律拒絕）。
- 每階段都可回退到前一階段（切 `api.mode`），不需改玩法程式。
