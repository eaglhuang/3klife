# NPC Brain Service

`server/npc-brain/` 是三國大腦中台的 Python service 層。Pipeline 仍負責產生 canonical events / keyword fixtures；service 只負責把這些產物轉成 Cocos 可呼叫的 DTO。

Unity 對照：pipeline 像 Importer / AssetPostprocessor，`app/` 像 runtime service facade。runtime 不重新掃文本，也不讓 LLM 發明人物身份。

## Current Entrypoints

- `GET /healthz`
- `GET /v1/npc/context-options?generalId=zhang-fei`
- `GET /v1/npc/keyword-options?generalId=zhang-fei`
- `POST /v1/npc/dialogue`

`POST /v1/npc/dialogue` 預設使用 deterministic template；設定 `NPC_LLM_PROVIDER_ORDER` 與 Gemini API key 後，可改走 Gemini，再依序 fallback 到 `local_llama` / 其它 provider。它會回傳 `text`、`locale`、`speechContextMode`、`evidenceRefs`、`usedKeywords`、`rejectedKeywordKeys`、`provider`、`model`、`providerTrace`、`qualityWarnings` 與 `repairUsed`，方便 Cocos 端先串 UI 與 debug panel。

## Dialogue Dimensions

NPC 對話目前保留兩個可擴充維度：

- `locale`：預設 `zh-TW`，目前支援 `zh-TW`、`en`、`ja`。這個欄位會進 prompt、response 與 history cache，避免未來補英文 / 日文時漏掉 fallback 資料維度。
- `speechContextMode`：預設 `life_chat`，目前支援 `life_chat`（生活聊天）、`encounter_speech`（遭遇發言）、`inner_monologue`（想法獨白）、`meeting_statement`（會議發言）。這是關鍵字的發話角度，不取代事件 `contextKey`。
- `llmModelPreset`：預設 `fallback_chain`，供 Cocos dev toolbar 測試指定模型；正式流程仍建議使用 fallback chain。

Cocos dev toolbar 會提供語系、情境與模型切換按鈕；切換後按「對話測試」即可用相同武將 / 關鍵字驗證不同情境與不同模型的 LLM 回應。

目前模型 preset：

- `fallback_chain`：使用 server 的 `NPC_LLM_PROVIDER_ORDER`，也就是正式 fallback 流程。
- `gemini_pro`：只測 `gemini-2.5-pro`。
- `gemini_flash`：只測 `gemini-2.5-flash`。
- `gemini_flash_lite`：只測 `gemini-2.5-flash-lite`。
- `qwen2_5_7b`：只測 Ollama `qwen2.5:7b`。
- `qwen2_5_3b`：只測 Ollama `qwen2.5:3b`。
- `deepseek_r1_7b`：只測 Ollama `deepseek-r1:7b`，標記為推理測試模型；適合 ETL / review reasoning，不建議當正式 NPC 台詞主力。
- `local_llama_env`：只測 `local_llama`，model 使用 `.env` 的 `NPC_LLM_MODEL_LOCAL_LLAMA`。

指定單一模型 preset 是「真模型測試」：該 provider / model 不可用時 API 會回 `503`，Cocos toolbar 會顯示 request failed 與 provider-chain failure，不會用 deterministic template 假裝 LLM 成功。只有 `fallback_chain` 會保留最後 deterministic safety line。

## Smoke Test

可先跑不依賴 FastAPI 的 service smoke test：

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/python -m app.smoke_test
```

安裝 FastAPI 後，可再跑 HTTP adapter smoke test：

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/python -m app.http_smoke_test
```

也可以跑 Cocos 流程 smoke test，模擬「點武將 -> 刷新關鍵字下拉 -> 按對話測試」：

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/python -m app.cocos_flow_smoke_test
```

LLM provider router 不依賴外部 API 的 smoke test：

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/python -m app.llm_provider_smoke_test
```

## Gemini Dev Test

Gemini 接入採 adapter / fallback 架構，不需要改 Cocos 呼叫路徑。建立 `server/npc-brain/.env` 或在啟動 terminal 設定：

