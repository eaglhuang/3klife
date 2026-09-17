# ATM-0-0019 成本基線

版本：2026-09-16  
狀態：設計完成；尚未執行 live pilot 或付費模型。  
目的：用同一口徑量測「一張任務從開始到可驗證交付」的完整成本，優先找高頻且高秒數的命令／必經 gate；本文件不是產品完成證據。

## 邊界與不做事項

- 只重用既有 `ATM-METRICS-20260915` audit、dashboard／metrics 與原卡輸出；本卡不新增 CLI、gate、SDK、registry、dashboard 或監控框架。
- 原始對話、raw log、usage 明細與大檔輸出放在 `C:/Users/User/atm-benchmark-sink/`；Git 只保留本基線、欄位定義、摘要與 digest。
- 未執行的欄位填 `UNKNOWN`，不填零、不以命令耗時代替人工時間、不把單一命令變快宣稱成整張任務變快。
- 這是三張 live pilot（0020–0022）共用的量測契約；不能重開既有功能或另造試驗性功能。

## 固定環境與識別

每一批量測開始前保存下列欄位，並將相同 JSON 放入外部 sink：

```json
{
  "taskId": "ATM-0-00xx",
  "runId": "外部唯一識別",
  "controlOrCandidate": "control|candidate|descriptive",
  "repoRevision": "git rev-parse HEAD 或 UNKNOWN",
  "runnerDigest": "sha256:... 或 UNKNOWN",
  "nodeVersion": "node --version 或 UNKNOWN",
  "host": "OS/CPU/CI runner 或 UNKNOWN",
  "workloadDigest": "輸入／fixture digest 或 UNKNOWN",
  "coldWarm": "cold|warm|mixed|UNKNOWN",
  "sampleCount": "UNKNOWN",
  "startedAt": "ISO-8601",
  "endedAt": "ISO-8601"
}
```

control 與 candidate 各自固定並記錄自己的 revision／版本；runner、Node、host、輸入、cold/warm 與樣本規則必須相同。revision 不同時，只有其他條件可比才可計算差異；任一 runner／輸入／環境不一致只能報描述性差異或 `UNKNOWN`，不得歸因為優化。

## 時間欄位與區間聯集

主要結果是 task wall-clock：`endedAt - startedAt`（毫秒）。每一段活動以半開區間 `[startMs,endMs)` 保存，並分為：

`implementation`、`functionalVerification`、`review`、`reviewWait`、`reviewCorrection`、`integration`、`other`。

工具／人工區間可以重疊。報表同時提供：

1. 每類原始區間與次數；
2. 每類區間的 union 毫秒（同類重疊只計一次）；
3. 全部活動的 union 毫秒；
4. 不屬於任何活動的空檔（`taskWallMs - allActivityUnionMs`）。

例：`[0,100]`、`[50,150]` 的 union 是 150 ms，不是 200 ms；三段 `[0,100]`、`[80,180]`、`[170,220]` 的 union 是 220 ms。工具活動與人工活動的重疊不能重複計入總成本。

審核 overhead 只計 `review ∪ reviewWait ∪ reviewCorrection` 的 union，再除以 task wall-clock；必要 bug 修正不能因為被審核觸發就全部算浪費，必須另記 `reviewCaused` 標籤與理由。

## 命令與必經 gate 遙測

每個命令／必經 gate 至少記：`name`、`required`、`count`、`sampleCount`、`coldWarm`、`p50Ms`、`p95Ms`、`failureCount`、`evidencePath`、`revision`、`runnerDigest`。p50/p95 只作診斷，不直接相加成任務收益。

排序鍵：先看關鍵路徑，再看 `count × p95Ms`；同秒數時優先高頻項。任何「減負成功」都必須同時報 task wall-clock 與功能／衝突／可追溯性是否退步。

```json
{
  "command": "node atm.mjs next --json",
  "required": true,
  "count": 1,
  "sampleCount": 30,
  "coldWarm": "cold",
  "p50Ms": "measured|UNKNOWN",
  "p95Ms": "measured|UNKNOWN",
  "failureCount": "measured|UNKNOWN",
  "evidencePath": "sink://...",
  "revision": "...",
  "runnerDigest": "sha256:..."
}
```

## Token、費用與人工成本

每個 task 與每個 agent 分開保存：

`humanMinutes`、`inputTokens`、`outputTokens`、`reviewTokens`、`usd`，以及各欄位的 `measured|estimated|unknown` provenance。每個值另記 `source`／receipt path、`method`、適用時的 provider／model，以及 USD 的 pricing source／version；無帳單或 provider usage 時填 `unknown`，不得用 wall-clock、命令時間或模型標稱價格推成實測費用。

