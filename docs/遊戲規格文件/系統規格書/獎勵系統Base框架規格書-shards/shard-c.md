# 獎勵系統Base框架規格書（分片索引） — 11–12 伺服器 API、轉蛋改走獎勵框架（軟保底、機率公開、遷移、卡片切分）

> 這是 `獎勵系統Base框架規格書.md` 的「11 伺服器 API（端點、Schema、權威欄位、錯誤碼、事件）」分片。完整索引見 `docs/遊戲規格文件/系統規格書/獎勵系統Base框架規格書.md`。

<!-- doc_id: doc_spec_1263 -->

## 11. 伺服器 API

> 共通封包、冪等、權威、同步、存檔原則見 `共用框架總綱規格書.md (doc_spec_1182)` 第 5 章；本章只列獎勵端點。獎勵是最需要伺服器權威的框架：抽取、保底、發放都在伺服器（單機＝本機伺服器 adapter）。

### 11.1 命令與查詢

| 名稱 | 類型 | 說明 |
|---|---|---|
| `reward.pools` | 查詢 | 可見獎池與**完整機率表**（各等階與每個項目／角色的實際機率、保底規則；公開機率說明鈕的唯一資料來源，見第 12.4 節） |
| `reward.pity` | 查詢 | 某獎池保底進度（目前計數、硬保底門檻、軟保底起點、下一抽目前機率；不回亂數種子） |
| `reward.draw`（實作命名為 `reward.roll`，PROG-2-9205） | 命令（需 idemKey） | 對指定獎池抽取並入帳；由伺服器產生 `GrantPlan`、結算、回傳結果與演出參數 |
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

- 轉蛋現行 `GachaApi`（`GACHA_API_VERSION=1`，路由 `/gacha/pools｜wallet｜pull｜history`）的 DTO 與錯誤碼保留為 `reward.draw`（轉蛋卡池）的 args／result 與 `reason`；整併已由使用者 11/21 裁決 #9 決定：轉蛋抽獎改走 `reward.roll`。**遷移完成前 `GachaApi` 維持現狀並行**，完成後 `GachaApi` 只剩畫面用的薄包裝（池列表、錢包、歷史查詢轉呼叫 `reward.pools／wallet／history`），抽取一律 `reward.roll`；步驟見第 12 章。
- `GachaSyncRecord`（doc_spec_0469）作為 `reward.draw` 的同步記錄格式。
- 離線補播：登入時伺服器回傳未播放的 `reward.pending`，客戶端依序播放演出，帳目早已入帳。

## 12. 轉蛋改走獎勵框架：軟保底、機率公開、遷移方案與實作卡切分

> 依據：使用者 2026-11-21 裁決 #9（轉蛋改用獎勵框架抽獎：轉蛋保留畫面與演出，抽獎、權重、保底改由 RWD 計算）、#10（硬保底，接近保底時機率漸升）、#11（公開完整機率表，每個池都有機率說明鈕）。保底數值由 PM 設計。

### 12.1 原則

1. **轉蛋是獎勵系統的一池**：所有卡池（三國名將池、紅顏天香池、宿命池、**教官池 `POOL_SUPPORT`**、限定池、活動池）都是 `reward-pool.v1` 設定，不得另寫抽樣或保底程式。
2. **分工**：轉蛋保留「畫面、演出、登場台詞、池切換、貨幣選擇介面、宿命池流程」；獎勵框架負責「抽、權重、保底、記帳、入帳、機率表」。扣款走商店與錢包（E301～E303），入庫走物品庫存。
3. **機率只有一個來源**：引擎實際用的權重就是公開的機率；機率說明鈕的資料由 `reward.pools` 產出，UI 與文案不准手寫任何機率數字。
4. **先結算後演出**（沿用第 4 章規則 1）：十連結果先入帳再播 `gachaReveal`，跳過或閃退不影響帳目。

### 12.2 分工對照

