# Sanguo RAG Pipelines

`server/npc-brain/pipelines/sanguo-rag/` 是三國大腦中台的正式 ETL / RAG pipeline 腳本位置。

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

`clean_and_split.py` 現在也可選擇加上 LangChain `RecursiveCharacterTextSplitter`，額外輸出 `chunks/` 與 `chunks-manifest.json`，用來比較「以 paragraph 為主的 deterministic 切法」與「固定 chunk size + overlap 的 LLM 前處理切法」差異。

對應 config：

- `config/general-alias-overrides.json`
- `config/manual-roster-seeds.json`
- `config/unresolved-triage-decisions.json`

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
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/check_event_alias_hits.py --overwrite
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
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/resolve_dialogue_mentions.py --overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/dialogue-resolution/dialogue-resolution.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/dialogue-resolution/dialogue-resolution.md`

E-5b 再用 deterministic baseline 建立事件候選，不直接讓 LLM 猜人物身份：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/extract_event_candidates.py --overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/events-review.md`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/events-summary.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates-review.md`

目前 MVP 正式 events 產出張飛長坂橋 gold seed、四個 alias smoke events 與一個 dialogue offer event。`generic-battle-candidates.*` 是 review queue，未人工接受前不會進 keyword pack、persona card 或 API readiness。接著 E-6 從正式事件候選投影 keyword pack：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_keyword_options.py \
	--general-id zhang-fei \
	--overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/keyword-options/zhang-fei.keywords.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/keyword-options/keyword-options-summary.md`

這層的原則是：keyword options 只能讀事件與 evidence，不重新掃 raw text 生詞。Unity 對照：`events.jsonl` 像 canonical ScriptableObject 資料，`*.keywords.json` 像由 importer 產出的 UI 選單索引。

LLM trial 先走離線 schema gate，不假裝已呼叫模型：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/validate_llm_extraction_trial.py --overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/llm-extraction-trial/llm-trial-prompt-bundle.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/llm-extraction-trial/llm-trial-report.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/llm-extraction-trial/llm-trial-report.md`

最後可產出 API / embedding readiness fixtures：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_api_readiness_index.py --general-id zhang-fei --overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/context-options.response.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/keyword-options.response.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/dialogue-evidence-probe.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/pinecone-metadata-manifest.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/api-readiness-report.md`

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