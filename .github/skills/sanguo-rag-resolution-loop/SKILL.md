---
doc_id: doc_agentskill_0038
name: sanguo-rag-resolution-loop
description: 'Sanguo RAG unresolved mention resolution loop. Use for: 三國 RAG, unresolved mentions, alias review, observed mentions, MCQ triage, manual roster seeds, false-positive exclusion, running run_resolution_loop.py, applying unresolved-triage answers, delegating 三國名詞查證 to a web-capable agent, or Pilot ETL chunk experiments with LangChain text splitters / LangGraph / LangFlow around 張飛長坂橋等小樣本流程。'
argument-hint: '可指定 --top 數量、是否套用已填 answers、是否委派 web 查證 agent。'
---

# Sanguo RAG Resolution Loop

這個 skill 用來把 `observed mentions -> unresolved labels -> MCQ 裁決 -> decisions/manual roster -> rebuild/rescan` 做成可重複循環。

Unity 對照：這類似一個資料版 AssetPostprocessor。腳本負責 deterministic import/rebuild，人工或研究 agent 只裁決少數不確定 label。

## When to Use

- 使用者提到 `unresolved`、`alias review`、`observed mentions`、`manual roster seeds`、`文本稱呼表`、`正式對照表`。
- 使用者想「繼續跑循環」、「產生選擇題」、「套用 A/B/C/D 裁決」、「收斂三國 RAG 人名解析」。
- 使用者想把候選名詞交給 agent 查證是否為三國人物、地名、官稱或切詞噪音。
- 同一批名詞會反覆去固定網站或百科來源查證，想先壓成 compact term lookup CLI 再交給 reviewer。

## Core Files

- Loop script: `server/npc-brain/pipelines/sanguo-rag/run_resolution_loop.py`
- Clean/split script: `server/npc-brain/pipelines/sanguo-rag/clean_and_split.py`
- Apply answers: `server/npc-brain/pipelines/sanguo-rag/apply_triage_answers.py`
- Research brief: `server/npc-brain/pipelines/sanguo-rag/generate_term_research_brief.py`
- Decisions: `server/npc-brain/pipelines/sanguo-rag/config/unresolved-triage-decisions.json`
- Manual seeds: `server/npc-brain/pipelines/sanguo-rag/config/manual-roster-seeds.json`
- MCQ output: `artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/unresolved-triage-choices.md`
- Answers template: `artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/unresolved-triage-answers.todo.json`

## Pilot ETL Chunk Learning Mode

當使用者想學「LangChain text splitters / LangGraph / LangFlow 到底該放在哪」，先不要把整條 unresolved loop 改成框架驅動；先用 `張飛長坂橋` 這種單章小樣本做對照實驗。

### Step 1. 保留 deterministic baseline

先跑原本的 `clean_and_split.py`，保留章回與 paragraph index：

```bash
python server/npc-brain/pipelines/sanguo-rag/clean_and_split.py \
  --input <source.md> \
  --output-root artifacts/data-pipeline/sanguo-rag/markdown \
  --overwrite
```

這會得到：

- `source.md`
- `chapters/ch_###.md`
- `chapters-manifest.json`

這一層是 deterministic evidence layer，類似 Unity 先把 raw asset import 成可追蹤 metadata。

### Step 2. 加上 LangChain text splitters 做 chunk 對照

若要比較 paragraph-based 切法與 LLM 常用 chunking，再跑：

```bash
python server/npc-brain/pipelines/sanguo-rag/clean_and_split.py \
  --input <source.md> \
  --output-root artifacts/data-pipeline/sanguo-rag/markdown \
  --chunk-with-langchain \
  --chunk-size 500 \
  --chunk-overlap 80 \
  --overwrite
```

額外輸出：

- `chunks/<chapter_id>/<chunk_id>.md`
- `chunks-manifest.json`

學習重點：

- `chapters-manifest.json` 看 paragraph index / source offset。
- `chunks-manifest.json` 看 chunk size / overlap / source refs。
- 比較哪種切法在 E-5a 對話消歧、E-5b 事件抽取、E-6 keyword pack 比較穩。

### Step 3. LangGraph 放在有分支狀態時才值得

LangGraph 不適合拿來取代 deterministic preprocessing。它最有價值的地方是：

- `chunk -> extract -> validate -> retry -> review` 這種有狀態、有分流的 LLM pipeline
- `high-confidence -> publish` / `low-confidence -> review queue` 這種圖狀流程
- 抽取失敗後需要保留 intermediate state 與重試策略的情境

若目前只是單章 PoC，先不用急著上 LangGraph。

### Step 4. LangFlow 主要用來學習與展示，不是正式 ETL 依賴

LangFlow 最適合：

- 視覺化展示 prompt / parser / retriever 怎麼串
- demo 時快速調參
- 教學用地看 chain 每一步輸入輸出

