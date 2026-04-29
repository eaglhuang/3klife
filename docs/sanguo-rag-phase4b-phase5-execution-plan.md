<!-- doc_id: doc_other_0013 -->
# Sanguo RAG Phase 4b / Phase 5 Execution Plan

> 對應母規格：`docs/遊戲規格文件/系統規格書/三國大腦中台規格書.md` 的 E-5a / E-5b / E-6。
> 本文件是執行計畫與 checklist，不取代母規格。母規格仍是正式需求來源。

## 1. 當前結論

E-5b「事件抽取」與 E-6「互動關鍵字抽取與分類」應該一起規劃，但不應拆成兩條互不相干的 pipeline。

正確順序是：

```text
正式對照表 / observed mentions
  -> E-5a 對話解析與稱呼消歧
  -> E-5b event candidates / relationship edges
  -> E-6 keyword options projection
  -> persona card / embedding / API
```

理由：keyword pack 不能只靠單一 chunk 臆測，必須回扣事件、關係與 source refs。也就是 E-6 應該讀取 E-5b 的事件輸出，再投影成可點擊 keyword，而不是另跑一套文字掃描器。

## 2. E-5a 是否要拆成 skill

暫時先不要拆成獨立 skill。E-5a 現在放在母規格是合理的，因為它仍是事件抽取前的資料契約，不是可重複交給 agent 執行的穩定工作流。

建議最後一次拆 skill 的條件：

- 已有 `dialogue-resolution` 或同等腳本可穩定輸出 `sceneParticipants`、`utterances`、`entityMentions`。
- E-5b event extractor 已經確定會讀哪些欄位，且欄位名不再頻繁變動。
- 至少有張飛長坂橋與一個非張飛章回通過 smoke test。
- skill 內容只描述 agent workflow，不把正式 schema 從母規格搬走。

拆分後的定位應是 `.agents/skills/sanguo-dialogue-resolution/` 這類「執行 E-5a 的操作流程」，不是新的規格來源。

## 3. 已完成的前置 gate

新增腳本：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/check_event_alias_hits.py --overwrite
```

輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/event-alias-hit-check/event-alias-hit-check.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/event-alias-hit-check/event-alias-hit-check.md`

目前檢查目標：

| Label | Expected generalId | 用途 |
|---|---|---|
| 許諸 | `xu-zhu` | 錯別字直接視為許褚，供事件抽取召回 |
| 孫郎 | `sun-ce` | 孫策稱呼召回 |
| 曹瞞 | `cao-cao` | 曹操貶稱 / 詩句稱呼召回 |
| 祝融 | `zhu-rong-furen` | 避免誤綁神話祖先 `zhu-rong` |

此 gate 的目的不是抽事件，而是確認事件抽取前的 alias 面已經安全。若這一步 FAIL，後面的 event / keyword 會把錯誤身份放大。

## 4. 環境狀態

已確認：

- `/home/eagl/.venv/3klife-etl/bin/python` 可用。
- `pydantic 2.13.3` 已安裝。
- `langchain-text-splitters 1.1.2` 已補裝，供 chunk 對照實驗使用。

暫時不安裝重依賴：

- `docling` / `marker-pdf`：PDF conversion 階段才需要。
- Gemini / Vertex / Ollama SDK：等 deterministic event schema 與 pilot sample 穩定後再接。
- Pinecone client：等 event / keyword pack 能穩定產出後再入庫。

## 5. Milestones

### M0. Alias Recall Gate

目標：事件抽取前，先確認人工修正過的稱呼能穩定解析。

Status：done。

Checklist：

- [x] `unresolved=0` 維持。
- [x] `likely-person=0`、`likely-noise=0`。
- [x] `許諸 -> xu-zhu` PASS。
- [x] `孫郎 -> sun-ce` PASS。
- [x] `曹瞞 -> cao-cao` PASS。
- [x] `祝融 -> zhu-rong-furen` PASS。
- [x] `build_alias_dict.py` collision count = 0。

### M1. Event Schema Draft

