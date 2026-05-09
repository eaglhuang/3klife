<!-- doc_id: doc_server_pipeline_0002 -->
# Sanguo RAG Pipelines

## External Evidence Fetch Path

`3kweb-check` 現在預設走 agent-native CLI，而不是把 Python urllib 直接放在最外層。

- 主要後端：`node tools_node/agent-clis/3klife-source-health.js`
- 總控入口：`python3 server/npc-brain/pipelines/sanguo-rag/run_3kweb_check.py --fetch-live --fetch-backend auto`
- `auto` 規則：先走 Node CLI，只有 CLI 不可用或回傳阻塞時才 fallback 到 Python urllib
- CLI 會主動清除壞掉的代理變數：
  `HTTP_PROXY / HTTPS_PROXY / ALL_PROXY / http_proxy / https_proxy / all_proxy`
- 來源健康檢查只產出 cache / summary / hash，不做 canonical writes

這次 `WinError 10061` 的根因不是網站本身無法外連，而是執行環境把流量導到 `127.0.0.1:9` 的假 proxy。現在這層已經被收進 CLI 與 runner 裡，其他 Agent 只要照 skill 跑就能直接避開。

`server/npc-brain/pipelines/sanguo-rag/` 是三國大腦中台的正式 ETL / RAG pipeline 腳本位置。

以下範例假設已在目標 venv 內執行；若還沒，先 `source` 對應的 `bin/activate`，或設定 `PYTHON_BIN` 指向該環境。

API service 層位於 `server/npc-brain/app/`。Pipeline 產出 canonical fixtures，service 再把 fixtures 轉為 Cocos 可呼叫的 `/v1/npc/*` DTO；兩層不要互相混寫。

目前已落地的正式腳本：

- `clean_and_split.py`：清洗 Markdown、拆章回、輸出 `chapters-manifest.json`
- `build_alias_dict.py`：輸出武將主名冊與正式對照表
- `collect_observed_mentions.py`：從章回 markdown 蒐集文本稱呼表
- `check_event_alias_hits.py`：在事件抽取前檢查新人工 alias 是否能正確召回 observed mentions
- `resolve_dialogue_mentions.py`：解析引號對話、address-title 與簡單 item mentions，輸出 E-5a 對話解析產物
- `gold_seed_registry.py`：集中保存 hand-authored gold seed specs，供 regression fixture 與 importer baseline 使用
- `extract_event_candidates.py`：從 observed mentions 產出 deterministic ready events 與 review-only generic battle candidates
- `validate_llm_extraction_trial.py`：產出 LLM prompt bundle，並用 schema gate 驗證 baseline / 擋 hallucinated generalId
- `build_keyword_options.py`：從 event candidates 投影 E-6 keyword options
- `build_api_readiness_index.py`：產出 context-options / keyword-options / dialogue evidence / Pinecone metadata 靜態 readiness fixtures
- `run_progress_advancement_loop.py`：ABAB 式進度推進控制器，做 preview / backlog / stage / progress estimate 的外層迴圈
- `run_three_lane_progress_scheduler.py`：固定順序跑三車道 `sweep -> precision -> promotion-eval`，並把上一車道 baseline 自動接給下一車道
- `run_full_roster_convergence_loop.py`：全量高速公路總控（external evidence -> full pilot -> scoreboard -> optional three-lane）
- `build_external_evidence_cards.py`：來源設定轉 evidenceCard（第一版採 allowlist + manual seed，`canonicalWrites=false`）
- `build_full_roster_scoreboard.py`：雙分數與 lane 建議（`historicalTrustScore` / `worldbuildingUsabilityScore`）

三車道流程的白話說明（資料流 + 決策原理 + 範例）可看：

- `three-lane-progress-explained.zh-TW.md`
- `full-roster-convergence-highway.zh-TW.md`
- `full-roster-confidence-rag-highway.zh-TW.md`

全量高速公路 v2 的三張流程圖 JPG 產物會落在：

- `diagram-assets/full-roster-confidence-etl-flow.jpg`
- `diagram-assets/full-roster-confidence-rag-flow.jpg`
- `diagram-assets/full-roster-confidence-rumination-flow.jpg`

`clean_and_split.py` 現在也可選擇加上 LangChain `RecursiveCharacterTextSplitter`，額外輸出 `chunks/` 與 `chunks-manifest.json`，用來比較「以 paragraph 為主的 deterministic 切法」與「固定 chunk size + overlap 的 LLM 前處理切法」差異。