```text
GOOGLE_API_KEY=<your-google-ai-studio-api-key>
NPC_LLM_PROVIDER_ORDER=gemini,gemini_flash,gemini_flash_lite,local_llama,history_cache,deterministic
NPC_LLM_MODEL_GEMINI=gemini-2.5-pro
NPC_LLM_MODEL_GEMINI_FLASH=gemini-2.5-flash
NPC_LLM_MODEL_GEMINI_FLASH_LITE=gemini-2.5-flash-lite
NPC_LLM_GEMINI_RETRY_COUNT=2
NPC_LLM_TIMEOUT_MS=6000
NPC_LLM_MODEL_LOCAL_LLAMA=qwen2.5:7b
NPC_LLM_MODEL_DEEPSEEK_REASONER=deepseek-r1:7b
NPC_LLM_LOCAL_LLAMA_API_URL=http://127.0.0.1:11434/api/chat
NPC_LLM_LOCAL_LLAMA_TIMEOUT_MS=12000
NPC_LLM_LOCAL_LLAMA_MAX_OUTPUT_TOKENS=192
NPC_LLM_LOCAL_LLAMA_TEMPERATURE=0.45
NPC_LLM_LOCAL_LLAMA_TOP_P=0.85
NPC_LLM_LOCAL_LLAMA_REPEAT_PENALTY=1.12
NPC_LLM_LOCAL_LLAMA_NUM_CTX=4096
NPC_LLM_LOCAL_LLAMA_REPAIR_RETRY_COUNT=1
NPC_LLM_HISTORY_CACHE_PATH=local/npc-dialogue-history.jsonl
NPC_LLM_DEBUG=1
```

也可用環境變數直接啟動：