但正式 pipeline 還是應以 Python 腳本為主，避免把核心 ETL 綁死在視覺化編排工具。

### 建議判斷

- 只做清洗、拆章、保留 paragraph index：先用純 Python + Pydantic。
- 要比較 chunk size / overlap 對抽取效果的影響：加 LangChain text splitters。
- 要做多步驟抽取、驗證、重試、分流：再考慮 LangGraph。
- 要做教學 demo 或視覺化展示：再補 LangFlow。

## Standard Procedure

1. Pre-flight: read `docs/keep.summary.md` and use Traditional Chinese.
2. If text files will be edited, load `encoding-touched-guard` and run touched encoding checks before finishing.
3. Run one loop:

```bash
python server/npc-brain/pipelines/sanguo-rag/run_resolution_loop.py --top 30
```

4. Show the user the generated MCQ path and summarize the first few labels.
5. If the user filled answers, apply them:

```bash
python server/npc-brain/pipelines/sanguo-rag/apply_triage_answers.py
python server/npc-brain/pipelines/sanguo-rag/run_resolution_loop.py --top 30
```

6. Verify:

```bash
python -m py_compile \
  server/npc-brain/pipelines/sanguo-rag/collect_observed_mentions.py \
  server/npc-brain/pipelines/sanguo-rag/run_resolution_loop.py \
  server/npc-brain/pipelines/sanguo-rag/apply_triage_answers.py \
  server/npc-brain/pipelines/sanguo-rag/generate_term_research_brief.py
```

7. Encoding check touched files:

```bash
npm run check:encoding:touched -- --files <changed-text-files>
```

## Decision Semantics

- `A person`: a real person label. Requires `personRecord.generalId` and `personRecord.faction`; `apply_triage_answers.py` adds it to manual roster seed.
- `B noise`: not a person. Adds to `noiseLabels`; collector emits it as `excluded`, not `unresolved`.
- `C ambiguous`: still needs review or is useful but not resolvable now. Adds to `ambiguousLabels`; collector emits it as `review-pending`.
- `D defer`: no action; it stays unresolved and will appear again.

Do not force all unresolved labels into person seeds. The goal is zero unclassified labels, not zero non-person labels.

## Web Research Delegation

若同一批名詞會反覆查固定來源，不要每次都直接委派瀏覽器研究。先判斷是否該用 `agent-cli-factory` 建一層 repo-local term lookup CLI，例如 `3klife-sanguo-term-lookup`，把輸出壓成 `--compact --json` 的來源命中摘要、候選 person/noise 判斷與 citation 線索。

CLI-first 的目標不是跳過人工審核，而是先把「明顯不是人名」或「明顯命中既有來源」的候選縮成小結果集，讓 web-capable agent 只處理真正模糊的標籤。

現成 term lookup CLI：
```bash
node tools_node/agent-clis/3klife-sanguo-term-lookup.js \
  --choices-json artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/unresolved-triage-choices.json \
  --limit 20 \
  --compact

node tools_node/agent-clis/3klife-sanguo-term-lookup.js \
  --label 孔明 \
  --label 子敬 \
  --label 主公 \
  --json
```

When labels are not obvious, first generate a research brief:

```bash
python server/npc-brain/pipelines/sanguo-rag/generate_term_research_brief.py --top 30
```

Then delegate the brief to `Sanguo Term Researcher` if available. Ask it to return `answer`, `confidence`, `evidence`, and a suggested `personRecord` only for clear people.

If no web-capable agent/tool or reusable CLI is available in the current environment, do not pretend a web check was performed. Provide the research brief path and continue deterministic loop work.

## Research Evidence Rules

- 先檢查《三國演義角色列表》：`https://zh.wikipedia.org/wiki/三國演義角色列表`，可快速確認稱呼是否屬於《演義》人物名單。
- Prefer cross-checking at least two sources for person claims.
- Good sources include 三國志人物列表、三國演義人物列表、維基百科 / 維基文庫 / Wikisource, 中國哲學書電子化計劃, 萌典/漢典 for common terms, and reliable encyclopedia pages.
- Corpus evidence alone proves the label exists in the text; it does not prove whether it is person/place/noise.
- For `person`, output `generalId` in kebab pinyin style and a conservative `faction` (`wei`, `shu`, `wu`, `enemy`, `neutral`).
- For geography, offices, collective nouns, book phrases, or segmentation artifacts, choose `B noise`.
- For uncertain historical/literary ambiguity, choose `C ambiguous`.

## Stop Condition

Stop a loop round when:

- A fresh MCQ file was generated, or
- Filled answers were applied and a new loop was verified, or
- A real blocker occurred and is documented.

Always report the current counts: `resolved`, `unresolved`, `excluded`, `reviewPending`, and number of generated questions.