對應 config：

- `config/general-alias-overrides.json`
- `config/manual-roster-seeds.json`
- `config/unresolved-triage-decisions.json`
- `config/external-evidence-sources.json`

中間產物仍統一落在：

- `artifacts/data-pipeline/sanguo-rag/markdown/`
- `artifacts/data-pipeline/sanguo-rag/extracted/`

舊的 `tools/etl/commands/*.py` 現在只保留為相容 wrapper，正式維護位置以本目錄為準。

## Clean And Split

基本用法仍維持 deterministic-first：

```bash
python server/npc-brain/pipelines/sanguo-rag/clean_and_split.py \
	--input artifacts/data-pipeline/sanguo-rag/markdown/source.md \
	--output-root artifacts/data-pipeline/sanguo-rag/markdown \
	--overwrite
```

若要把 LangChain text splitter 一起接進來做學習與比較，可加：

```bash
python server/npc-brain/pipelines/sanguo-rag/clean_and_split.py \
	--input artifacts/data-pipeline/sanguo-rag/markdown/source.md \
	--output-root artifacts/data-pipeline/sanguo-rag/markdown \
	--chunk-with-langchain \
	--chunk-size 500 \
	--chunk-overlap 80 \
	--overwrite
```

額外輸出：

- `artifacts/data-pipeline/sanguo-rag/markdown/chunks/<chapter_id>/<chunk_id>.md`
- `artifacts/data-pipeline/sanguo-rag/markdown/chunks-manifest.json`

`chunks-manifest.json` 會保留每個 chunk 對應的 `source_refs`、段落範圍與 source offset，可直接拿去做 E-5a / E-5b 的對話解析與事件抽取實驗。

## Event Alias Hit Check

在進入 E-5b 事件抽取前，先跑 alias hit gate，確認近期人工修正的稱呼不會在事件召回層綁錯人物：

```bash
python server/npc-brain/pipelines/sanguo-rag/check_event_alias_hits.py --overwrite
```

預設檢查：

- `許諸 -> xu-zhu`
- `孫郎 -> sun-ce`
- `曹瞞 -> cao-cao`
- `祝融 -> zhu-rong-furen`

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/event-alias-hit-check/event-alias-hit-check.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/event-alias-hit-check/event-alias-hit-check.md`

如果這一步 FAIL，先修正 `general-alias-overrides.json` / `manual-roster-seeds.json` / `unresolved-triage-decisions.json`，不要繼續把錯誤身份送進事件抽取。

## Event Candidates And Keyword Options

E-5a 先解析對話與 address-title：

```bash
python server/npc-brain/pipelines/sanguo-rag/resolve_dialogue_mentions.py --overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/dialogue-resolution/dialogue-resolution.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/dialogue-resolution/dialogue-resolution.md`

E-5b 再用 deterministic baseline 建立事件候選，不直接讓 LLM 猜人物身份：

```bash
python server/npc-brain/pipelines/sanguo-rag/extract_event_candidates.py --overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/events-review.md`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/events-summary.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates-review.md`

目前 MVP 正式 events 產出張飛長坂橋 gold seed、四個 alias smoke events 與一個 dialogue offer event。`generic-battle-candidates.*` 是 review queue，未人工接受前不會進 keyword pack、persona card 或 API readiness。接著 E-6 從正式事件候選投影 keyword pack：

```bash
python server/npc-brain/pipelines/sanguo-rag/build_keyword_options.py \
	--general-id zhang-fei \
	--overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/keyword-options/zhang-fei.keywords.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/keyword-options/keyword-options-summary.md`

這層的原則是：keyword options 只能讀事件與 evidence，不重新掃 raw text 生詞。Unity 對照：`events.jsonl` 像 canonical ScriptableObject 資料，`*.keywords.json` 像由 importer 產出的 UI 選單索引。

LLM trial 先走離線 schema gate，不假裝已呼叫模型：

```bash
python server/npc-brain/pipelines/sanguo-rag/validate_llm_extraction_trial.py --overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/llm-extraction-trial/llm-trial-prompt-bundle.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/llm-extraction-trial/llm-trial-report.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/llm-extraction-trial/llm-trial-report.md`

若本機已安裝 Ollama `deepseek-r1:7b`，可再跑 DeepSeek 推理 sidecar。這一步會依 `--general-id` 過濾 deterministic `events.jsonl` 與 review-only `generic-battle-candidates.jsonl`，再讀對應 keyword pack，輸出事件/關鍵字 review hints；它不會改 canonical events 或 keyword fixtures：