| 項目 | 轉蛋保留 | 交給獎勵框架（`reward.*`） |
|---|---|---|
| 畫面與演出 | 全螢幕抽卡面板、池切換、卡池主視覺、`gachaReveal`、登場台詞、各池自己的版面 | 只送 `presentation` 參數與已定結果 |
| 抽樣與權重 | 無 | `reward.roll`：加權抽取、不重複抽樣、等階群組佔比、固定名額 |
| 保底 | 無 | 硬保底、軟保底、多條階梯、計數存存檔、`reward.pity` 查詢 |
| 機率公開 | 機率說明鈕與面板（顯示） | `reward.pools` 產出完整機率表 |
| 扣款 | 選貨幣介面 | 商店成交後帶 `dealId` 呼叫 `reward.roll`（憑證核對，第 11.2 節） |
| 重複卡處理 | 顯示「轉為經驗」文案 | 重複卡轉換為 `reward-bundle` 後處理（doc_spec_0467） |
| 宿命池 | 開場流程、無限重置畫面、確定鍵 | `draw.slots`（每輪固定一位六大宿命名將加九位不重複）、不收費、不計保底 |
| 天命商店 | 商店畫面 | 兌換額度由 `reward.pity` 的累計抽數推得（200 抽一個，doc_spec_0463） |

### 12.3 軟保底與硬保底公式

名詞：某條階梯針對保底等階 `T`（含以上），已連續未出 `T` 以上的次數為 `n`，本抽是第 `k = n + 1` 抽；`p0` 為 `T` 以上的基礎機率（由池內各等階權重自動算出，不手寫）；`H = hard.count`、`S = soft.startAt`、`γ = soft.curveExp`。

```
k <  S     : p(k) = p0
S <= k < H : p(k) = p0 + (1 − p0) × ((k − S + 1) / (H − S + 1))^γ
k >= H     : p(k) = 1          （硬保底：必出）
```

- 套用方式：把「`T` 以上」各等階的總機率抬到 `p(k)`，範圍內各等階依原比例放大；範圍外等階依比例縮小，總和維持 1；等階內各項目的相對權重不變。
- 多條階梯（例：SR 以上與 SSR）由高階往低階依序套用；每條只在目前機率低於 `p(k)` 時才抬高。
- 抽到 `T` 以上就把該階梯計數歸零；抽到更高階也同時歸零所有較低階的階梯。
- `soft = null` 表示只有硬保底（沿用現有 `hardCount` 行為，現有設定與程式碼相容）。
- 同種子同計數同結果：軟保底只改變「機率」，不改變亂數序列的使用方式；`reward.roll` 的 trace 要記 `PITY_SOFT k=... p=...`。

設定欄位（擴充 3.1 的 `pity`，可為陣列）：

```json
"pity": [
  { "counterKey": "gacha.general.sr", "tier": "SR",
    "soft": { "startAt": 6, "curveExp": 1 },
    "hard": { "count": 10, "guaranteeTier": "SR" } },
  { "counterKey": "gacha.general.ssr", "tier": "SSR",
    "soft": { "startAt": 50, "curveExp": 2 },
    "hard": { "count": 90, "guaranteeTier": "SSR" } }
]
```

PM 設計的保底數值（基礎機率沿用現行規格，不改）：

| 卡池 | 階梯 | 基礎機率 `p0` | 軟保底起點 `S` | 曲線 `γ` | 硬保底 `H` | 平均幾抽出 | 說明 |
|---|---|---|---|---|---|---|---|
| 三國名將池 | SSR | 3% | 50 | 2 | 90 | 約 28.5 抽 | 第 60 抽 10%、70 抽 28.4%、80 抽 58.5%、89 抽 95.3%、90 抽 100% |
| 三國名將池 | SR 以上 | 13% | 6 | 1 | 10 | 約 5.0 抽 | 十連至少一張 SR 以上；第 6 抽 30.4%、9 抽 82.6% |
| 紅顏天香池 | SSR | 2.5% | 30 | 2 | 50 | 約 24.9 抽 | 取代原 50 抽大保底 UP；第 40 抽 29.3%、45 抽 59.1%、49 抽 90.9% |
| 紅顏天香池 | SR 以上 | 15% | 3 | 1 | 5 | 約 3.1 抽 | 取代原 5 抽小保底；第 3 抽 43.3%、4 抽 71.7% |
| 宿命池 | 無 | — | — | — | — | — | 免費、無限重置、不計保底 |
| 教官池（連線卡，11/21 下午恢復，PROG-2-9230） | SSR | 3% | 50 | 2 | 90 | 約 28.5 抽 | 第 60 抽 10%、70 抽 28.4%、80 抽 58.5%、89 抽 95.3%（與名將池完全一致，11/22 裁決）；貨幣連線券與靈玉，不收銀兩 |
| 教官池 | SR 以上 | 20%（SR 17%＋SSR 3%） | 6 | 1 | 10 | 約 4.0 抽 | 第 6 抽 36.0%、9 抽 84.0%、10 抽 100% |

