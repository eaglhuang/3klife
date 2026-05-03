<!-- doc_id: doc_other_0012 -->
# Sanguo RAG ABAB…C 整體進度推進規劃書

> 本文件規劃三國 RAG / 武將資料補全的「A 自動輪巡、B review gate、C 殘留問題彙整」節奏。它是執行規劃與 workflow 說明，不取代母規格或 schema 定義。

## 1. 可行性結論

目前 `server/npc-brain/langgraph_app/etl_repair_graph.py` 的 `sanguo_etl_repair_graph` 已經可以做單輪或小批次的補全 repair flow，但它仍是「一輪式 Studio repair graph」，不是完整的跨輪 autonomous controller。

現有 Studio graph 可以：

- 讀 completion summary。
- 讀 campaign summary。
- 讀 ETL pilot report。
- 讀 review queue。
- 分析 bottleneck。
- 選 focus generals。
- 產 event review candidates。
- 視設定觸發 human interrupt。
- 做 context enrichment。
- 跑 `run_repair_review_campaign.py`。
- 視設定刷新 API readiness。

現有 campaign 腳本 `server/npc-brain/pipelines/sanguo-rag/run_repair_review_campaign.py` 可以跑一批武將，並輸出 `canonicalWrites=false` 的 progress summary，例如：

- `selectedGenerals`
- `baselineOverallPercent`
- `resultOverallPercent`
- `deltaOverallPercent`
- `resultRelationshipGraph`
- `resultEventQuestionCoverage`
- `resultReviewValidation`

因此，ABAB…C 方案可行，而且是目前最合理的整體進度推進節奏；但完整自動化需要外部 controller 或新的 LangGraph controller graph。

## 2. 是否能真正推進總進度

可以，但要符合三個條件：

1. **A 階段必須產生 source-grounded / staged / sidecar 成果**，而不是只讓模型重寫同一批文字。
2. **B 階段必須把卡住的選擇題收斂成明確決策**，尤其是 `accept-with-edits` 的 location、relationshipEdges、summary boundary、sourceRefs 等欄位修補。
3. **C 階段必須把多輪仍重複殘留的問題整理成人工審核與規則修補任務**，不要無限繼續燒算力。

這個流程能推進的是：

- staged ready events
- staged relationship evidence
- event question seeds
- source event packets
- repair backlog digestion
- review validation quality
- completion estimate

它不能保證所有武將都能全自動補滿，也不能保證 staged progress 等於 canonical progress。正式 canonical promotion 仍應另設人工 gate。

## 3. 現況盤點

### 3.1 `sanguo_etl_repair_graph` 一輪式能力

目前 graph 的核心路線是：

```text
load_completion_summary
  -> load_campaign_summary
  -> load_etl_pilot_report
  -> load_review_queue
  -> assess_completion_bottlenecks
  -> select_focus_generals
  -> prepare_focus_workspace
  -> refresh_focus_pilot
  -> extract_event_review_candidates
  -> review_candidates
  -> enrich_review_context
  -> run_targeted_repair_review
  -> refresh_api_readiness
  -> summarize_dialogue_smoke
```

它適合做 A 或 B 的「單輪 executor」。

### 3.2 `run_repair_review_campaign.py` 能力

支援參數：

```bash
--round-id
--edit-backlog
--base-events
--base-relationship-evidence
--base-progress
--repair-output-root
--rounds-root
--event-seed-root
--packet-root
--progress-root
--general-id
--top-generals
--top-per-general
--reviewer-preset
--reviewer-provider
--step-timeout-seconds
--overwrite
```

它可以當作 A 階段的一輪批次 executor。

### 3.3 缺口

目前仍缺：

- 跨輪 `maxRounds` 控制。
- AB cycle 控制。
- no-improvement stop rule。
- pending review 門檻。
- repeated residual detection。
- cooldown / dedupe。
- C 階段 residual dossier 自動產出。
- promotion / canonical merge gate。

## 4. ABAB…C State Machine

```text
Start
  -> Measure baseline
  -> A: Auto draft / repair rounds
  -> Evaluate stop rules
       ├─ improvement enough + pending low -> A again
       ├─ pending review too high -> B
       ├─ repeated residuals -> C
       ├─ no improvement patience hit -> C
       └─ max rounds hit -> C or End
  -> B: Skill/Human review gate
  -> A again
  -> ...
  -> C: Residual review dossier
  -> Human audit / rule fix / future task
```