```bash
python server/npc-brain/pipelines/sanguo-rag/run_deepseek_reasoning_trial.py \
	--general-id zhang-fei \
	--model deepseek-r1:7b \
	--overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/deepseek-reasoning/deepseek-reasoning-prompt-bundle.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/deepseek-reasoning/deepseek-reasoning-report.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/deepseek-reasoning/deepseek-reasoning-report.md`
- `artifacts/data-pipeline/sanguo-rag/extracted/deepseek-reasoning/deepseek-reasoning-raw.json`

DeepSeek R1 常見的 `<think>...</think>` 會被清洗，只保留短 `reasoningTracePreview` 供 debug；report 中的 reasons / notes 會壓縮長度，避免把推理鏈污染到正式資料。若只想產生 prompt bundle、不呼叫本地模型，可加 `--prompt-only`。

若 Ollama 裝在 Windows，而 pipeline 從 WSL 執行，請確認 WSL 能連到 Ollama `/api/chat`。Windows 版 Ollama 若只 listen 在 Windows `127.0.0.1:11434`，WSL 可能會看到 `Connection refused` 或 timeout；此時可改在 WSL 安裝 Ollama，或讓 Windows Ollama 以 WSL 可達的 host/port 提供服務，再用 `--api-url http://<host>:11434/api/chat` 指定。

## ETL Quality Pilot

要開始把「所有武將回答品質」變成可量測資料流，先跑 review-only pilot，不直接改正式事件或 keyword fixtures：

```bash
python server/npc-brain/pipelines/sanguo-rag/run_etl_quality_pilot.py \
	--top 24 \
	--include-cold 4 \
	--overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/etl-quality-pilot-report.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/etl-quality-pilot-report.md`
- `artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/review-queue.todo.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/keyword-options/*.keywords.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/persona-cards/*.persona.json`

這個 pilot 的用途是找出每位武將目前屬於：

- `ready-for-dialogue-smoke`：已有 event / keyword / evidence，可進 Cocos 或 provider A/B 台詞測試。
- `thin-but-testable`：有 evidence 但 keyword 類別偏薄，先補關鍵字或 review generic candidates。
- `needs-etl-evidence`：不能先拿去評台詞品質，應先抽事件或接受候選事件。

`review-queue.todo.json` 是下一輪人工/DeepSeek sidecar review 的入口。它只列建議，不 publish；正式入庫仍要走 event review / apply answers 流程。

若某位武將已有 `generic-battle-candidates`，可以把候選轉成可人工審的 MCQ / todo：

```bash
python server/npc-brain/pipelines/sanguo-rag/generate_event_review_choices.py \
	--general-id lu-bu \
	--reasoning-report artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/deepseek-lu-bu/deepseek-reasoning-report.json \
	--output-root artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/event-review-lu-bu \
	--overwrite
```

輸出：

- `event-review-choices.<generalId>.md`
- `event-review-answers.<generalId>.todo.json`

選項固定為 `A accept` / `B accept-with-edits` / `C reject` / `D defer`。DeepSeek sidecar 的建議只會填入 `deepseekHint` 與 `suggestedAnswer`，不會自動套用。

若人類或 DeepSeek 因單段 `sourceQuote` 被截斷而無法判斷 `location` / `relationshipEdges`，先展開 sourceRef 前後文，再讓 DeepSeek 產生 review-only edits：

```bash
python server/npc-brain/pipelines/sanguo-rag/enrich_event_review_context.py \
	--answers artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/event-review-lu-bu/event-review-answers.lu-bu.todo.json \
	--api-url http://172.31.80.1:11435/api/chat \
	--model deepseek-r1:7b \
	--window-before 2 \
	--window-after 2 \
	--fill-answers \
	--overwrite
```

輸出：

- `event-review-context.<generalId>-bundle.json`
- `event-review-context.<generalId>-report.json`
- `event-review-context.<generalId>-report.md`
- `event-review-answers.<generalId>.enriched.todo.json`

`--fill-answers` 只會填 enriched todo，不會改 canonical events。若 DeepSeek 補齊 `summary`、`location` 與合法 `relationshipEdges`，該題可標為 `A`；若欄位仍缺，腳本會保守降回 `B`。