```bash
cd server/npc-brain
GOOGLE_API_KEY=<your-google-ai-studio-api-key> \
NPC_LLM_PROVIDER_ORDER=gemini,gemini_flash,gemini_flash_lite,local_llama,history_cache,deterministic \
NPC_LLM_MODEL_GEMINI=gemini-2.5-pro \
NPC_LLM_MODEL_GEMINI_FLASH=gemini-2.5-flash \
NPC_LLM_MODEL_GEMINI_FLASH_LITE=gemini-2.5-flash-lite \
NPC_LLM_GEMINI_RETRY_COUNT=2 \
NPC_LLM_MODEL_LOCAL_LLAMA=qwen2.5:7b \
NPC_LLM_MODEL_DEEPSEEK_REASONER=deepseek-r1:7b \
NPC_LLM_LOCAL_LLAMA_API_URL=http://127.0.0.1:11434/api/chat \
NPC_LLM_LOCAL_LLAMA_TIMEOUT_MS=12000 \
NPC_LLM_LOCAL_LLAMA_MAX_OUTPUT_TOKENS=192 \
NPC_LLM_LOCAL_LLAMA_TEMPERATURE=0.45 \
NPC_LLM_LOCAL_LLAMA_TOP_P=0.85 \
NPC_LLM_LOCAL_LLAMA_REPEAT_PENALTY=1.12 \
NPC_LLM_LOCAL_LLAMA_NUM_CTX=4096 \
NPC_LLM_LOCAL_LLAMA_REPAIR_RETRY_COUNT=1 \
NPC_LLM_HISTORY_CACHE_PATH=local/npc-dialogue-history.jsonl \
NPC_LLM_DEBUG=1 \
$HOME/.venv/3klife-etl/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

確認 provider 狀態：

```bash
curl http://127.0.0.1:8765/healthz
```

若 `llmModelPreset=fallback_chain`，API 會依 `NPC_LLM_PROVIDER_ORDER` 自動 fallback。正式開發建議順序是：`gemini -> gemini_flash -> gemini_flash_lite -> local_llama -> history_cache -> deterministic`。`deterministic` 只是最後安全線；除非雲端 / 本地 LLM 與歷史 queue 都不可用，否則不應命中。

完整 fallback 流程：

1. `gemini`：預設 `gemini-2.5-pro`，使用 persona / selectedKeywords / resolvedEvidence / locale / speechContext 產生 JSON。
2. `gemini_flash`：Pro 高負載、timeout、quota、JSON parse、keyword focus 或 taboo 驗證失敗時，切到 Flash。
3. `gemini_flash_lite`：Flash 仍失敗時，切到 Flash Lite。
4. `local_llama`：雲端 LLM 不可用時，呼叫 Ollama `/api/chat`。本地模型使用 system + user messages、低溫參數、JSON contract、speaker / language / gibberish validator，並允許一次 repair retry。
5. `history_cache`：本地模型也不可用或驗證失敗時，從 `local/npc-dialogue-history.jsonl` 找相同 general / locale / speechContext / keyword / evidence 的既有 LLM 台詞。
6. `deterministic`：所有 LLM 與 history cache 都不可用時，才使用最後安全模板。

若 Cocos dev toolbar 選了特定模型 preset（例如 `Qwen 7B` 或 `DeepSeek R1`），該次請求會跳過正式 fallback chain，只測指定 provider/model；失敗時 API 會回 `503`，並在錯誤 detail 看到 provider-chain failure。這能避免把 deterministic template 誤判成真實 LLM 回應。

`deepseek_r1_7b` 會顯示 provider `deepseek_reasoner`。它仍可在 Cocos toolbar 中測輸出品質，但定位是推理測試模型：正式事件 / keyword ETL 請使用 `server/npc-brain/pipelines/sanguo-rag/run_deepseek_reasoning_trial.py` 產生 sidecar review report，不直接寫入 canonical artifacts。

`NPC_LLM_DEBUG=1` 時，server terminal 會額外列出：

- `dialogue.build.start`：收到的 `generalId / selectedKeywordKeys / maxChars`
- `dialogue.build.resolved`：實際採用的 `usedKeywords / evidenceRefs / resolvedEvidenceRefs`
- `provider.request`：送給 Gemini 或 `local_llama` 的 request 摘要與 prompt preview
- `provider.response.raw` / `provider.response.parsed`：模型回應摘要、used refs、keyword focus 與文字預覽

`local_llama` 會額外回報：

- `repairUsed`：本地模型第一輪輸出若出現冒名、混語、亂碼、格式錯誤等問題，server 會用同一份 persona / evidence / speechContext 進行一次 repair retry；成功時此欄位為 `true`。
- `qualityWarnings`：若 repair 成功，會保留第一輪觸發的品質警告，例如 `repaired:speaker-identity:wrong-self-name` 或 `repaired:language:unexpected-ascii`，方便 Cocos debug toolbar 觀察本地模型品質。

## Local Llama Fallback

`local_llama` 目前預設對接 Ollama 相容的 chat API。8GB VRAM 的本地測試預設建議使用 `qwen2.5:7b`，不要直接裸聊；server 會以 system + user messages、低溫參數、JSON contract、speaker / language / gibberish validator 與一次 repair retry 約束它：

```text
NPC_LLM_MODEL_LOCAL_LLAMA=qwen2.5:7b
NPC_LLM_LOCAL_LLAMA_API_URL=http://127.0.0.1:11434/api/chat
NPC_LLM_LOCAL_LLAMA_TIMEOUT_MS=12000
NPC_LLM_LOCAL_LLAMA_MAX_OUTPUT_TOKENS=192
NPC_LLM_LOCAL_LLAMA_TEMPERATURE=0.45
NPC_LLM_LOCAL_LLAMA_TOP_P=0.85
NPC_LLM_LOCAL_LLAMA_REPEAT_PENALTY=1.12
NPC_LLM_LOCAL_LLAMA_NUM_CTX=4096
NPC_LLM_LOCAL_LLAMA_REPAIR_RETRY_COUNT=1
```

若 `qwen2.5:7b` 在機器上延遲太高，可以只改：

```text
NPC_LLM_MODEL_LOCAL_LLAMA=qwen2.5:3b
```

`NPC_LLM_LOCAL_LLAMA_TEMPERATURE / TOP_P / REPEAT_PENALTY / NUM_CTX` 會原樣傳到 Ollama `/api/chat` 的 `options`；Cocos debug UI 會顯示 provider、repair 狀態、quality warnings 與 providerTrace。

當 `NPC_LLM_PROVIDER_ORDER=gemini,gemini_flash,gemini_flash_lite,local_llama,history_cache,deterministic` 時：

1. 先嘗試 Gemini Pro
2. Pro 高負載 / timeout / JSON 截斷不可修復時，切到 Gemini Flash
3. Flash 仍高負載時，切到 Gemini Flash Lite
4. 雲端 LLM 不可用時，切到 `local_llama`
5. `local_llama` 不可用時，從 `history_cache` 挑選先前 LLM 針對相同武將 / keyword / evidence 生成過的台詞
6. 以上都失敗，才落回 deterministic template

## Dialogue History Cache

每次 `gemini`、`gemini_flash`、`gemini_flash_lite` 或 `local_llama` 成功產生台詞後，service 會把下列資料 append 到 `NPC_LLM_HISTORY_CACHE_PATH`：

- `generalId`
- `contextKey`
- `locale`
- `speechContextMode`
- `keywordKeys` / `keywordLabels`
- `evidenceRefs` / `usedEvidenceRefs`
- `provider` / `model`
- `qualityWarnings` / `repairUsed`
- `text`

這個 cache 是本地開發用的 LLM output queue，不是手寫台詞表。未來可把同格式上傳到全球共存區或預先下載成玩家本地 fallback 包。

## Dev Server

若要重建完整 NPC brain 開發依賴：

```bash
$HOME/.venv/3klife-etl/bin/python -m pip install -r server/npc-brain/requirements.txt
```

再啟動：

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload
```