簡化為：

- **A**：自動輪巡草稿層，產出 staged / sidecar / progress delta。
- **B**：skill agent 或 human review，收斂卡住選擇題。
- **C**：反覆殘留問題整理為 Markdown 人工審核包。

補充：目前 outer controller 已調整為「只要本輪 A 已產出 B review batch，且尚未套用 review decisions，就優先停在 B gate」。`pendingReviewLimit` 仍保留，但它現在是 safety threshold，不是唯一進入 B 的條件。

## 5. A 階段：自動輪巡草稿層

### 5.1 A 的目的

A 階段負責低人工成本的批次推進：

- 消化 backlog。
- 補 context。
- 補候選事件。
- 補 relationship evidence。
- 補 source event packets。
- 估算 completion delta。
- 找出下一輪 bottleneck。

A 階段不得無人工 gate 直接寫 canonical。

### 5.2 Studio state 範例

```json
{
  "runLabel": "abab-a-r1",
  "focusStatus": "needs-etl-evidence",
  "topFocusGenerals": 5,
  "reviewTop": 20,
  "requireHumanReviewInterrupt": false,
  "reviewInterruptBatchSize": 3,
  "runContextEnrichment": true,
  "fillReviewAnswers": true,
  "runRepairCampaign": true,
  "runApiReadinessRefresh": false,
  "reviewerPreset": "agent",
  "reviewerProvider": "agent-reviewer",
  "stepTimeoutSeconds": 30,
  "overwriteOutputs": true
}
```

### 5.3 CLI fallback

```bash
cd /mnt/c/Users/User/3KLife

$HOME/.venv/3klife-etl/bin/python \
  server/npc-brain/pipelines/sanguo-rag/run_repair_review_campaign.py \
  --round-id abab-a-r1 \
  --top-generals 5 \
  --top-per-general 5 \
  --reviewer-preset agent \
  --reviewer-provider agent-reviewer \
  --step-timeout-seconds 30 \
  --overwrite
```

指定武將：

```bash
$HOME/.venv/3klife-etl/bin/python \
  server/npc-brain/pipelines/sanguo-rag/run_repair_review_campaign.py \
  --round-id abab-a-r1-liu-bei-cao-cao \
  --general-id liu-bei \
  --general-id cao-cao \
  --top-per-general 5 \
  --reviewer-preset agent \
  --reviewer-provider agent-reviewer \
  --step-timeout-seconds 30 \
  --overwrite
```

## 6. B 階段：skill agent / human review gate

B 階段處理 A 無法安全決策的題目。固定決策語意：

| Code | Decision | 說明 |
|---|---|---|
| A | accept | 可接受，通過 gate 後可進 staged ready。 |
| B | accept-with-edits | 接受但需補欄位，例如 location / relationshipEdges / summary。 |
| C | reject | 拒絕為噪音或錯誤候選。 |
| D | defer | 暫緩，需要更多 evidence 或人工查證。 |

若需要 Studio interrupt，使用：

```json
{
  "runLabel": "abab-b-review-r1",
  "focusStatus": "needs-etl-evidence",
  "topFocusGenerals": 3,
  "reviewTop": 10,
  "requireHumanReviewInterrupt": true,
  "reviewInterruptBatchSize": 3,
  "runContextEnrichment": true,
  "fillReviewAnswers": false,
  "runRepairCampaign": false,
  "runApiReadinessRefresh": false,
  "overwriteOutputs": true
}
```

B 階段回覆格式：

```json
{
  "decisions": [
    {
      "candidateId": "candidate-id",
      "answer": "B",
      "notes": "事件可信，但 location 與 relationshipEdges 需補。",
      "edits": {
        "location": "長坂坡",
        "relationshipEdges": []
      }
    }
  ]
}
```

## 7. C 階段：殘留問題 Markdown 審核包

C 階段在下列情境觸發：

- AB 跑滿仍沒有明顯 delta。
- 同一批 eventKey / candidateId 重複卡住。
- pending review 超過人工可承受量。
- failure rate 過高。
- 需要外部來源或 schema / extractor 修補。

殘留分組：

- `identity ambiguity`
- `location gap`
- `relationship edge/type`
- `event boundary`
- `missing source evidence`
- `schema/tool gap`
- `external source needed`