```json
{
  "amount": 123.4,
  "unit": "USD|ms|minutes|tokens",
  "status": "measured|estimated|unknown",
  "source": "sink://receipt-or-human-log 或 UNKNOWN",
  "method": "timer|provider-usage|invoice|manual-log|estimation-formula 或 UNKNOWN",
  "providerModel": "provider/model 或 N/A",
  "pricingSourceVersion": "URL-or-document@version 或 N/A"
}
```

`amount` 與 `unit` 必須分開保存；未知時 `amount` 為 `UNKNOWN`（不是 0）。只有有直接 receipt 證明「確實為零」時才可填數值 0。最小例子：`{"amount":123.4,"unit":"USD","status":"measured","source":"sink://usage.json","method":"provider-usage","providerModel":"example/model","pricingSourceVersion":"provider-pricing@2026-09"}`；推估值保留公式與輸入；未知值仍保留來源缺失原因。

環境 schema 的 `sampleCount` 在未執行或缺證據時為 `UNKNOWN`；只有 receipt 證明實測為零樣本時才可填 `0`。

並行任務同時報 `makespanMs` 與所有 agent 工時總和；兩者不是同一指標，也不得互相替代。

## 三張試行卡的固定驗收入口

| 卡片 | 唯一問題 | 必要直接證據 | 不可宣稱 |
|---|---|---|---|
| ATM-0-0020 | 高耗時熱點是否降低完整交付成本 | 既有入口：`node --strip-types tests/cli/next-governance-readiness-latency.test.ts`；輸入為該測試 fixture；輸出為外部 sink 的 control/candidate receipt；另記同 runner／輸入、command/gate p50/p95、task wall-clock、失敗樣本 | 只憑單一 gate 變快宣稱任務變快 |
| ATM-0-0021 | 單一 bug 是否能以既有 quickfix 完成 | 既有入口：`node --strip-types tests/cli/atm-chart-public-runtime.test.ts`；輸入為測試 fixture；輸出為外部 sink 的修前／修後 receipt、diff digest、rollback、全 task wall-clock | 為補證據新增治理機制 |
| ATM-0-0022 | 多 AI 並行是否保留真衝突保護且減少等待 | 既有入口：`node --strip-types tests/cli/parallel-admission-scale-benchmark.test.ts`；輸入為該 benchmark fixture 與既有 clean-install matrix（若 matrix 唯一入口尚未存在即標 UNKNOWN）；輸出為外部 sink 的無衝突／真衝突／stale base receipt、makespan、agent 工時、衝突檢查與等待 ms | 只測無衝突案例或把全隊串行化當改善 |

## P1–P6 防偏移檢核

- P1：task done、ledger 綠或 `--version` 不等於產品交付；缺 clean install／核心 workflow 就標 `UNKNOWN`。
- P2：優先取消、合併、縮範圍、重用；本卡不得因量測缺口新增永久治理元件。
- P3：總 wall-clock 包含實作、驗證、審核、等待、修正、整合；以毫秒與區間聯集計算。
- P4：固定版本／runner／輸入／host／cold-warm；未知不填零，失敗樣本保留。
- P5：不得刪除真衝突／stale base／足跡；並行同時報 makespan 與 agent 工時。
- P6：本文件只定義一套共用量測契約；爭議最多兩輪後交 Owner，不擴大成新系統。

## 本卡反例與停止條件

1. 對 `[0,100]` 與 `[50,150]` 的區間，計算結果必須是 150 ms；若輸出 200 ms，判定 FAIL，停止後續成本宣稱。
2. 更換 runner、revision、輸入或缺樣本時，結果只能是描述性差異／`UNKNOWN`，不得輸出確定收益。
3. 缺 token／USD／人工資料時保留 `unknown`；不得為了完整表格填零或估成實測。
4. 若審核 overhead > task wall-clock 的 15%，只觸發檢討，不自動否決；若無可證實糾偏價值，後續卡應減少觸發或停止。

## 交付與驗證

- 本卡交付此文件與其 SHA-256；不執行付費模型、npm publish、ATM source write 或 live pilot。
- 0020–0022 必須引用本文件版本與 digest；若欄位／公式改變，舊量測不可沿用。
- 驗證：人工逐項核對 P1–P6、反例與三卡入口；再執行 `node tools_node/check-encoding-touched.js --files docs/ai_atomic_framework/atm-product-proof/review-pilot/cost-baseline.md`。