目標：先定義事件候選的 JSON schema，不急著接 LLM。

Status：MVP done。已由 `extract_event_candidates.py` 產出 deterministic event candidate schema 與 review 報告。

建議輸出：

- `artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/events-review.md`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl`
- `artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates-review.md`

事件欄位最小集：

- `eventId`
- `chapterNo`
- `eventKey`
- `generalIds`
- `location`
- `summary`
- `sourceQuote`
- `relationshipEdges`
- `moodTags`
- `confidence`
- `sourceRefs`

Checklist：

- [x] 事件 id 規則固定，例如 `romance.ch042.zhang-fei.changban-bridge`。
- [x] `sourceRefs` 可回到章回段落。
- [x] `generalIds` 只能來自正式對照表或 E-5a 消歧結果。
- [x] 未消歧泛稱只能保留 unresolved participant。
- [x] 低信心事件進 review，不進正式 keyword pack。
- [x] `generic-battle-candidate-v1` 先只產出 review-only 候選，不進正式 events / keyword / persona / API。

### M2. Deterministic Pilot Extractor

目標：用規則先跑張飛長坂橋與 alias smoke cases，建立 baseline。

Status：MVP done。已產出 6 筆 ready events：長坂橋 gold seed 1 筆、alias smoke 4 筆、dialogue offer 1 筆；另產出 12 筆 generic battle review candidates。

建議腳本：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/extract_event_candidates.py \
  --chapters-root artifacts/data-pipeline/sanguoyanyi-mao-hant-2026-04-28/body/chapters \
  --observed-mentions artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json \
  --output-root artifacts/data-pipeline/sanguo-rag/extracted/events \
  --pilot-general zhang-fei \
  --overwrite
```

Checklist：

- [x] 張飛長坂橋能抽出 `zhang-fei`、`liu-bei`、`cao-cao`。
- [x] `許諸` 相關段落能召回 `xu-zhu`。
- [x] `孫郎` 相關段落能召回 `sun-ce`。
- [x] `曹瞞` 相關段落能召回 `cao-cao`。
- [x] `祝融` 相關段落能召回 `zhu-rong-furen`，不誤綁 `zhu-rong`。
- [x] 每個事件至少有一條原文 quote 或 snippet。

### M3. Dialogue Resolution Integration

目標：把 E-5a 的對話解析結果接進事件抽取。

Status：MVP done。已由 `resolve_dialogue_mentions.py` 產出 `dialogue-resolution.json`，並由 `extract_event_candidates.py` 讀入生成 dialogue event。

建議做法：

- 先由 deterministic parser 切出旁白 / 引號內容。
- 用同段 `sceneParticipants` 作為泛稱解析候選。
- 將 `將軍`、`主公`、`先生` 這類 address-title 解析結果寫入 event extractor input。

Checklist：

- [x] `utterances[]` schema 草稿完成。
- [x] `entityMentions[]` schema 草稿完成。
- [x] address-title 無足夠證據時不硬綁。
- [x] 物品互動能產生 edge，例如 `寶刀 -> offered_to -> zhang-fei`。

### M4. LLM Extraction Trial

目標：在 deterministic baseline 上，用 LLM 只補結構化摘要與關係，不負責身份亂猜。

Status：offline gate done。已由 `validate_llm_extraction_trial.py` 產出 prompt bundle 與 schema 驗證報告；目前尚未接真實 LLM，只先完成可擋 hallucinated `generalId` 的安全門。

建議原則：

- Prompt input 必須包含正式對照候選與 E-5a 結果。
- Output 用 Pydantic schema 驗證。
- LLM 不得創建新 generalId。
- 失敗或低信心輸出進 review。

Checklist：

- [x] 張飛長坂橋 LLM 輸出和 deterministic baseline 一致。
- [x] JSON parse fail 可回退 review queue。
- [x] hallucinated generalId 會被 schema gate 擋下。
- [x] 低信心事件不進 keyword pack。

### M5. Keyword Pack Projection

目標：從 events / relationship edges / persona anchors 產出 E-6 keyword options。