建議 dossier 模板：

```md
# Sanguo RAG Residual Review Dossier

- Run ID:
- Generated At:
- AB Cycles:
- A Rounds:
- Selected Generals:
- Baseline Overall Percent:
- Final Overall Percent:
- Delta Overall Percent:
- canonicalWrites: false

## Executive Summary

## Repeated Residuals

| General | Event Key | Candidate ID | Repeat Count | Root Cause | Suggested Action |
|---|---|---|---:|---|---|

## Identity Ambiguity

## Location Gaps

## Relationship Edge / Type Gaps

## Event Boundary Problems

## Missing Source Evidence

## Schema / Tooling Gaps

## Recommended Next Actions
```

## 8. 停止規則

建議預設：

| Rule | Default | Action |
|---|---:|---|
| `maxRounds` | 3 | 單次 A 最多連跑 3 輪。 |
| `maxABCycles` | 3 | AB 最多往返 3 次。 |
| `noImprovementThreshold` | 0.05 | delta 小於此值視為弱改善。 |
| `noImprovementPatience` | 2 | 連續 2 輪弱改善後停止。 |
| `pendingReviewQuestionLimit` | 15 | pending 過多則切 B。 |
| `sameResidualRepeatLimit` | 2 | 同問題重複則切 C。 |
| `failureRateLimit` | 0.2 | command 失敗率過高則停止。 |
| `stepTimeoutSeconds` | 30 | 每步 timeout。 |

readiness refresh 建議每 2-3 輪一次，或最後才跑，避免浪費算力。

## 9. 預設參數建議

```json
{
  "maxRounds": 3,
  "maxABCycles": 3,
  "topFocusGenerals": 5,
  "topPerGeneral": 5,
  "reviewTop": 20,
  "reviewInterruptBatchSize": 3,
  "noImprovementThreshold": 0.05,
  "noImprovementPatience": 2,
  "pendingReviewQuestionLimit": 15,
  "sameResidualRepeatLimit": 2,
  "stepTimeoutSeconds": 30,
  "runApiReadinessRefresh": "final-only-or-every-3-rounds"
}
```

## 10. 實作分期

### MVP today

使用現有 Studio / CLI 加上 agent workflow 手動控制 ABAB…C：

1. 跑 A。
2. 看 delta / pending / failures。
3. 需要時進 B。
4. AB 達停止條件後產 C。

### P1：Python controller

新增：

```text
server/npc-brain/pipelines/sanguo-rag/run_progress_advancement_loop.py
```

負責外層 stop rules、round summary 與 residual dossier。

### P2：LangGraph controller

新增：

```text
server/npc-brain/langgraph_app/progress_advancement_graph.py
```

並在 `langgraph.json` 註冊：

```json
"sanguo_progress_advancement_graph": "langgraph_app.progress_advancement_graph:graph"
```

### P3：promotion / merge gate

正式 canonical promotion 必須另設人工 gate，不與 A 階段自動輪巡綁在一起。

## 11. 風險與防護

| 風險 | 說明 | 防護 |
|---|---|---|
| 算力浪費 | 同批人反覆跑、無新 evidence 仍重建 | maxRounds、cooldown、no-improvement stop |
| 噪音累積 | staged candidates 越堆越多 | dedupe、C dossier、B gate |
| 人工債務 | pending review 爆量 | pending limit、batch review |
| false progress | staged 上升但 canonical 未升版 | 明確標記 canonicalWrites=false |
| canonical 汙染 | reviewer 錯判直接進正式資料 | sidecar/staging only、人審 promotion |

## 12. 建議產物路徑

```text
artifacts/data-pipeline/sanguo-rag/extracted/progress-advancement/<run-id>/
  progress-advancement-summary.json
  progress-advancement-summary.md
  residual-review.md
  rounds/
  repair-review/
  knowledge-growth-progress/
```

---

結論：ABAB…C 是可行且推薦的整體推進節奏。短期先用現有 Studio/CLI 加 workflow 控制；中期新增 Python controller；長期再包成新的 LangGraph controller 與 promotion gate。

## 13. 已落地實作 Checklist（2026-05-02）

