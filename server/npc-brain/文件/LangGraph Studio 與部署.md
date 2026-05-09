<!-- doc_id: doc_server_service_0005 -->
# LangGraph Studio 與部署

> 說明 `npc_brain_graph`、ETL 相關 graphs、Studio 連線、本機 dev server、localtunnel 與正式 deployment 的操作重點。

## 這份文件適合什麼時候看

- 你要把 graph 接上 LangSmith Studio
- 你要做一次短期的外部測試（localtunnel）
- 你要把目前的本機 graph 部署成正式對外入口
- 你要分辨「是 graph 問題」還是「是 runtime 對話問題」

## 兩種入口

- **FastAPI runtime**：給 Cocos / curl 打 `context-options / keyword-options / dialogue`
- **LangGraph graphs**：給 LangSmith Studio 看節點、餵 state、追 run trace

## 重要檔案

- `langgraph.json`
- `auth.py`
- `langgraph_app/graph.py`
- `app/main.py`

## 一次性安裝

以下範例假設已在目標 venv 內執行；若還沒，先 `source` 對應的 `bin/activate`，或設定 `PYTHON_BIN` 指向該環境。

```bash
cd server/npc-brain
python -m pip install -r requirements.txt
python -m pip install -U "langgraph-cli[inmem]"
```

## `.env` 最小必填

```text
LANGSMITH_API_KEY=<token>
LANGSMITH_TRACING=true
LANGCHAIN_TRACING_V2=true
LANGSMITH_PROJECT=3KLife-npc-brain-local
LANGSMITH_DEPLOYMENT_NAME=3klife-npc-brain-external-test
NPC_BRAIN_DEPLOY_API_KEY=<shared-key>
NPC_BRAIN_DEPLOY_IDENTITY=npc-brain-external-tester
```

若要同時測 Gemini 或向量層，再補：

- `GOOGLE_API_KEY`
- `NPC_LLM_*`
- `PINECONE_*` / `NPC_QDRANT_*`

## 啟動 LangGraph dev server

```bash
cd server/npc-brain
langgraph dev --no-browser
```

成功後會看到：

- API：`http://127.0.0.1:2024`
- Studio UI：對應的 `smith.langchain.com/studio/?baseUrl=...`

## 在 Studio 連線

1. 開啟 Studio UI
2. `Base URL` 填 `http://127.0.0.1:2024`
3. 加 `X-API-Key: <NPC_BRAIN_DEPLOY_API_KEY>`
4. 按 `Connect`

## 目前可用 graphs

| graph | 用途 |
|---|---|
| `npc_brain_graph` | NPC 對話 smoke / provider 測試 |
| `sanguo_etl_graph` | ETL / repair-review / pilot / queue 診斷 |
| `sanguo_etl_repair_graph` | repair-review 流程與 readiness refresh |
| `progress_advancement_graph` | 進度推進與診斷 |

## 最常用的兩個 graph

### `npc_brain_graph`

最小輸入：

```json
{
  "generalId": "zhang-fei"
}
```

它會自動組出：

- `recommendedContextKey`
- `recommendedKeywordKeys`
- `recommendedRequestPayload`

### `sanguo_etl_graph`

最小輸入：

```json
{
  "focusStatus": "needs-etl-evidence",
  "topFocusGenerals": 3
}
```

用途是回答：

- 哪個 completion 維度最卡
- 下一批最該補哪幾位武將
- 下一輪 CLI 該跑哪些命令

## 外部短期測試：localtunnel

```bash
cd server/npc-brain
bash ./run-temporary-external-test.sh
```

交給外部測試者的只需要：

- tunnel URL
- `NPC_BRAIN_DEPLOY_API_KEY`

不要提供：

- `LANGSMITH_API_KEY`
- `.env` 原文

## 正式外部測試：LangGraph Deployments

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/langgraph deploy --name "$LANGSMITH_DEPLOYMENT_NAME"
```

目前已補上的最小硬化：

- `auth.py` 會驗證 `X-API-Key` / `Authorization`
- `enable_custom_route_auth=true`
- log header 會排除 `x-api-key` / `authorization`

## 常見錯誤

### `Failed to fetch`

優先檢查：

- `langgraph dev` 是否還活著
- `Base URL` / port 是否一致
- Studio 有沒有帶 `X-API-Key`
- 是否是 CORS 問題

### `Port 2024 is already in use`

改 port：

```bash
$HOME/.venv/3klife-etl/bin/langgraph dev --no-browser --port 2025
```

### 看得到 graph，但 dialogue 失敗

通常是資料或 provider 問題，先看：

- `.env` 的 LLM / vector 設定
- terminal 的 provider-chain failure
- `healthz`

## 快速自我驗證

```bash
curl -i -X OPTIONS http://127.0.0.1:2024/info \
  -H 'Origin: https://smith.langchain.com' \
  -H 'Access-Control-Request-Method: GET'
```

如果看到 `access-control-allow-origin: https://smith.langchain.com`，代表最常見的 Studio CORS 問題已排除。

## 相關文件

- [README.md](../README.md)
- [開發啟動與煙霧測試](./開發啟動與煙霧測試.md)
- [對話服務與模型回退](./對話服務與模型回退.md)
- [向量檢索與資料入庫](./向量檢索與資料入庫.md)
