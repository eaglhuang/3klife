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