> 「平均幾抽出」為基礎機率加軟保底的理論期望值（解析計算）。上表是設計值，上線前由獎勵 base 的單元測試以公式逐點驗證；數值再調整只改 JSON。UP 佔比（SSR 70%、SR 80%）與天命商店 200 抽兌換維持 doc_spec_0042／0463 現值。

### 12.4 機率公開：`reward.pools` 完整機率表與機率說明鈕

**機率說明鈕（UI 契約）**：每個卡池（含宿命池）的主畫面都有一顆「機率說明」鈕，不必先抽就看得到；點開顯示：(1) 各等階機率；(2) 每個角色的個別機率（UP 角色標記）；(3) 保底規則（硬保底門檻、軟保底起點與漸升方式、目前保底進度與下一抽機率）；(4) UP 佔比、重複卡處理與天命商店兌換規則；(5) 資料版本與更新日期。

**資料來源**：全部由 `reward.pools` 產出；畫面與文案不准手寫機率。實作上現有 `core/systems/GachaPoolGuide.ts` 與 `ui/core/GachaPoolGuidePresenter.ts` 改為只讀 `reward.pools` 結果。

名單展開：池設定的項目可用名冊查詢（`rosterQuery`）與等階內群組佔比（`tierGroups`）表達，載入時由 `reward.pools` 展開為逐角色項目，不手寫每位角色：

```json
"tierGroups": { "SSR": [ { "group": "up", "share": 0.7 }, { "group": "normal", "share": 0.3 } ] },
"entries": [
  { "tier": "SSR", "group": "up",     "rosterQuery": { "ref": "gacha.general.upList" } },
  { "tier": "SSR", "group": "normal", "rosterQuery": { "rarity": "SSR", "gender": "male" } }
]
```

`reward.pools` 回應（每項機率以小數表示，伺服器計算；顯示時百分比取到小數點後 3 位，以最大餘數法讓同層總和等於 100.000%）：

```json
{ "pools": [ {
  "poolId": "POOL_GENERAL_MAIN", "nameKey": "gacha.pool.general", "disclosureVersion": "2026-11-21",
  "currency": ["jade", "oracleToken"],
  "tiers": [
    { "tier": "SSR", "baseRate": 0.03, "effectiveRate": 0.0312,
      "entries": [ { "entryId": "e_zhangfei", "nameKey": "general.zhangfei", "rate": 0.0210, "isUp": true } ] }
  ],
  "pity": [ { "tier": "SSR", "counter": 51, "softStartAt": 50, "hardAt": 90, "nextPullRate": 0.0393 } ],
  "rules": [ "pity.hard", "pity.soft", "up.share", "duplicate.convert", "destiny.exchange" ]
} ] }
```

驗證規則：(1) 每個等階的角色機率相加等於該等階機率，各等階相加等於 1；(2) `reward.pools` 的數字與 `rollPool` 實際使用的權重為同一份資料，單元測試以解析計算與十萬次蒙地卡羅（誤差小於 0.5 個百分點）雙重核對；(3) 檢查規則：轉蛋 UI 程式碼不得出現寫死的機率常數。

### 12.5 現有轉蛋規格加註（抽獎改走 RWD）

下列規格已加註「抽獎改走獎勵框架 doc_spec_1186（使用者 11/21 裁決 #9～#11）」，原規格的畫面、貨幣、演出、記帳條文保留，**抽樣、權重、保底條文以本章為準**：