- [x] `server/npc-brain/pipelines/sanguo-rag/run_progress_advancement_loop.py` 已落地，成為 ABAB outer controller CLI。
- [x] A 階段不再每輪重吃固定 baseline；outer loop 會承接前一輪 merged `ready-events / relationship-evidence / progress / reviewed-b-edit-backlog`。
- [x] outer loop 會輸出 `progress-advancement-summary.json`、`progress-advancement-summary.md`、`residual-review.md`。
- [x] outer loop 會從每輪 `knowledge-growth-rounds/<round>.snapshots/` 收集 event review 殘留，產生 `b-review-batches/<round>-review-batch.{json,md}`。
- [x] outer loop 支援 `--review-decisions <path>`，可把 B review decisions 回寫到最新 snapshot 的 `event-review-answers*.enriched.todo.json`。
- [x] B review apply 後會自動跑 `stage_reviewed_a_ready_events.py`、`build_event_question_seed_bank.py`、`build_source_event_packets.py`、`estimate_knowledge_completion.py`，形成新的 merged baseline。
- [x] 已落地 `sameResidualRepeatLimit` stop rule 與 repeated residual 偵測，不再只靠 generic pending queue 判斷。
- [x] 已調整 route 語意：本輪若已產出 B review batch 且尚未套用 decisions，outer loop 會停在 `B-review`，不再誤導成 `C-residual-dossier`。
- [x] `residual-review.md` 會輸出 root cause counts、repeated residual table 與建議動作，不再是 placeholder dossier。
- [x] `server/npc-brain/langgraph_app/progress_advancement_graph.py` 已落地，`server/npc-brain/langgraph.json` 已註冊 `sanguo_progress_advancement_graph`。
- [ ] canonical promotion / merge gate 仍維持獨立人工流程，沒有綁進 A/B 自動輪巡。

## 14. 執行入口 Checklist

### 14.1 CLI 直接跑 outer loop

- [x] 單輪 dry-run smoke：

```bash
cd /mnt/c/Users/User/3KLife

$HOME/.venv/3klife-etl/bin/python \
  server/npc-brain/pipelines/sanguo-rag/run_progress_advancement_loop.py \
  --dry-run \
  --run-id progress-advancement-smoke \
  --output-root scratch/progress-advancement-smoke \
  --max-rounds 1 \
  --max-ab-cycles 1 \
  --review-batch-size 3
```

- [x] 正式跑 A->B->A：

```bash
cd /mnt/c/Users/User/3KLife

$HOME/.venv/3klife-etl/bin/python \
  server/npc-brain/pipelines/sanguo-rag/run_progress_advancement_loop.py \
  --run-id abab-r1 \
  --max-rounds 3 \
  --max-ab-cycles 3 \
  --top-generals 5 \
  --top-per-general 5 \
  --review-batch-size 10 \
  --overwrite
```

- [x] 套用 B review decisions 後重跑同一個 run：

```bash
cd /mnt/c/Users/User/3KLife

$HOME/.venv/3klife-etl/bin/python \
  server/npc-brain/pipelines/sanguo-rag/run_progress_advancement_loop.py \
  --run-id abab-r1 \
  --max-rounds 3 \
  --max-ab-cycles 3 \
  --review-decisions <path-to-decisions.json> \
  --overwrite
```

### 14.2 LangGraph / Studio 入口

- [x] graph id：`sanguo_progress_advancement_graph`
- [x] Studio state 可直接帶 `runLabel / maxRounds / maxABCycles / topGenerals / topPerGeneral / reviewBatchSize / requireHumanReviewInterrupt`。
- [x] 若 `requireHumanReviewInterrupt=true` 且 outer loop 判定 `nextRoute=B-review`，graph 會在最新 batch 上 interrupt，收 decision JSON 後重跑同一個 run。

## 15. 最新實際推進紀錄（2026-05-02，pilot review queue 大幅收斂）

### 15.1 已完成的 progress-advancement run 狀態

- `artifacts/data-pipeline/sanguo-rag/extracted/progress-advancement/abab-live-r3/`
  - 已完成 A / B review / merge trace 留存。
  - summary 顯示 `pilotPendingReviewCount = 4`、`stopReason = repair-backlog-exhausted`，表示下一步應切 pilot review queue 或開新 focus cohort。
- `artifacts/data-pipeline/sanguo-rag/extracted/progress-advancement/abab-studio-r1/`
  - 已完成 A round graph trace、B review decisions 套用、B merge graph trace。
  - `progress-advancement-summary.json` 顯示：
    - `bReviewCount = 1`
    - `stopReason = repair-backlog-exhausted`
    - `nextRoute = complete`
    - `finalOverallPercent = 58.40`
    - `totalDeltaOverallPercent = 0.18`

