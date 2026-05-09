<!-- doc_id: doc_server_pipeline_0003 -->
# Three-Lane ETL 白話說明（給審核與營運看）

這份文件是 `three-lane-progress-summary.md` 的「人話版」。
目標是讓你不用讀 Python 程式，也能看懂：

1. 這條 ETL 到底怎麼跑。
2. 每一步在做什麼判斷。
3. 為什麼會停下來。
4. 下一步該做什麼。

---

## 一句話先講完

這條三車道流程就是：

- 先用 **Bulk Coverage Lane** 廣掃一批武將，快速把「明顯可補齊」的事件先補起來。
- 再用 **ABAB Precision Lane** 針對高價值殘留問題精修。
- 最後用 **Promotion Lane** 做 readiness 檢查（偏升版前驗收）。

全程都採 `canonicalWrites=false`，意思是：**先做 review/staging，不直接寫正式資料庫**。

---

## 為什麼叫三車道

你可以把它想成工廠三條產線：

- `Bulk`：大量快篩線（便宜、快、覆蓋廣）
- `Precision`：精修線（慢一點、但針對難題）
- `Promotion`：出貨前檢驗線（smoke/readiness gate）

對應腳本：

- 排程總控：`run_three_lane_progress_scheduler.py`
- 每車道核心 loop：`run_progress_advancement_loop.py`

---

## 固定跑法（現在就是這樣）

總控腳本固定順序是：

1. `sweep`（Bulk Coverage Lane）
2. `precision`（ABAB Precision Lane）
3. `promotion-eval`（Promotion Lane）

每一車道跑完後，會把最新 `baseline-manifest.json` 接給下一車道。

這就是「上一段成果接著下一段」的接力。

---

## 資料怎麼流（從進料到報表）

下面這段是完整資料流，照順序看就好：

1. 讀 baseline（上一輪最好版本）
- 來源：`--baseline-manifest`
- 內容通常包含：
  - `readyEvents`
  - `relationshipEvidence`
  - `progress`
  - `editBacklog`

2. 進入某一車道的 progress loop（A 輪）
- 腳本：`run_progress_advancement_loop.py`
- 它會呼叫 `run_repair_review_campaign.py`

3. repair campaign 先把 B backlog 轉修復任務
- 腳本：`build_backlog_repair_tasks.py`
- 輸出：`*-repair-tasks.jsonl`、`*-repair-review-candidates.jsonl`

4. 對選到的武將跑知識增長 round
- 腳本：`run_knowledge_growth_round.py`
- 內部會呼叫：
  - `generate_event_review_choices.py`
  - `enrich_event_review_context.py`

5. 把 A 結果 stage 成 ready 候選，B 退回 backlog
- 腳本：`stage_reviewed_a_ready_events.py`
- 輸出重點：
  - `*-staged-ready-events.jsonl`
  - `*-staged-relationship-evidence.jsonl`
  - `*-reviewed-b-edit-backlog.jsonl`
  - `*-ready-eval-events.jsonl`（若開 `emit-ready-eval`）

6. 估算新進度分數
- 腳本：`estimate_knowledge_completion.py`
- 會更新 `overallPercent` 與各子分數

7. controller 判斷要不要繼續
- 邏輯在 `run_progress_advancement_loop.py`
- 可能：
  - 繼續 A
  - 切去 B human batch
  - 結束並輸出 residual dossier

---

## 關鍵決策原理（最重要）

### 1) 預覽順序固定：deterministic -> agent -> human

這是目前正式策略。

- deterministic：先用規則和證據補欄位
- agent skill preview：再做模型審查
- human：只有待審量過門檻才推給人

---

### 2) 有缺欄位先給 B（安全閘）

在 `enrich_event_review_context.py`：

- 題目若 `missingFields` 非空，先走 B gate（不直接當 A）
- 但同時會盡量補 `summary/location/relationshipEdges`

---

### 3) 同輪二次檢查（你要求的優化）

同一輪如果 deterministic 已補齊缺欄位，會立刻再送 skill preview，
不用等下一輪，能當輪 `B -> A`。

實際效果例子：

- `lu-bu` 一輪內從 `B:3` 變 `A:3`，人工待審降到 `0`。

---

### 4) 人工介入門檻：預設 20

只有待審量 `>= 20` 才會主動停下，丟一批給人工 MCQ。
小於 20 就盡量讓系統自己再跑。

---

### 5) 不是只有「滿 20」才會停

還有很多停機條件，例如：

- `repair-backlog-exhausted`
- `failure-rate-limit`
- `max-rounds`
- `max-ab-cycles`
- `runtime-readiness-fail`

所以就算待審只有 4，也可能因為別的條件停掉。

---

## 怎麼看 three-lane-progress-summary.md

先看這幾欄就夠了：

1. `Stop Reason`
- 告訴你為什麼停。

2. `Lanes` 表格
- 看三車道是否都有跑到。
- 看每車道 `Return` 是否 0。

3. `Pending` / `Pilot Pending`
- 看還剩多少待審。

4. `Final Baseline Manifest`
- 這是下次續跑的入口。

---

## 常見情境（白話版）

### 情境 A：Bulk 一開始就失敗

常見原因：

- repair backlog 是空的，但舊版本腳本把它當錯誤。

現在修正後：

- 空 backlog 走 no-op 成功路徑，不會整條三車道直接炸掉。

---

### 情境 B：看起來「沒進步」

可能不是沒做事，而是：

- 該輪沒選到有效候選
- 候選都還卡在弱 relationship edge
- 或停在 `max-ab-cycles` / `max-rounds`

要看：

- `round` 裡的 `selectedGenerals`
- 每輪的 `eventReviewPendingCountAfterRound`
- `repairTaskSummary`

---

### 情境 C：待審很少但還是停

這很正常。

待審少只代表「不需要人工 batch」，
不代表 controller 一定會繼續跑。
它仍可能被其他 stop reason 終止。

---

## 建議操作（WSL）

在 WSL 請用 `python3`：

```bash
python3 server/npc-brain/pipelines/sanguo-rag/run_three_lane_progress_scheduler.py \
  --run-id three-lane-live-r2 \
  --output-root local/codex-smoke/knowledge-growth \
  --baseline-manifest local/codex-smoke/knowledge-growth/sweep-all-generals-preview/baseline-manifest.json \
  --overwrite
```

跑完先看：

- `local/codex-smoke/knowledge-growth/<run-id>/three-lane-progress-summary.md`
- `local/codex-smoke/knowledge-growth/<run-id>/three-lane-progress-summary.json`

---

## 你最關心的結論（濃縮）

1. 目前已是固定三車道順序，且 Bulk 先跑。
2. 缺欄位先 B，但有同輪二次檢查，補齊可立刻轉 A。
3. 人工門檻是 20，但不是唯一停機條件。
4. 空 repair backlog 現在不再視為失敗，而是正常 no-op。