開發期 CORS 目前允許兩類 origin：Cocos Creator Preview（`http://localhost:7456`、`http://127.0.0.1:7456`）與 LangSmith Studio（`https://smith.langchain.com`）。正式環境仍不得使用萬用 `*`。

## LangGraph Studio

`server/npc-brain` 現在同時提供兩層入口：

- FastAPI runtime：給 Cocos 或 curl 直接打 `context-options / keyword-options / dialogue`
- LangGraph graph：給 LangSmith Studio 看 graph、手動餵 state、debug run

目前在 Studio 可用兩張 graph：

- `npc_brain_graph`：NPC 對話 smoke / provider 測試 / runtime fixture 驗證
- `sanguo_etl_graph`：ETL / repair-review / pilot / review queue 診斷與下一步命令建議

Unity 對照：FastAPI 比較像直接給遊戲端呼叫的 service facade；LangGraph Studio 比較像把同一套 runtime capability 包成可視化 graph inspector，方便你看節點輸入輸出與 run trace。

### 檔案位置

- `langgraph.json`：LangGraph server 設定
- `auth.py`：deployment / Studio 共用的 shared API-key auth
- `langgraph_app/graph.py`：最小 graph 定義
- `app/main.py`：既有 FastAPI app，會一起掛到 LangGraph dev server