### 15.2 pilot review queue 原始瓶頸

預設 queue 位於：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/review-queue.todo.json
```

當時共有 4 位待處理：

- 孫權 `sun-quan`
- 周瑜 `zhou-yu`
- 呂布 `lu-bu`
- 司馬懿 `sima-yi`

其中 `sun-quan` 與 `zhou-yu` 的 enriched review 題庫實際上沒有可直接套用的新題；`lu-bu` 則存在 5 筆幾乎完全重複的 `A` 題，若不先去重，會把 staged progress 膨脹成假成長。

### 15.3 呂布 pilot review 去重與 merged baseline 套用

本輪新增 curated review 檔：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/event-review-lu-bu-curated/
  event-review-answers.lu-bu.unique-a.enriched.todo.json
```

處理原則：

- 只保留呂布 enriched review 中唯一有效的 1 筆 `A accept` 事件。
- 避免把同一組 `summary / location` 重複灌進 staged ready events。
- 後續已補跑 encoding check，結果 `ok`。

接著分兩層驗證：

1. 先在 pilot sandbox base 上做一次 stage / packet / completion / readiness refresh。
2. 再把同一筆呂布事件疊到目前較可信的 merged baseline：

```text
artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/
  repair-review-r2-wide-merged-staged-ready-events.jsonl
artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/
  repair-review-r2-wide-merged-staged-relationship-evidence.jsonl
```

merged baseline 輸出位於：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/lu-bu-stage-a1/merged-progress/
```

其關鍵產物包括：

- `core-person-progress/lu-bu-stage-a1-merged-r2wide-staged-ready-events.jsonl`
- `core-person-progress/lu-bu-stage-a1-merged-r2wide-staged-relationship-evidence.jsonl`
- `knowledge-growth-progress/lu-bu-stage-a1-merged-r2wide.json`

### 15.4 為何需要 `ready-eval` projection

實測發現：

- `stage_reviewed_a_ready_events.py` 產出的 review-only 新事件，其 `reviewStatus` 為 `accepted-review-candidate`。
- 但 `run_etl_quality_pilot.py` 的 event counting 邏輯只把 `reviewStatus == "ready"` 算入可用事件。

因此若直接拿 staged 檔刷新 pilot，會出現：

- API readiness 已看得到新內容。
- pilot queue 卻仍把同一位武將判成 `needs-etl-evidence`。

為了做「不污染 canonical、但能正確評估 pilot queue」的驗證，本輪額外建立：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/lu-bu-stage-a1/merged-progress/core-person-progress/
  lu-bu-stage-a1-merged-r2wide-ready-eval-events.jsonl
```

這份檔案僅做 review-only evaluation projection：

- 逐列保留原事件內容。
- 僅把 `reviewStatus` 臨時投影為 `ready`。
- `canonicalWrites=false`，不代表正式 promotion。

### 15.5 本輪最重要的實際結果

使用 `ready-eval-events` 後，重新執行：

- `run_etl_quality_pilot.py`
- `build_api_readiness_index.py`

結果如下。

#### pilot report

路徑：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/lu-bu-stage-a1/merged-progress/pilot-refresh/
  etl-quality-pilot-report.json
```

摘要：

- `readyEvents = 212`
- `statusCounts = { ready-for-dialogue-smoke: 3, thin-but-testable: 1 }`

四位武將狀態：

- 孫權 `sun-quan`：`ready-for-dialogue-smoke`
  - `eventCount = 24`
  - `contextCount = 24`
- 周瑜 `zhou-yu`：`ready-for-dialogue-smoke`
  - `eventCount = 12`
  - `contextCount = 12`
- 呂布 `lu-bu`：`ready-for-dialogue-smoke`
  - `eventCount = 78`
  - `contextCount = 78`
  - `genericCandidateCount = 7`
- 司馬懿 `sima-yi`：`thin-but-testable`
  - `eventCount = 1`
  - `contextCount = 1`

這代表 pilot review queue 已從原本的 4 位待處理，收斂成只剩 1 位需要下一步判斷。

#### review queue

路徑：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/lu-bu-stage-a1/merged-progress/pilot-refresh/
  review-queue.todo.json
```

