---
doc_id: doc_agentskill_0042
name: sanguo-event-review-loop
description: 'Sanguo event review loop with LangGraph Studio visualization. Use for: 三國事件審核、generic event candidates、battle candidates、event review MCQ、accepted/rejected events、promote events、LangGraph Studio、human-in-the-loop、事件候選可視化、chunk -> extract -> validate -> review -> publish。'
argument-hint: '可指定候選檔、top 數量、是否產生 MCQ、是否套用 answers、是否只做 LangGraph Studio 可視化設計。'
---

# Sanguo Event Review Loop

這個 skill 用來把「事件候選」固定納入可重複的人類審核循環，避免 `generic-battle-candidates.jsonl` 或未來的通用事件候選檔被產出後遺忘。

Unity 對照：這像資料版 AssetPostprocessor + Inspector。Extractor 先 import raw text 產生 candidate assets；validator 像 import validation；人類 review 像在 Inspector 裡確認、修欄位或拒絕；publish 才會把 accepted event 寫進正式 runtime asset。

## When to Use

- 使用者提到 `event review`、事件審核、事件候選、generic event candidates、battle candidates、accepted events、rejected events、promote event。
- 使用者想把 `generic-battle-candidates.jsonl` 或未來 `generic-event-candidates.jsonl` 轉成選擇題給人類審。
- 使用者想用 LangGraph Studio 看 `chunk -> extract -> validate -> review -> publish` 的狀態流轉。
- 使用者想確認「哪個 chunk 被提案、為什麼進 review、哪個 validator 擋下來、人類改了什麼、恢復後是否正確 publish」。

## Core Files

目前已存在：

- Event extractor: `server/npc-brain/pipelines/sanguo-rag/extract_event_candidates.py`
- Gold seed registry: `server/npc-brain/pipelines/sanguo-rag/gold_seed_registry.py`
- Ready events: `artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl`
- Event review report: `artifacts/data-pipeline/sanguo-rag/extracted/events/events-review.md`
- Generic battle candidates: `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl`
- Generic battle review report: `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates-review.md`
- Event summary: `artifacts/data-pipeline/sanguo-rag/extracted/events/events-summary.json`

建議新增：

- Review choices: `artifacts/data-pipeline/sanguo-rag/extracted/events/event-review-choices.md`
- Answers template: `artifacts/data-pipeline/sanguo-rag/extracted/events/event-review-answers.todo.json`
- Applied decisions: `server/npc-brain/pipelines/sanguo-rag/config/event-review-decisions.json`
- Accepted queue: `artifacts/data-pipeline/sanguo-rag/extracted/events/accepted-events.jsonl`
- Rejected queue: `artifacts/data-pipeline/sanguo-rag/extracted/events/rejected-events.jsonl`
- Pending queue: `artifacts/data-pipeline/sanguo-rag/extracted/events/pending-events.jsonl`

建議新增腳本：

- `server/npc-brain/pipelines/sanguo-rag/generate_event_review_choices.py`
- `server/npc-brain/pipelines/sanguo-rag/apply_event_review_answers.py`
- `server/npc-brain/pipelines/sanguo-rag/run_event_review_loop.py`
- Optional LangGraph local graph: `server/npc-brain/pipelines/sanguo-rag/langgraph_event_review.py`

## Decision Semantics

事件審核選項固定如下：

- `A accept`: 接受候選為正式事件。必須能通過 schema gate，且 `sourceRefs`、`generalIds`、`summary` 可信。
- `B accept-with-edits`: 接受但需要修改欄位。answers 必須提供 `edits`，例如 `eventKey`、`summary`、`location`、`relationshipEdges`、`moodTags`。
- `C merge`: 與既有事件合併。answers 必須提供 `mergeIntoEventId` 或 `mergeIntoEventKey`。
- `D reject`: 拒絕為噪音或錯誤事件。answers 必須提供 `reason`。
- `E defer`: 暫緩，需要更多 research 或等待 LLM proposer。保留在 pending queue。

不得把 `needs-review` 候選直接寫進正式 `events.jsonl`。只有 `A/B/C` 經 schema gate 通過後才可 publish。

## Standard Procedure

### 1. Pre-flight