| 規格 | doc_id | 加註重點 |
|---|---|---|
| 轉蛋系統（含 §L、三池分工 B-1 與入池機率表） | doc_spec_0042 | 抽獎改走 `reward.roll`；入池機率表的小保底 50 改為第 12.3 節硬保底加軟保底；支援卡（教官）池 11/21 上午依裁決 #4 退場，**下午恢復**為第四個池 `POOL_SUPPORT`（連線卡，學府修業專用），池規格見 doc_spec_1264 第 16、17、22.4 節；三池分工改為四池分工 |
| 轉蛋抽取引擎單抽十連與降階抽樣演算法 | doc_spec_0462 | 抽樣引擎改為 `rollPool`（`shared/reward/`）；降階抽樣以保底階梯表達 |
| 轉蛋雙重保底機制與天命商店解鎖記帳 | doc_spec_0463 | 50 抽小保底改為硬保底加軟保底；200 抽天命商店兌換額度保留 |
| 轉蛋貨幣分流付費靈玉免費銅錢符與求籤令定向扣款 | doc_spec_0464 | 扣款走商店與錢包不變，成交後帶憑證呼叫 `reward.roll` |
| 轉蛋同名武將戰法隨機生成與重複轉經驗 | doc_spec_0467 | 重複卡轉換為 `reward-bundle` 後處理 |
| 開場宿命轉蛋無限重置十連抽與初始名將鎖定（OPEN-05） | doc_spec_0471 | 宿命池以 `draw.slots` 與不重複抽樣表達 |
| 紅顏天香轉蛋女將卡池五轉小保底與來源名冊（FEM-03） | doc_spec_0645 | 5 抽小保底、50 抽大保底改為第 12.3 節兩條階梯；起始好感 60 不變 |

### 12.6 遷移方案：要改的程式位置

| 現有位置 | 現況 | 遷移後 |
|---|---|---|
| `core/systems/GachaDraw.ts` | 加權抽樣與降階、不重複抽樣 | 抽樣核心退場，改呼叫 `shared/reward/RewardRules.rollPool`；`RewardRules` 先補軟保底、多階梯、群組佔比、`draw.slots` |
| `core/systems/GachaSystem.ts` | 保底與抽數記帳 | 計數存 `rewardMeta.pity[counterKey]`；累計抽數由獎勵紀錄推得 |
| `core/systems/GachaLocalRules.ts` | 池規則寫在程式 | 轉成 `reward-pool.v1` JSON（`assets/resources/data/reward/`） |
| `core/gacha/GachaApi.ts`、`LocalGachaApi.ts` | 抽卡 API（`GACHA_API_VERSION=1`） | 抽取呼叫 `reward.roll`；池列表、錢包、歷史查詢保留為薄包裝；DTO 與 `reason` 相容，版本升 2 |
| `core/systems/GachaCurrency.ts` | 貨幣分流扣款 | 改接商店與錢包 port，成交後取得 `dealId` 帶入 `reward.roll` |
| `core/systems/GachaSyncRecord.ts` | 同步記錄（doc_spec_0469） | 作為 `reward.roll` 的記錄格式，不另存一份 |
| `core/systems/DestinyGacha.ts`、`DestinyPool.ts`、`DestinyOpening.ts` | 開場獨立狀態機 | 收斂為宿命池：狀態機只剩 UI 流程，抽取走 `reward.roll`（`draw.slots`） |
| `core/systems/DestinyShop.ts` | 天命商店兌換額度 | 額度改讀 `reward.pity` 累計抽數與 `destinyExchanges` |
| `core/systems/GachaPoolGuide.ts`、`ui/core/GachaPoolGuidePresenter.ts` | 卡池說明 | 改為只讀 `reward.pools`，即機率說明鈕資料來源 |
| `ui/core/GachaFullScreenPanel.ts`、`GachaFlowCoordinator.ts`、`GachaPoolSwitcher.ts` | 抽卡畫面與流程 | 畫面保留（使用者裁決：轉蛋保留畫面與演出），只換呼叫與機率鈕 |
| `core/systems/WishPool.ts` | 許願池 | 免費許願軌改走獎勵（本書第 7 章已列）；不在本次切分內 |