Status：MVP done。已由 `build_keyword_options.py` 從 `events.jsonl` 投影第一版 `zhang-fei.keywords.json`。

建議腳本：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_keyword_options.py \
  --events artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl \
  --output-root artifacts/data-pipeline/sanguo-rag/extracted/keyword-options \
  --general-id zhang-fei \
  --overwrite
```

Checklist：

- [x] `person` 只收 resolved roster person 或 `non-roster person`。
- [x] `event` 來自 eventKey，不從裸詞硬生。
- [x] `label` 是 UI 短標籤，事件完整句改放 `fullLabel`，避免 Cocos 下拉選單被長句撐爆。
- [x] `location` 需有 sourceRefs 與事件關聯。
- [x] `item` 需有事件互動或明確共現證據。
- [x] `creature` 排除抽象比喻。
- [x] 每筆 keyword 至少有 `keywordKey`、`label`、`category`、`generalIds`、`sourceRefs`、`confidence`。
- [x] retired / low-confidence 不供 UI 顯示。

### M5b. Persona Card Projection

目標：在接 Gemini / Ollama / vLLM 等 LLM backend 前，先替武將產生 deterministic persona card，讓 LLM 只負責依 persona + evidence 渲染台詞，不負責憑空決定人格或史實。

Status：MVP done。已新增 `build_persona_cards.py`，可從 `generals.json`、events、keyword pack 產出 `general_persona_v2`。

建議腳本：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_persona_cards.py \
  --events artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl \
  --generals assets/resources/data/generals.json \
  --keyword-root artifacts/data-pipeline/sanguo-rag/extracted/keyword-options \
  --output-root artifacts/data-pipeline/sanguo-rag/extracted/persona-cards \
  --overwrite
```

Checklist：

- [x] 每張 persona card 至少含 `generalId`、`displayName`、`voiceStyle`、`personalityTraits`、`relationshipAnchors`、`keywordAnchors`、`evidenceRefs`、`safeFallbackLine`、`taboos`、`llmPromptRules`。
- [x] 張飛、關羽、趙雲、劉備、曹操、諸葛亮標記 `manualReviewRequired=true`。
- [x] `safeFallbackLine` 可供 API service 在 LLM 未接入或 evidence 不足時使用。
- [x] LLM prompt rules 明確禁止新增未提供 evidence 的重大史實。

### M6. API / Embedding Readiness

目標：等 event / keyword pack 穩定後，再接 FastAPI 與 Pinecone。

Status：static readiness done。已由 `build_api_readiness_index.py` 產出 context-options / keyword-options / dialogue evidence probe / Pinecone metadata manifest。尚未啟動 FastAPI server，也尚未寫入 Pinecone。

Checklist：

- [x] `GET /v1/npc/context-options` 可從 events 讀取。
- [x] `GET /v1/npc/keyword-options` 可從 keyword pack 讀取。
- [x] `POST /v1/npc/dialogue` 能回扣 selected keyword 的 evidenceRefs。
- [x] Pinecone metadata 可按 `generalIds + eventKey + category` filter。

## 6. MVP 完成快照

本輪已完成 M1 至 M6 的本地 deterministic MVP，主要產物如下：

| 階段 | 產物 | 結果 |
|---|---|---|
| E-5a Dialogue Resolution | `artifacts/data-pipeline/sanguo-rag/extracted/dialogue-resolution/dialogue-resolution.json` | 10 段、62 句 utterance |
| E-5b Event Candidates | `artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl` | 6 筆 event、6 筆 ready；另有 12 筆 generic battle review candidates |
| M4 LLM Trial Gate | `artifacts/data-pipeline/sanguo-rag/extracted/llm-extraction-trial/llm-trial-report.json` | baseline 6/6 accepted；hallucinated generalId 與 malformed JSON 均被擋下 |
| E-6 Keyword Options | `artifacts/data-pipeline/sanguo-rag/extracted/keyword-options/zhang-fei.keywords.json` | person=16、event=1、location=1、item=1、creature=1 |
| M5b Persona Cards | `artifacts/data-pipeline/sanguo-rag/extracted/persona-cards/persona-cards-summary.md` | general_persona_v2；核心名將需人工抽查 |
| M6 API Readiness | `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/api-readiness-report.md` | context-options=1；persona-card=pass；dialogue evidence probe=pass |