### 一次性安裝

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/python -m pip install -r requirements.txt
$HOME/.venv/3klife-etl/bin/python -m pip install -U "langgraph-cli[inmem]"
```

### `.env` 必填項

至少要有：

```text
LANGSMITH_API_KEY=<your-langsmith-personal-access-token>
LANGSMITH_TRACING=true
LANGCHAIN_TRACING_V2=true
LANGSMITH_PROJECT=3KLife-npc-brain-local
LANGSMITH_DEPLOYMENT_NAME=3klife-npc-brain-external-test
NPC_BRAIN_DEPLOY_API_KEY=<shared-key-for-studio-and-external-testers>
NPC_BRAIN_DEPLOY_IDENTITY=npc-brain-external-tester
```

`LANGSMITH_API_KEY` 是你自己的 LangSmith / Deployments 權限，不要發給外部測試者。給測試者的是 `NPC_BRAIN_DEPLOY_API_KEY`，它會套用在 built-in assistants/runs 與 `app.main` 掛進來的 `/healthz`、`/v1/npc/*` routes。

若你把 `LANGSMITH_TRACING=false`，Studio 雖然還能連本機 graph，但常會跳出「像是抓不到 key / Not seeing LangSmith runs」的提示。那通常不是 key 缺失，而是 tracing 被你關掉了。若還要測真正的 Gemini 對話，再補 `GOOGLE_API_KEY` 與 `NPC_LLM_*` 系列設定。

### 啟動 LangGraph dev server

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/langgraph dev --no-browser
```

成功後你會看到類似：

```text
- API: http://127.0.0.1:2024
- Studio UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
```

### 在 Studio 連線

1. 開啟 `Studio UI` 那條網址。
2. `Base URL` 填 `http://127.0.0.1:2024`。
3. `Custom Header` 加上 `X-API-Key: <NPC_BRAIN_DEPLOY_API_KEY>`。
4. 按 `Connect`。

目前 `langgraph.json` 與 `app/main.py` 都已允許 `https://smith.langchain.com` 的 CORS，所以 Studio 可以直接從網頁打回本機 `127.0.0.1:2024`。若沒帶 `X-API-Key`，`assistants/search` 與 custom `/healthz`、`/v1/npc/*` 會回 `401`。

`/info` 這類 meta route 仍保持可讀，方便 Studio bootstrap 與基礎診斷；真正的 graph / assistant / custom API 執行面則由 shared API key 保護。

目前固定枚舉欄位 `generalId`、`locale`、`speechContextMode`、`llmModelPreset`、`keywordCategories` 已在 graph schema 宣告成 enum；Studio 重新整理後，通常會把這些欄位顯示成下拉或固定可選值。`customGeneralId` 是進階 override：若你想測不在熱門清單裡的武將，可直接填它，graph 會優先採用 `customGeneralId`。

### 這版最小 graph 在做什麼

graph ID 是 `npc_brain_graph`，流程固定是：

1. `load_context_options`
2. `load_keyword_options`
3. `prepare_studio_candidates`
4. `prepare_dialogue_request`
5. `generate_dialogue`

也就是先讀武將可用 context，再讀 keyword，最後把輸入整理成 `DialogueRequest` 去跑既有的 `NpcDialogueService.build_dialogue()`。

`prepare_studio_candidates` 是專門為 Studio 測試加的中介節點。它會把目前這位武將可用的：

- `contextCandidateKeys`
- `keywordCandidateKeys`
- `popularGeneralCandidates`
- `resolvedGeneralId`
- `recommendedContextKey`
- `recommendedKeywordKeys`
- `recommendedRequestPayload`

整理到 state 頂層，讓你不用自己背 `contextKey` 和 `keywordKey`。

### Studio 最小輸入範例

你在 Studio 測 `npc_brain_graph` 時，最少可以先丟：

```json
{
	"generalId": "zhang-fei"
}
```

這樣 graph 會自動：

- 從可用 context 裡挑第一個 `contextKey`
- 每個 keyword category 最多挑一個，最多湊三個 `selectedKeywordKeys`
- 用預設 `locale=zh-TW`
- 用預設 `speechContextMode=life_chat`
- 用預設 `llmModelPreset=fallback_chain`
- 用預設 `maxChars=90`

如果你只想先看候選，不急著自己填 key，可以先跑這個最小輸入，然後直接看 `prepare_studio_candidates` 節點輸出的 `recommendedRequestPayload`。

若你只想用熱門測試武將，不想手打 slug，直接從 `generalId` 下拉選即可。若要測清單外武將，再填 `customGeneralId` 覆蓋它。

如果你要更可控，可以改成：

```json
{
	"generalId": "zhang-fei",
	"contextKey": "changban-bridge",
	"selectedKeywordKeys": ["cao-cao", "serpent-spear"],
	"locale": "zh-TW",
	"speechContextMode": "life_chat",
	"llmModelPreset": "fallback_chain",
	"maxChars": 90
}
```

### Studio 完整 sample input

如果你要做一輪比較穩定、比較容易判讀的 Studio 測試，建議先用這組：

```json
{
	"generalId": "zhang-fei",
	"contextKey": "changban-bridge",
	"selectedKeywordKeys": ["cao-cao", "liu-bei", "serpent-spear"],
	"locale": "zh-TW",
	"speechContextMode": "life_chat",
	"llmModelPreset": "fallback_chain",
	"maxChars": 90,
	"contextLimit": 8,
	"keywordCategories": ["person", "item", "event"],
	"keywordLimitPerCategory": 8
}
```

用途說明：

- `generalId`：指定武將
- `contextKey`：直接固定測試情境，避免每次自動挑到不同 context
- `selectedKeywordKeys`：直接固定關鍵字，避免 graph 自動挑選時每類只拿第一個
- `llmModelPreset=fallback_chain`：先測正式 fallback 路線
- `contextLimit / keywordCategories / keywordLimitPerCategory`：讓前兩個節點輸出保持可讀，不會把整包 options 撐太大

目前 `keywordCategories` 可用固定值是：

- `person`
- `item`
- `event`
- `location`
- `creature`

### 第二張 graph：`sanguo_etl_graph`

這張 graph 不是直接跑對話，而是把 ETL 現有產物串成可視化診斷流程，目標是回答三件事：

1. 現在哪個 completion 維度最卡
2. 下一批最該補哪幾位武將
3. 下一輪 CLI 應該跑哪幾條命令最有槓桿

目前節點流程是：

1. `load_completion_summary`
2. `load_campaign_summary`
3. `load_etl_pilot_report`
4. `load_review_queue`
5. `assess_completion_bottlenecks`
6. `select_focus_generals`
7. `build_next_etl_plan`

這張 graph 只讀現有 artifact，不會直接改 canonical data。

最小輸入範例：

```json
{
	"focusStatus": "needs-etl-evidence",
	"topFocusGenerals": 3
}
```

如果你想指定某位武將：

```json
{
	"focusGeneralId": "lu-bu"
}
```

若你要測清單外武將，可改用：

```json
{
	"customFocusGeneralId": "sun-shang-xiang"
}
```

跑完後最值得看的輸出是：

- `bottlenecks`：依 `weight x gap` 排過的 completion 缺口
- `focusGenerals`：目前最該處理的武將名單
- `focusReviewQuestions`：review queue 裡最該先處理的題目
- `recommendedCommands`：可直接複製去跑的 CLI 建議
- `optimizationLoop`：把 ETL 收斂成固定 5 步循環

`recommendedCommands` 現在會優先建議：

- `run_etl_quality_pilot.py`
- `generate_event_review_choices.py`
- `enrich_event_review_context.py`
- `run_repair_review_campaign.py`
- `build_api_readiness_index.py`

也就是先量測、再把 candidates 轉成 review MCQ、補 context、推回 repair-review wave，最後重建 runtime fixtures。這是目前最接近「讓 ETL 自己收斂優化」的第一版 graph 化入口。

### LangGraph Deployments：正式外部測試版

這版 `server/npc-brain` 已經補上 deployment 最小硬化：

- `auth.py` 會要求 `X-API-Key` 或 `Authorization: Bearer <key>`
- `langgraph.json` 已啟用 `enable_custom_route_auth=true`，所以 `app.main` 掛進來的 `/healthz`、`/v1/npc/*` 會和 assistants/runs 一起受保護
- `http.logging_headers.excludes` 已排除 `x-api-key` 與 `authorization`，避免把 secret header 寫進 server logs

部署前提：

1. 本機有 Docker
2. `LANGSMITH_API_KEY` 具備 Deployments 權限
3. `.env` 已填 `NPC_BRAIN_DEPLOY_API_KEY`

部署命令：

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/langgraph deploy --name "$LANGSMITH_DEPLOYMENT_NAME"
```

若你不想先寫 `LANGSMITH_DEPLOYMENT_NAME`，也可以直接：

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/langgraph deploy --name 3klife-npc-brain-external-test
```

部署完成後，外部測試者只需要兩樣東西：

- deployment URL
- `NPC_BRAIN_DEPLOY_API_KEY`

不要把 `LANGSMITH_API_KEY` 發給測試者。

最小 smoke test：

```bash
curl -H "X-API-Key: <NPC_BRAIN_DEPLOY_API_KEY>" \
	"https://<deployment-url>/healthz"
```

```bash
curl -X POST \
	-H "Content-Type: application/json" \
	-H "X-API-Key: <NPC_BRAIN_DEPLOY_API_KEY>" \
	"https://<deployment-url>/assistants/search" \
	-d '{}'
```

目前這套 external-test auth 是 shared-key 模式：所有持有同一把 key 的測試者都視為同一個 identity，threads / runs 可見性也是共享的。若你下一步要做「每個外部測試者互相看不到彼此 thread / run」，就要再補 `@auth.on` 的 resource filter 或接 OAuth / Auth0 / Supabase Auth。

### 預期輸出怎麼看

`generate_dialogue` 節點現在除了完整 `dialogue` 物件，也會在 state 最上層補這幾個摘要欄位：

- `dialogueText`
- `dialogueProvider`
- `dialogueModel`
- `generationMode`
- `fallbackUsed`
- `providerTrace`

所以你在 Studio 裡，不用每次都展開完整 `dialogue`，看頂層就能先知道有沒有真的打到 LLM。

一個成功命中雲端 LLM 的輸出，大致會長這樣：

```json
{
	"dialogueText": "當年俺在長坂橋上，心中所想不僅是軍事統率之責，更是要護得大哥與其家眷周全。",
	"dialogueProvider": "gemini",
	"dialogueModel": "gemini-2.5-pro",
	"generationMode": "llm",
	"fallbackUsed": false,
	"providerTrace": ["gemini:ok"]
}
```

注意：

- `dialogueText` 不保證逐字固定，因為 LLM 可能有細微措辭差異
- 真正要驗的是 `provider / model / generationMode / fallbackUsed / providerTrace`
- 若看到 `generationMode=deterministic` 或 `fallbackUsed=true`，代表這次沒有成功用到目標 LLM，而是落回 fallback

完整 `dialogue` 內仍會保留：

- `text`
- `usedKeywords`
- `evidenceRefs`
- `usedEvidenceRefs`
- `qualityWarnings`
- `repairUsed`

如果你要做第一輪 smoke test，建議先把「成功條件」定成：

1. `dialogueProvider` 不是 `null`
2. `generationMode` 是 `llm`
3. `fallbackUsed` 是 `false`
4. `dialogueText` 不是空字串
5. `providerTrace` 至少有一個 `*:ok`

### 常見錯誤

#### `Failed to fetch`

這通常不是 graph 壞掉，而是 Studio 網頁打不到本機 server。優先檢查：

1. `langgraph dev` 是否真的還在跑。
2. `Base URL` 是否和 terminal 顯示的 port 一致。
3. 是否有舊的 `langgraph dev` 卡在同一個 port，導致你以為重啟了，其實 Studio 還在連舊程序。
4. 若 Console 出現 `blocked by CORS policy`，表示 server 沒有允許 `https://smith.langchain.com`；本 repo 目前已在 `langgraph.json` 與 `app/main.py` 補上這個 origin。

#### `Port 2024 is already in use`

代表舊版 LangGraph server 還活著。先關掉舊程序，再重啟一次 `langgraph dev`；或暫時改用：

```bash
$HOME/.venv/3klife-etl/bin/langgraph dev --no-browser --port 2025
```

然後把 Studio 的 `Base URL` 改成 `http://127.0.0.1:2025`。

#### 看得到 graph，但 dialogue 失敗

這通常是資料或 provider 問題，不是 Studio 問題。先檢查：

1. `generalId` 是否存在於 API readiness artifacts。
2. `.env` 的 Gemini / local llama 設定是否有效。
3. terminal 是否出現 `503` 或 provider-chain failure。

### 快速自我驗證

若要確認 Studio 來源的 CORS 有開，可以在另一個 terminal 打：

```bash
curl -i -X OPTIONS http://127.0.0.1:2024/info \
	-H 'Origin: https://smith.langchain.com' \
	-H 'Access-Control-Request-Method: GET'
```

看到 `access-control-allow-origin: https://smith.langchain.com` 就代表 Studio 端最常見的 CORS 問題已排除。

## Data Contract

Service 預設讀取：

- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/context-options.response.json`
- `artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/keyword-options.response.json`

更新資料時，先重跑 pipeline：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_api_readiness_index.py --general-id zhang-fei --overwrite
```

這層只讀產物，不修改 ETL 輸出。

## Cocos Dev Test Flow

開發中可先在武將列表最上方暫放一顆「對話測試」按鈕與一個「關鍵字下拉選單」。玩家點擊武將時，Cocos 端以該武將 `generalId` 呼叫：

```text
GET /v1/npc/keyword-options?generalId=zhang-fei&categories=person,item,event&limitPerCategory=8
```

下拉選項顯示 `label`，實際送出 `keywordKey`。玩家選完後按「對話測試」，再呼叫：

```text
POST /v1/npc/dialogue
```

body 至少包含：

```json
{
	"generalId": "zhang-fei",
	"contextKey": "changban-bridge",
	"selectedKeywordKeys": ["cao-cao", "serpent-spear"],
	"toneMode": "in-character",
	"locale": "zh-TW",
	"speechContextMode": "life_chat",
	"llmModelPreset": "fallback_chain",
	"maxChars": 90
}
```

這是研發測試入口，不是正式人物頁 layout。Cocos component 不直接散落 `fetch`，仍應集中透過 `NpcDialogueService` 包裝 API。