`enrich_event_review_context.py` 會先從 expandedContext 產生 `candidateHints`，包含 source-grounded `locationCandidates` 與合法 `generalIds/sourceRefs` 的 `relationshipCandidates`，再交給 DeepSeek 逐題判讀。若 DeepSeek 回傳壞 JSON、回抄 payload 或漏欄位，逐題流程不會中斷；腳本會記錄 error，並只在候選提示同時補齊 summary / location / 目標武將參與的強 relationshipEdge 時產生待審 `A` proposal。沒有目標武將強 edge 的題目會保守留 `B`。

最後可產出 API / embedding readiness fixtures：

```bash
python server/npc-brain/pipelines/sanguo-rag/build_api_readiness_index.py --general-id zhang-fei --overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/context-options.response.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/keyword-options.response.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/dialogue-evidence-probe.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/pinecone-metadata-manifest.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/api-readiness-report.md`

若要把這些 readiness 產物真正接進向量層，可接著做：

### Vector-ready export

```bash
python server/npc-brain/pipelines/sanguo-rag/export_vector_records.py \
	--events artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl \
	--keyword-root artifacts/data-pipeline/sanguo-rag/extracted/keyword-options \
	--persona-root artifacts/data-pipeline/sanguo-rag/extracted/persona-cards \
	--output-root artifacts/data-pipeline/sanguo-rag/extracted/vector-ready \
	--overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/vector-ready/vector-records.facts.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/vector-ready/vector-records.keywords.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/vector-ready/vector-records.persona.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/vector-ready/vector-records.all.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/vector-ready/vector-records.index.json`

### Pinecone bootstrap

先做設定檢查：

```bash
python server/npc-brain/pipelines/sanguo-rag/init_pinecone_index.py --dry-run
```

建立 index：

```bash
python server/npc-brain/pipelines/sanguo-rag/init_pinecone_index.py
```

### Pinecone upsert

如果要上傳其他資料，建議維持同一個格式：

1. 先把來源整理成 `VectorRecord` JSONL（`id / namespace / text / metadata`）。
2. `namespace` 用來區分語意域，例如 `romance_facts_v1` / `general_keywords_v1` / `general_persona_v2`。
3. `metadata` 只能放 Pinecone 支援的 primitive 值；像 `null`、巢狀物件、空值清單都要先處理。
4. 長文本先 chunk，再上傳 chunk-level records；不要把整本書一次塞成單筆。

> 注意：`upsert_pinecone_records.py` 會在送進 Pinecone 前遞迴清掉 metadata 裡的 `None` / `null`。
> Pinecone metadata 只接受 `string / number / boolean / list[string]`，所以像 `faction: null` 會被 drop。
> 如果某欄位未來要拿來 filter，請在源資料先補成具體值，不要留 `null`。

先用 `mock` embedding 做 smoke test（只驗證讀檔與 embedding，不真的寫入）：

```bash
python server/npc-brain/pipelines/sanguo-rag/upsert_pinecone_records.py \
	--records-root artifacts/data-pipeline/sanguo-rag/extracted/vector-ready \
	--embedding-provider mock \
	--dry-run
```

確認沒問題後，移除 `--dry-run` 才會真的 upsert：

```bash
python server/npc-brain/pipelines/sanguo-rag/upsert_pinecone_records.py \
	--records-root artifacts/data-pipeline/sanguo-rag/extracted/vector-ready \
	--embedding-provider mock
```

之後若要正式用本地 embedding，再切到：

```text
NPC_EMBEDDING_PROVIDER=sentence_transformers
NPC_EMBEDDING_MODEL=BAAI/bge-m3
```

並補裝 `sentence-transformers` 與相容的 `torch`。

#### Pinecone readback / query smoke test

上傳後，用同一個 embedding provider / model 對一段已知文本 query，確認能讀回 top hit：

```bash
python server/npc-brain/pipelines/sanguo-rag/query_pinecone_records.py \
	--namespace keywords \
	--query-text "武將：sima-yi
關鍵字分類：person
關鍵字：司馬昭
關聯人物：sima-yi、sima-zhao" \
	--embedding-provider mock \
	--top-k 3 \
	--expected-id "keyword::sima-yi::sima-zhao"
```

如果你是用 `sentence_transformers` 上傳，就把 query 的 embedding provider / model 設成一樣；
smoke test 最好拿「已上傳過的原始文本」當 query，這樣 top-1 最容易對上。

## Observed Mentions

真實毛評本正文章回目前可用：

- `artifacts/data-pipeline/sanguoyanyi-mao-hant-2026-04-28/body/chapters/`