注意：`fixture.dialogue.address-title-offer` 只用於 M3 schema smoke test，不會進入正式 keyword pack / API context options。正式 UI keyword 仍只使用真實章回 sourceRefs。

## 7. 下一步建議

本計畫的 deterministic MVP 已完成 M1 至 M6，且下一階段的 API service facade 已落地：`server/npc-brain/app/` 目前提供 context-options、keyword-options、dialogue 三個入口的 service contract 與 FastAPI adapter。

本輪已驗證：

- `app.smoke_test`：service 層可讀 fixtures 與 persona card，回傳 context / keyword / dialogue DTO。
- `app.http_smoke_test`：FastAPI TestClient 可通過 `/healthz`、`/v1/npc/context-options`、`/v1/npc/keyword-options`、`/v1/npc/dialogue`。
- `app.cocos_flow_smoke_test`：模擬 Cocos 武將列表測試流程，點選張飛後刷新 keyword 下拉，選關鍵字後送出 dialogue request。
- ETL venv 已補 `fastapi 0.136.1` 與 `uvicorn 0.46.0`，可用 `python -m uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload` 啟動 dev server。
- Live server：已啟動 `http://127.0.0.1:8765`，並用實際 HTTP request 驗證 `/healthz`、`/v1/npc/keyword-options`、`/v1/npc/dialogue` 可回應。

Cocos 開發測試方法已補入 `三國大腦中台規格書.md`：武將列表最上方暫放「對話測試」按鈕與「關鍵字下拉選單」。點擊武將時依 `generalId` 重新呼叫 `GET /v1/npc/keyword-options`，下拉選完後才由按鈕觸發 `POST /v1/npc/dialogue`，用來驗證該武將對所選關鍵字的台詞。

Cocos runtime 端已完成第一版串接：`assets/scripts/core/services/NpcDialogueService.ts` 集中包裝 API；`ServiceLoader` 提供共用 service instance；`GeneralListComposite` 在 dev controls 模式下提供武將選取、keyword 下拉與對話測試按鈕；`LobbyScene` 目前從武將列表入口開啟這個測試模式。這個做法等同 Unity 裡把 HTTP facade 放在共用 service / manager，UI Button 與 Dropdown 只綁互動事件，不把網路協定散落在各個 MonoBehaviour。

本輪新增可重複的 runtime preview gate：`LoadingScene` 現支援 `previewTarget=21`，`tools_node/capture-ui-screens.js --target GeneralListNpcDialogueDev` 會載入 LobbyScene、開啟 GeneralList dev controls、選取張飛、取得 keyword options，並觸發 `POST /v1/npc/dialogue` 後截圖。最新 capture 輸出在 `artifacts/ui-qa/npc-dialogue-general-list-dev-r1-inspect/`，結果為 `pass-with-minor-residuals`：0 console error、0 page error、0 request failure；剩餘 warning 為既有 AudioSystem hostNode 與 character-ds3 placeholder sprite。

後續產品化工作：

1. 在 Cocos Editor Preview 人工點擊 General List，補看 toast 動畫與實際操作手感；自動 gate 已可覆蓋 dev controls、keyword API 與 dialogue request 的基本連線。
2. 接真實 LLM backend 前，先人工抽查 `persona-cards/` 的核心名將卡；接上後沿用 `llm-trial-prompt-bundle.json` 的輸入契約與 `validate_llm_extraction_trial.py` 的 schema gate。
3. 擴張章回範圍前，先把 E-5a speaker/addressee heuristics 從張飛長坂橋調整到至少第二個非張飛章回。
4. Pinecone 入庫前先用 `api-readiness/pinecone-metadata-manifest.json` 固定 metadata 欄位。