目前只剩：

- 司馬懿 `sima-yi`
  - `status = thin-but-testable`
  - `suggestedDecision = expand-keywords`
  - reason：`add more keyword categories before judging NPC voice quality`

換句話說，本輪已把 queue 從：

- `sun-quan / zhou-yu / lu-bu / sima-yi`

壓縮到：

- `sima-yi`

#### 呂布 API readiness

路徑：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/lu-bu-stage-a1/merged-progress/api-readiness/
  api-readiness-report.md
```

摘要：

- `Context Options = 78`
- `Persona Card = pass`
- `Dialogue Evidence Probe = pass`

keyword counts：

- `event = 34`
- `person = 85`
- `creature = 1`
- `location = 13`
- `item = 2`

這表示呂布已不再只是「剛有一筆 review event 的薄層狀態」，而是已可進入 dialogue smoke 的可測試狀態。

### 15.6 司馬懿補事件後，pilot queue 已正式歸零

為了把最後殘留在 queue 的 `sima-yi` 再往前推，本輪新增一份 review-only curated enriched todo：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/event-review-sima-yi-curated/
  event-review-answers.sima-yi.enriched.todo.json
```

這份檔案新增的是「空城計 / 西城」事件，核心內容為：

- `eventKey = manual.sima-yi.empty-fort-west-city-095-p12-p13`
- `location = 西城`
- `sourceRefs = [095#p12, 095#p13, 095#p15]`
- `canonicalWrites = false`

後續已完成：

1. encoding check（`ok`）
2. `stage_reviewed_a_ready_events.py`
3. 新一輪 `ready-eval` projection
4. 以四位武將對照組重跑 `run_etl_quality_pilot.py`

新的 review-only evaluation 路徑位於：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/sima-yi-expand-r1/
```

其中最重要的 events 檔為：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/sima-yi-expand-r1/core-person-progress/
  sima-yi-expand-r1-ready-eval-events.jsonl
```

新的 pilot report：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/sima-yi-expand-r1/pilot-refresh/
  etl-quality-pilot-report.json
```

結果：

- `readyEvents = 213`
- `statusCounts = { ready-for-dialogue-smoke: 4 }`
- `reviewQueue.questions = []`

四位武將現況：

- 孫權 `sun-quan`：`ready-for-dialogue-smoke`
- 周瑜 `zhou-yu`：`ready-for-dialogue-smoke`
- 呂布 `lu-bu`：`ready-for-dialogue-smoke`
- 司馬懿 `sima-yi`：`ready-for-dialogue-smoke`
  - `eventCount = 2`
  - `contextCount = 2`
  - `evidenceRefCount = 4`
  - `keywordTotal = 10`

這代表 pilot review queue 已從：

- 原始 4 位待處理
- 呂布 merged baseline 後剩 1 位 `sima-yi`
- 再到本輪正式壓縮為 `0`

也就是說，這條 review-only 推進鏈已成功把整個 pilot cohort 推進到「四位都可進入 dialogue smoke」的狀態。

### 15.7 司馬懿 API readiness 也已補齊

本輪接著用新的 `ready-eval events` 與 pilot-refresh 產出的 keyword / persona 檔，補跑：

- `build_api_readiness_index.py --general-id sima-yi`

輸出位於：

```text
artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/sima-yi-expand-r1/api-readiness/sima-yi/
  api-readiness-report.md
