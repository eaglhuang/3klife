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

開發期 CORS 只允許 Cocos Creator Preview：`http://localhost:7456` 與 `http://127.0.0.1:7456`。正式環境不得使用萬用 `*`。

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