掃描範例：

```bash
python server/npc-brain/pipelines/sanguo-rag/collect_observed_mentions.py \
	--chapters-root artifacts/data-pipeline/sanguoyanyi-mao-hant-2026-04-28/body/chapters \
	--formal-map artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/formal-mention-map.json \
	--output-root artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions \
	--collect-cjk-candidates \
	--candidate-mode conservative \
	--overwrite
```

`conservative` 模式只保留較像人物稱呼的 unknown candidate，並為每筆 mention 補同段已解析出的 `sceneParticipants`，供 E-5a 對話稱呼消歧使用。

## Resolution Loop

`run_resolution_loop.py` 會自動執行：

1. 重建 alias dictionary。
2. 依 `config/unresolved-triage-decisions.json` 分流已裁決的 `noiseLabels` / `ambiguousLabels`。
3. 重掃 observed mentions。
4. 再重建 alias review report。
5. 輸出下一輪需要人工裁決的 MCQ：
	- `artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/unresolved-triage-choices.json`
	- `artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/unresolved-triage-choices.md`
	- `artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/unresolved-triage-answers.todo.json`
	- `artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/romance-character-list-cache.json`

若要快速理解「文本掃描 -> 候選 -> triage -> resolved/excluded/review-pending/unresolved」整條鏈路，可看同目錄的 `人名事件解析.md`。

執行範例：

```bash
python server/npc-brain/pipelines/sanguo-rag/run_resolution_loop.py --top 30
```

MCQ 選項固定為：`A person` / `B noise` / `C ambiguous` / `D defer`。`noise` 會從 unresolved 排除，`ambiguous` 會轉為 `review-pending`，只有 `person` 需要補入 manual roster seed 或後續人工資料。

每題 `question.recommendation` 會附帶 deterministic 建議排序與理由。現在會優先檢查《三國演義角色列表》 raw source 並快取到 `romance-character-list-cache.json`，同時把 `manual-roster-seeds.json` + `general-alias-overrides.json` 當作第二條本地人物白名單證據；若 label 命中角色列表或本地白名單，會提高 `A person` 分數；若片段只反覆出現在 `陳留王`、`馬步兵` 這類複合詞中，則會提高 `B noise` 分數。當外部來源暫時不可用時，loop 會退回 cache，不會因為網站失敗而中斷。

生成的 `unresolved-triage-answers.todo.json` 現在也會同步帶出 `suggestedAnswer`、`suggestedDecision`、`suggestionConfidence`、`suggestionReasons`。若 recommendation 明確偏向 `A person` 且本地白名單可對到唯一 `generalId`，todo 內的 `personRecord` 也會預填可用欄位，讓人工只需複核或補足 faction。

人工填完 `unresolved-triage-answers.todo.json` 後，可套用裁決：

```bash
python server/npc-brain/pipelines/sanguo-rag/apply_triage_answers.py
python server/npc-brain/pipelines/sanguo-rag/run_resolution_loop.py --top 30
```

若要讓 loop 保守地自動收斂明顯的非人物項，可直接使用：

```bash
python server/npc-brain/pipelines/sanguo-rag/run_resolution_loop.py --top 30 --auto-fill-suggestions --apply-answers
```

這會先把現有 `unresolved-triage-answers.todo.json` 內「高信心的 `B noise` / `C ambiguous` suggestion」自動填回 `answer`，再沿用既有 apply/rebuild 流程；`A person` 仍保留人工複核，避免把人物 seed 自動寫錯。

若要把疑似人名 / 地名 / 官稱交給 web-capable agent 查證，可先產生 research brief：

```bash
python server/npc-brain/pipelines/sanguo-rag/generate_term_research_brief.py --top 30
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/term-research-brief.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/term-research-brief.md`

專用 skill：`.agents/skills/sanguo-rag-resolution-loop/SKILL.md`。若環境支援 custom agent，可把 research brief 交給 `.github/agents/sanguo-term-researcher.agent.md`。

## Manual Roster Seeds

若毛評本文本提到的史實人物尚未進正式 gameplay `generals.json`，可先補在：

- `server/npc-brain/pipelines/sanguo-rag/config/manual-roster-seeds.json`

`build_alias_dict.py` 會先讀 gameplay roster，再把這份 manual roster seed 合併進 `武將主名冊 / 正式對照表`。這適合先補 RAG 身份對照，不必為了 mention resolution 立即擴寫整份遊戲角色資料。