```

摘要：

- `contexts = 2`
- `dialogueProbe = pass`

這使得司馬懿不再只是 pilot report 上的理論可用，而是已具備：

- 可追溯 context options
- keyword options
- persona card
- dialogue evidence probe 通過

換句話說，現在四位 pilot 武將都已具備靜態 API readiness 的基本條件。

### 15.8 對整體推進節奏的意義

本輪依然不是 canonical promotion，而是一次更完整的 review-only queue compression：

- 沒有硬寫 canonical。
- 先用 review-only projection 驗證新事件是否足以改善 pilot readiness。
- 再用同一批 events 對應的 keyword / persona 補齊 API readiness。
- 成功把 pilot review queue 由 `4 -> 1 -> 0`。

這使得目前最重要的里程碑，不再是「把某位武將從缺事件拉到 thin-but-testable」，而是：

- 已建立一個四位武將都可進入 smoke 的 review-only 可測 cohort。
- 後續可以把精力移往新的 focus cohort，或直接進入 dialogue smoke / canonical gate 決策。

### 15.9 當前最值得追的下一個動作

若要延續「最大幅度推進」策略，優先順序建議更新為：

1. **對目前四位 ready cohort 做 dialogue smoke**：既然 `sun-quan / zhou-yu / lu-bu / sima-yi` 都已到 `ready-for-dialogue-smoke`，現在最有價值的是驗證 speechContextMode 的輸出品質，而不是再停留在靜態 coverage。
2. **開新 focus cohort**：`abab-live-r3`、`abab-studio-r1` 都已到 `repair-backlog-exhausted`，pilot 這側又已 queue 清空，下一個高邊際效益動作會是換 cohort 擴張覆蓋面。
3. **保留 canonical gate**：等 smoke 結果穩定後，再決定是否把這批 review-only 成果正式 promotion，避免把 evaluation projection 誤當 canonical 狀態。

## 16. 為什麼目前推進武將仍偏慢，以及如何加速

### 16.1 核心結論

目前慢，不是因為單一模型或單一指令太慢，而是因為整套流程的設計目標偏向：

- **高精度 queue compression**
- **source-grounded review safety**
- **review-only 與 canonical promotion 分離**

它比較像「精修 finishing loop」，不是「大量武將批量生產線」。

因此，ABAB…C 在目前設計下適合：

- 壓縮 repair backlog
- 清掉高價值 focus cohort 的 pending review
- 把少量武將推到 `ready-for-dialogue-smoke`

但不適合直接拿來當成「一次大規模推進數十到上百位武將」的唯一主流程。

### 16.2 目前慢的真正原因

#### (1) A 階段不是純生成，而是多步 source-grounded pipeline

每個 focus cohort 並不是只做一輪 LLM 生成，而是會依序經過：

- backlog / focus selection
- candidate extraction
- context enrichment
- reviewed round
- staged ready events / relationship evidence merge
- progress refresh
- pilot refresh
- 視需要再做 API readiness

這意味著，每推進一位武將，實際上常常是多個 subprocess、JSONL merge、summary refresh、artifact write 的組合，不是單一 call。

#### (2) B gate 的人工 / reviewer 債務會快速累積

ABAB…C 的關鍵價值在 B：

- 決定 accept / accept-with-edits / reject / defer
- 修 location
- 修 relationshipEdges
- 修 summary boundary
- 修 sourceRefs

一旦把 cohort 開太大，pending review 會很快超出可消化範圍，反而使 throughput 下降。

#### (3) 目前 outer loop 本來就以小批高收益為預設

現行預設明確偏小批次：

- `top-generals = 5`
- `top-per-general = 5`
- `maxRounds = 3`
- `maxABCycles = 3`
- `pendingReviewLimit = 15`
- `stepTimeoutSeconds = 30`

這代表現在的 controller 設計哲學是：

- 先小批測通
- 避免 review 爆量
- 避免 false progress
- 避免 canonical 汙染

不是最大吞吐量優先。

#### (4) review-only progress 與 canonical progress 是分離的

目前 staged / review-only event 常先停在：

- `accepted-review-candidate`

而 pilot counting 又只把：

- `reviewStatus == ready`

算入可用事件。

這導致中間常需要額外做一層 `ready-eval projection` 才能正確驗證 queue 是否下降。這種雙軌安全設計能降低 canonical 汙染，但也增加流程成本。

#### (5) hard generals 會拖住整個 cohort 邊際效益

像本輪實際觀察到的 `repair-backlog-exhausted`，本質上代表：

- 簡單可修的題目已被消化
- 剩下的是 ambiguity 高、evidence 薄、relationship 難補的 case

這時如果還維持同 cohort 深挖，速度會明顯下降，邊際效益也變低。

### 16.3 為什麼 ABAB…C 天生不適合直接大量武將同跑

因為 ABAB…C 解的是：

- **高不確定性修補問題**

而不是：

- **低成本大量覆蓋問題**

如果直接把它擴成大規模武將 pipeline，會出現三個問題：

1. **review queue 爆量**：候選題目數量增長，遠快於 B gate 可消化速度。
2. **false progress 增加**：staged 上升，但 canonical 與真正可用度未必同步。
3. **高成本重複計算**：同類型 event / location / relationship 問題會在多位武將上重複被重新判一次。

因此，ABAB…C 比較適合當：

- **precision lane**

而不是：

- **bulk ingestion lane**

### 16.4 正確的優化方向：改成分層車道，而不是硬把 ABAB…C 放大

建議改成三車道：

#### Lane 1：Bulk Coverage Lane（廣覆蓋）

目的：先快速把大量武將從 `0 evidence` 推到「至少有初步 context / keyword / packet」。

特性：

- 以 cheap deterministic extract / packet / alias / keyword 為主
- 儘量不進 B gate
- 不做完整 per-general readiness refresh
- 不做 canonical promotion

適合的任務：

- source event packets 預抽
- alias resolution
- relationship evidence 預計算
- keyword seed 擴張

#### Lane 2：ABAB Precision Lane（精修）

目的：針對高價值、接近 ready、但卡在 ambiguity 的少數 focus generals 做 queue compression。

特性：

- 小 cohort
- 強 review
- 可接受 `accept-with-edits`
- 追求 `ready-for-dialogue-smoke`

也就是目前 ABAB…C 最適合待的地方。

#### Lane 3：Promotion / Canonical Lane（正式升版）

目的：只處理 smoke 穩定後、值得正式 merge 的成果。

特性：

- 更少量
- 人工 gate 更強
- 避免把 review-only progress 直接誤認為 canonical progress

### 16.5 近期最值得做的加速手段

#### A. 把「廣度掃描」與「深度精修」拆開

不要再期待同一條 ABAB…C 同時解決：

- 大量武將覆蓋
- 高精度 review
- canonical 安全

這三者一起做會非常慢。

正確做法是：

- 先用 Bulk Lane 掃 30–100 位武將的 cheap coverage
- 再把 top blockers / top opportunities 丟進 ABAB Precision Lane

#### B. 降低每輪 cohort 深度、提高 sweep 廣度

若目標是加速「整體武將覆蓋」，可改用 sweep profile，例如：

- `top-generals`: 12–20
- `top-per-general`: 2–3
- `maxRounds`: 1–2
- `maxABCycles`: 1
- `runApiReadinessRefresh`: final-only

這會降低單位武將精修深度，但能更快找出哪些武將值得進下一輪精修。

#### C. 把 ready-eval projection 內建化

目前 review-only event 還需要額外投影成 `ready` 才能做 pilot evaluation，這是明顯流程摩擦。

可優先考慮兩種做法之一：

1. `stage_reviewed_a_ready_events.py` 直接加 `--emit-ready-eval`。
2. `run_etl_quality_pilot.py` 增加 review-only evaluation mode，允許把 `accepted-review-candidate` 視為 evaluation-ready。

這一項會直接減少一整個中間步驟。

#### D. 對 B gate 做 clustering / rule-based auto decisions

很多 review 題其實不是完全獨立的，可先做：

- duplicate candidate clustering
- 相同 `eventKey + location + participants` 合併決策
- 高信心 rule-based auto accept
- 低信心明顯噪音 auto reject

把真正需要人工 / skill reviewer 的題目數量壓到最少。

#### E. 把 expensive refresh 改成 touched-generals only

目前 pilot / readiness 很容易跟著整個 cohort 重跑。

更好的做法是：

- 只對 touched generals 重算 keyword/persona/readiness
- 最後再做 cohort summary aggregation

這能顯著降低每次小修補的全量重算成本。

### 16.6 若要真正加速，下一步實作優先順序

建議順序：

1. **先做 `ready-eval` 內建化**：這是最小改動、直接減少流程摩擦的優先項。
2. **新增 sweep mode 到 outer controller**：讓 `run_progress_advancement_loop.py` 同時支援 breadth-first profile 與 precision profile。
3. **把 pilot / readiness 變 incremental**：只重算 touched generals。
4. **做 review clustering 與 auto triage**：減少 B gate 人工債務。
5. **最後才做真正的多 cohort scheduler / controller graph**：把整體 throughput 提升到可同時管理多批武將。

### 16.7 最重要的一句話

ABAB…C 不是錯；它只是被拿來做了它不擅長的事。

它非常適合：

- 高價值武將精修
- backlog 壓縮
- ambiguity 收斂

但如果目標是「很大量武將一起前進」，就應該把它放在 **Precision Lane**，並另外補一條 **Bulk Coverage Lane**。這樣才會真正快起來。