存檔遷移：舊存檔的連續未出 SR 以上次數轉為 SR 階梯計數（超過 `H−1` 取 `H−1`）；SSR 階梯計數由歷史記錄推得，推不出者從 0 起算；`destinyExchanges` 原值保留；缺值補預設，舊存檔開檔不壞。遷移完成前新舊並行（`GachaApi` v1 不變），以旗標切換，確認機率表與實測一致後才關閉舊路徑。

### 12.7 實作卡切分（只列建議，不開卡）

| 卡（暫名） | 範圍 | 依賴 | 驗收 | 估計 |
|---|---|---|---|---|
| GCH-R1 獎勵引擎補軟保底 | `RewardConfig`／`RewardRules`：`pity` 陣列、`soft`、群組佔比 `tierGroups`、`draw.slots`、不重複抽樣；舊單一 hard 設定結果不變 | RWD-M（PROG-2-9205） | 12.3 表的每個點有單元測試；同種子同結果；舊設定回歸測試通過 | 1 |
| GCH-R2 完整機率表 | `reward.pools` 展開名冊並輸出等階與逐角色機率、保底規則、下一抽機率；`reward.pity` 補欄位 | GCH-R1 | 機率總和為 1；與引擎權重為同一份資料；蒙地卡羅十萬次誤差小於 0.5 個百分點 | 1 |
| GCH-R3 卡池 JSON 化 | 名將池、紅顏池、宿命池轉 `reward-pool.v1`；名冊查詢；UP 設定；**教官池 `POOL_SUPPORT`（依 doc_spec_1264 第 22.4 節，補 `itemQuery` 與效果 `supportCard`，見實作卡 SUP-10）** | GCH-R1 | 三池資料可載入；無任何寫死在程式的池規則 | 1 |
| GCH-R4 抽取遷移 | `GachaApi.pull` 改 `reward.roll`；扣款走商店與錢包；重複卡轉換 bundle；旗標並行 | GCH-R2、GCH-R3、ITM-M、SHP 扣款 | 單抽、十連、扣款失敗整筆回滾、重送冪等；舊 DTO 相容 | 1～2 |
| GCH-R5 保底存檔遷移 | 舊計數轉階梯、`destinyExchanges` 保留、天命商店額度改讀 `reward.pity` | GCH-R4 | 三種舊存檔（有歷史、無歷史、空）開檔正確 | 0.5～1 |
| GCH-R6 機率說明鈕與面板 | 每個池一顆鈕、面板顯示等階與逐角色機率、保底規則與進度；資料只讀 `reward.pools`；i18n | GCH-R2；UI 卡 | 每個池可開啟；畫面數字與 `reward.pools` 一致；截圖驗收；UI 無寫死機率 | 1～2 |
| GCH-R7 宿命池遷移 | 開場流程收斂為宿命池 UI；抽取走 `draw.slots`；每輪恰一位六大宿命名將、十位不重複 | GCH-R4 | 新手開場流程不變；無限重置；確定鍵收全部 | 1 |
| GCH-R8 清理 | 移除舊抽樣與保底程式、`check-api-bypass` 加規則（禁直接呼叫舊抽樣） | GCH-R4～R7 | 繞過基準只減不增；舊路徑不可達 | 0.5 |

### 12.8 第四池：教官池（PROG-2-9230，11/21 下午）

教官池 `POOL_SUPPORT` 是本章的第四個卡池，抽取、保底、機率公開全部沿用第 12.1～12.4 節，只有這些差異：

| 項目 | 差異 |
| --- | --- |
| 抽到的東西 | 支援卡（物品，`effect.kind="supportCard"`），不是武將；項目用 `itemQuery` 展開（`rosterQuery` 的物品版） |
| 貨幣 | 連線券、靈玉；**銀兩永遠分開，不可購買教官池** |
| 重複卡 | 規則 `support.duplicate.limitBreak`：傳承 +1，傳承滿 4 次轉學分（`reward-bundle`） |
| 保底 | SSR 軟 50／硬 90；SR 以上 軟 6／硬 10（本章 12.3 表已列） |
| 資料 | `gacha-reward-pools.json` 新增 `POOL_SUPPORT`；完整 JSON 與逐卡機率見 1264 第 17、22.4 節 |