1. 讀 `docs/keep.summary.md`。
2. 若會修改 `.md / .json / .py`，讀 `encoding-touched-guard` 並在收工前跑 encoding check。
3. 先確認正式 ready events 與 review-only candidates 的數量：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/extract_event_candidates.py --overwrite
```

### 2. Generate MCQ Review Pack

若 `genericBattleCandidateCount > 0` 或未來 `genericEventCandidateCount > 0`，必須產出人類可審的選擇題檔：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/generate_event_review_choices.py --top 20
```

輸出必須包含：

- candidate id / event key
- source refs
- source quote
- proposed event type
- proposed participants
- proposed summary
- validator warnings
- A/B/C/D/E 選項
- answers todo JSON 對應 key

### 3. Human Review

優先使用文件式 MCQ，避免口頭審核散落在對話中：

```text
artifacts/data-pipeline/sanguo-rag/extracted/events/event-review-choices.md
artifacts/data-pipeline/sanguo-rag/extracted/events/event-review-answers.todo.json
```

若使用者要求即時互動，可以用 `vscode_askQuestions` 一題一題問，但最後仍要回寫 answers / decisions 檔。

### 4. Apply Answers

套用人工答案：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/apply_event_review_answers.py
```

套用後必須更新：

- `event-review-decisions.json`
- `accepted-events.jsonl`
- `rejected-events.jsonl`
- `pending-events.jsonl`

### 5. Publish Accepted Events

只有 accepted events 通過 schema gate 後，才可併入正式 `events.jsonl` 或下一版 canonical events source。publish 後必須重跑：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_keyword_options.py --general-id zhang-fei --overwrite
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_persona_cards.py --overwrite
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_api_readiness_index.py --general-id zhang-fei --overwrite
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/validate_llm_extraction_trial.py --overwrite
```

### 6. Verify

至少跑：

```bash
$HOME/.venv/3klife-etl/bin/python -m py_compile \
  server/npc-brain/pipelines/sanguo-rag/extract_event_candidates.py \
  server/npc-brain/pipelines/sanguo-rag/generate_event_review_choices.py \
  server/npc-brain/pipelines/sanguo-rag/apply_event_review_answers.py \
  server/npc-brain/pipelines/sanguo-rag/run_event_review_loop.py
```

如果 service fixture 有變，再跑：

```bash
cd server/npc-brain
PYTHONPATH=. $HOME/.venv/3klife-etl/bin/python -m app.smoke_test
PYTHONPATH=. $HOME/.venv/3klife-etl/bin/python -m app.http_smoke_test
PYTHONPATH=. $HOME/.venv/3klife-etl/bin/python -m app.cocos_flow_smoke_test
```

## LangGraph Studio Role

LangGraph Studio 適合作為「事件審核流程的可視化開發工具」，不是 deterministic ETL 的替代品。

推薦 graph 節點：

```text
load_chunks
  -> propose_event_candidates
  -> validate_candidate_schema
  -> route_by_confidence
  -> human_review_interrupt
  -> apply_human_edits
  -> publish_accepted_events
  -> rebuild_downstream_artifacts
  -> verify_runtime_smoke
```

State 建議包含：

```json
{
  "runId": "event-review-2026-04-29-r1",
  "candidateId": "romance.generic-battle.001-p15",
  "sourceRefs": ["001#p15"],
  "sourceQuote": "...",
  "proposedEvent": {},
  "validatorWarnings": [],
  "humanDecision": null,
  "humanEdits": {},
  "publishResult": null,
  "downstreamChecks": []
}
```

Studio 要看的不是漂亮圖，而是每個節點的狀態差異：

- 哪個 chunk 被提案。
- 為什麼進 review。
- 哪個 validator 擋下來。
- 人類改了什麼欄位。
- resume 後是否正確 publish。
- publish 後 keyword / persona / API 是否重建成功。

## LangGraph Adoption Policy

分階段採用：

1. 先保留 Python + Pydantic + JSONL / Markdown MCQ 作為 canonical pipeline。
2. 再用 LangGraph local graph 包裝同一條流程，方便 Studio debug。
3. Studio 只用於開發期可視化、human-in-the-loop、狀態回放。
4. LangGraph Cloud / LangSmith Deployment 等 schema 與本地流程穩定後再評估，不作為 MVP 前置依賴。

## Stop Condition

停止一輪事件審核時，必須回報：

- ready event count
- generic candidate count
- generated review question count
- accepted / rejected / pending / deferred count
- 是否重建 keyword / persona / API
- 是否通過 LLM trial 與 smoke tests

如果只完成設計或 skill 更新，也要明確說明尚未產生 MCQ 腳本或尚未套用人類答案。
