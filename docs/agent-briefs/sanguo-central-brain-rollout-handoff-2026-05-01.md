<!-- doc_id: doc_ai_0027 -->
# 三國中台大腦推行計畫交接書

## 摘要卡

- task: 三國中台大腦推行
- goal: 把 `Sanguo RAG / ETL + NPC Brain + LangGraph Studio` 從本機研發樣板推進成可部署、可測試、可持續收斂的正式中台能力。
- read:
  - `server/npc-brain/README.md`
  - `server/npc-brain/langgraph.json`
  - `server/npc-brain/auth.py`
  - `server/npc-brain/langgraph_app/graph.py`
  - `server/npc-brain/langgraph_app/etl_graph.py`
- known:
  - `repair-review-r2-wide` 已把 overall completion 從 `58.22%` 推到 `58.47%`，目前最高槓桿仍是 `review -> repair -> merge -> readiness`。
  - `npc_brain_graph` 與 `sanguo_etl_graph` 已完成建置，Studio / tracing / 熱門武將 preset / candidate preparation 都已補齊。
  - shared API-key auth 已完成；`server/npc-brain/.env` 已補齊 `LANGSMITH_DEPLOYMENT_NAME`、`NPC_BRAIN_DEPLOY_API_KEY`、`NPC_BRAIN_DEPLOY_IDENTITY`。
  - `langgraph dev --no-browser --port 2025` preflight 已通過，帶 `X-API-Key` 的 `/healthz`、`/assistants/search` 都回 `200`。
  - `sanguo_etl_graph` baseline 已補跑，摘要落在 `artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/sanguo-etl-graph-baseline-2026-05-01.json`。
  - 正式 `langgraph deploy` 已實際執行，但目前 blocker 是 `LangSmith Deployment is not enabled for this organization`，不是 graph import 或本機 auth 問題。
- need:
  - 啟用目前 `LANGSMITH_API_KEY` 所屬 LangSmith organization 的 Deployments，或改用已開通 Deployments 的 API key / organization。
  - 啟用後重跑 `langgraph deploy --name "$LANGSMITH_DEPLOYMENT_NAME"`，記錄 deployment URL。
  - deployment 成功後補跑一次遠端 `/healthz` 與 `/assistants/search` smoke。
  - 若短期不走付費 deployment，改走已驗證的 `langgraph dev --port 2025` + `localtunnel` 暫時對外方案。
- status:
  - Phase 0 已完成。
  - Phase 1 已開始，但目前被 LangSmith organization 權限卡住。
  - Phase 1 fallback 已驗證可用：本機 `langgraph dev` 經 `localtunnel` 對外，`/healthz` 與 `/assistants/search` 都可用 shared key 打通。
  - Phase 2 已有 baseline 與推薦命令，等待 Phase 1 打通後轉為固定節奏。
  - Phase 3、Phase 4 尚未開始，不應在本輪展開。
- avoid:
  - 不要把 `LANGSMITH_API_KEY` 發給外部測試者。
  - 不要把 deterministic fallback 誤判成 LLM 成功。
  - 不要在沒有 shared key 保護的情況下公開本機 `langgraph dev`。
  - 不要讓 `localtunnel` 或其他臨時 tunnel 長時間常駐。

## 當前基線

- 資料面：repair-review campaign 已證明能穩定提高 completion，但尚未變成固定營運節奏。
- 服務面：`app/main.py` 已提供 `healthz / context-options / keyword-options / dialogue`，可作為 Cocos 與 LangGraph 共用 facade。
- Graph 面：`npc_brain_graph` 負責 NPC 對話 smoke / provider 驗證，`sanguo_etl_graph` 負責 bottleneck、focus generals、recommended commands。
- 部署面：`auth.py`、`langgraph.json`、`.env.example`、`README.md` 與本機 `.env` 都已完成 shared-key 外部測試準備；正式 deployment 目前只卡在 LangSmith organization 尚未開通 Deployments。

## 2026-05-01 執行結果

- deployment readiness 已驗證：兩張 graph 可匯入，`langgraph dev` 可啟動，custom auth 生效。
- baseline 已補跑：`sanguo_etl_graph` 目前主 bottleneck 是 `eventQuestionCoverage`，focus generals 是 `lu-bu / zhou-yu / sun-quan`，review queue count 為 `4`。
- baseline 建議下一輪先跑 `run_etl_quality_pilot.py`，再生成 `lu-bu / zhou-yu / sun-quan` 的 review choices，最後接 `run_repair_review_campaign.py --round-id repair-review-r3-auto ...`。
- `langgraph deploy` 已到雲端權限檢查，錯誤訊息是 `LangSmith Deployment is not enabled for this organization`；表示目前要處理的是 LangSmith 組織層級開通，不是本機 Docker、graph code 或 shared-key auth。
- 2026-05-01 再次重跑 `langgraph deploy --name "$LANGSMITH_DEPLOYMENT_NAME"`，結果仍是同一個 Deployments 權限錯誤；blocker 尚未解除。
- 目前 `LANGSMITH_API_KEY` 已可成功打到 LangSmith `/sessions`，解析出的 `tenant_id` 是 `0ff12f6a-a6b1-43dc-8883-b1772bc74761`；後續開通作業應以這個 tenant / organization 為準。
- deployment rerun 過程雖顯示 `Docker is installed but not running`，但 CLI 已自動切到 remote build；本輪主 blocker 仍是 organization 未開通 Deployments，不是 Docker。
- 2026-05-01 改用新的 `lsv2_sk_...` service key 後，`/sessions` 與 `/api/v1/workspaces` 皆可讀，表示新 key 本身有效，且能存取目前 workspace。
- 同一把 service key 查到 `/api/v1/orgs/current` 回傳 `display_name=Personal`、`plan_tier=free`、`organization_id=c424f777-b58f-4613-a5c6-0d6e20bad636`；目前 blocker 已可收斂為「key 所在 org 是免費 Personal 組織，無法使用 Deployments」。
- 結論：單純輪替 key 不足以解鎖 deployment；必須改用已具備 Plus 以上方案的 organization / workspace，或替目前 org 升級到可用方案。
- 2026-05-01 已把 `.env` 切回原本 local PAT，並驗證 `/sessions` 仍回 `200`，本機 LangSmith tracing 路線恢復正常。
- 2026-05-01 已實測 `langgraph dev --no-browser --port 2025` + `npx --yes localtunnel --port 2025`；從 tunnel URL 帶 `X-API-Key` 呼叫 `/healthz` 與 `/assistants/search` 都回 `200`。
- 已新增 `server/npc-brain/run-temporary-external-test.sh`，可用 `bash ./run-temporary-external-test.sh` 啟動本機 dev server + localtunnel，作為付費 deployment 之外的暫時外部測試入口。

## Gate 狀態表

| Gate | 目的 | 狀態 | 證據 | 下一步 |
| --- | --- | --- | --- | --- |
| G0 / Graph Import | 兩張 graph 可被 LangGraph 載入 | 完成 | `langgraph dev --no-browser --port 2025` preflight 已通過 | 不必重跑，除非 graph code 有新改動 |
| G1 / Shared-Key Auth | deployment route 與 custom app route 都受 `X-API-Key` 保護 | 完成 | `/healthz`、`/assistants/search` 本機 smoke 回 `200` | 保持現況，等待雲端 deployment |
| G1b / Temporary Tunnel Fallback | 外部瀏覽器可短暫連入本機 dev server | 完成 | `localtunnel` URL 上的 `/healthz`、`/assistants/search` 帶 shared key 都回 `200` | 用 `server/npc-brain/run-temporary-external-test.sh` 啟動 |
| G2 / LangSmith Deployments | 目前 org 可建立正式 deployment | 阻塞 | 錯誤：`LangSmith Deployment is not enabled for this organization` / `403 Forbidden`；目前 key 對應 `organization_id=c424f777-b58f-4613-a5c6-0d6e20bad636`、`display_name=Personal`、`plan_tier=free`、`tenant_id=0ff12f6a-a6b1-43dc-8883-b1772bc74761` | 改用 Plus 以上方案的 org/key，或升級目前 organization |
| G3 / Remote Smoke | 外部 deployment 可連線且驗證通過 | 未開始 | 尚無 deployment URL | G2 解鎖後立刻執行 |
| G4 / ETL Operations Loop | ETL graph 成為固定營運導航台 | 準備完成 | baseline 與 recommended commands 已存在 | 以 `repair-review-r3-auto` 為下一輪入口 |

## 推行路線

### Phase 0：Deployment Readiness

- 補齊 `.env` 的 deployment 必填欄位。
- 跑 preflight，確認兩張 graph 都可匯入。
- 補跑一筆 `sanguo_etl_graph` baseline output。

完成定義：deployment 前 config 完整、graph 可跑、baseline 存在。

### Phase 1：正式外部測試

- 執行 `langgraph deploy`。
- 驗證 deployment URL 上的 `/healthz`、`/assistants/search`、`npc_brain_graph`、`sanguo_etl_graph`。
- 整理一份給外部測試者的最小 Studio 操作說明。

完成定義：不同電腦可連 deployment，且 traces 能看到正確 provider trace。

### Phase 1b：暫時外部測試 fallback

- 啟動本機 `langgraph dev --no-browser --port 2025`。
- 透過 `server/npc-brain/run-temporary-external-test.sh` 或 `npx --yes localtunnel --port 2025` 建立短期 public URL。
- 外部測試者以 `X-API-Key: <NPC_BRAIN_DEPLOY_API_KEY>` 驗證 `/healthz`、`/assistants/search`，必要時再用 Studio 連線 tunnel URL。

完成定義：外部測試者可在短時間內連上 tunnel URL，且 custom route 與 assistants API 皆可用。

### Phase 2：ETL 營運化

- 固定執行：`run_etl_quality_pilot.py`、`generate_event_review_choices.py`、`enrich_event_review_context.py`、`run_repair_review_campaign.py`、`build_api_readiness_index.py`。
- 每輪固定輸出：gap、focus generals、recommended commands、completion delta。

完成定義：`sanguo_etl_graph` 不只是 demo，而是下一輪工作的導航台。

### Phase 3：Runtime 整合

- 將熱門武將 preset、`llmModelPreset`、`providerTrace`、`fallbackUsed` 對齊到 Cocos debug UI。
- 讓測試者不必手背 `contextKey` / `keywordKey` 就能驗證對話。

完成定義：Cocos 端能一鍵測試，且 QA 能分辨真 LLM 與 fallback。

### Phase 4：多人協作升級

- 從 shared API key 升級到 per-user auth。
- 補 `@auth.on` resource filter，隔離不同測試者的 thread / run。
- 明確指定 ETL、runtime、deployment 三個 owner。

完成定義：外部測試可多人並行，且不共享資料視野。

## Phase 1 執行劇本

### Runbook A：先解鎖 deployment 權限

1. 確認 `LANGSMITH_API_KEY` 目前落在哪個 LangSmith organization。
2. 確認該 organization 是否已開通 Deployments。
3. 若未開通，二選一處理：
   - 直接替目前 organization 開通 Deployments。
   - 切換到已開通 Deployments 的 organization / API key，並同步更新本機 `.env`。
4. 目前已知這把 key 解析到的 `tenant_id` 是 `0ff12f6a-a6b1-43dc-8883-b1772bc74761`；若人員在 LangSmith 後台看不到對應 workspace，代表使用了不同 organization / API key。
5. 目前 service key 對應的 organization 是 `Personal`（`organization_id=c424f777-b58f-4613-a5c6-0d6e20bad636`，`plan_tier=free`）；若要繼續走 LangSmith Deployments，需改用公司共享、且具備 Plus 以上方案的 organization。

成功判準：下一次 `langgraph deploy` 不再停在 organization 權限錯誤。

### Runbook B：重跑正式 deployment

```bash
cd server/npc-brain
$HOME/.venv/3klife-etl/bin/langgraph deploy --name "$LANGSMITH_DEPLOYMENT_NAME"
```

預期結果：命令成功結束，並產出可供外部使用的 deployment URL。

### Runbook C：遠端 smoke

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

預期結果：兩個 endpoint 都回 `200`。若 `healthz` 正常但 `assistants/search` 失敗，優先視為 deployment graph 或 auth routing 問題，不要回頭懷疑 ETL baseline。

### Runbook D：最小對外交付

交給外部測試者的資訊只包含：

- deployment URL
- `NPC_BRAIN_DEPLOY_API_KEY`
- 一頁最小操作說明

明確禁止：

- 提供 `LANGSMITH_API_KEY`
- 公開本機 `langgraph dev`
- 把 shared-key 模式描述成正式多人隔離方案

### Runbook E：若 deployment 暫時不做，改走 localtunnel

```bash
cd server/npc-brain
bash ./run-temporary-external-test.sh
```

交付給外部測試者：

- localtunnel URL
- `NPC_BRAIN_DEPLOY_API_KEY`

關閉方式：

- 測完後在啟動 script 的 terminal 按 `Ctrl+C`

成功判準：

- `https://<tunnel-url>/healthz` 帶 shared key 回 `200`
- `https://<tunnel-url>/assistants/search` 帶 shared key 回 `200`

## 失敗分流

| 症狀 | 判讀 | 行動 |
| --- | --- | --- |
| `LangSmith Deployment is not enabled for this organization` | 組織權限未開通 | 停止重跑 deploy，改處理 `tenant_id=0ff12f6a-a6b1-43dc-8883-b1772bc74761` 對應的 organization / key |
| `Docker is installed but not running` 且隨後顯示 `Using remote build instead` | 本機 Docker 不可用，但不是當前硬 blocker | 不優先處理 Docker，先解決 Deployments 權限 |
| 新的 `lsv2_sk_...` key 可讀 `/sessions`，但 `langgraph deploy` 仍 403 | key 有效，但所在 organization 方案不足或不允許 Deployments | 不再繼續輪替同 org 的 key，改確認是否已切到付費 organization |
| `localtunnel` URL 打得開，但 API 回 401 | tunnel 正常，shared key 沒帶上 | 補 `X-API-Key: <NPC_BRAIN_DEPLOY_API_KEY>` 後再測 |
| `localtunnel` URL 無法連線 | tunnel 或本機 `langgraph dev` 已停止 | 先重跑 `bash ./run-temporary-external-test.sh` |
| `langgraph deploy` 改成 graph import / module error | Phase 0 被新改動打破 | 回頭檢查 `langgraph.json`、`langgraph_app.graph`、`langgraph_app.etl_graph` |
| 遠端 `/healthz` 401/403 | deployment 存活，但 auth header 錯誤或 key 不一致 | 先核對 `NPC_BRAIN_DEPLOY_API_KEY` 與 header 格式 |
| 遠端 `/assistants/search` 非 200，但 `/healthz` 正常 | graph routing、assistant registry 或 deployment packaging 問題 | 先查 deployment logs，不要回頭重跑 ETL campaign |
| 對話有字但 `fallbackUsed=true` | 命中 deterministic fallback，不是 LLM 成功 | 以 `dialogueProvider / dialogueModel / providerTrace` 重判 |

## 驗收條件

### Phase 1 驗收

- 有正式 deployment URL。
- 遠端 `/healthz` 與 `/assistants/search` 皆通過。
- 至少一筆 `npc_brain_graph` trace 能確認不是 fallback 假陽性。
- 對外測試資料只發 deployment URL 與 `NPC_BRAIN_DEPLOY_API_KEY`。

### Phase 1b 驗收

- 有可用的 localtunnel URL。
- tunnel URL 上的 `/healthz` 與 `/assistants/search` 皆通過。
- 外部測試者只拿到 tunnel URL 與 `NPC_BRAIN_DEPLOY_API_KEY`。
- 測完後 tunnel 已關閉，不長時間暴露本機 dev server。

### Phase 2 入口條件

- Phase 1 已通過。
- 已依 baseline 建議準備 `lu-bu / zhou-yu / sun-quan` 的下一輪 repair-review 材料。
- 下一輪 campaign 明確使用 `repair-review-r3-auto` 或後續同級 round id。

## 本輪不做

- 不做新 graph 功能開發。
- 不做 per-user auth。
- 不改 Cocos runtime UI。
- 不重構 ETL pipeline，只推進既有命令鏈進入固定節奏。
- 不把臨時 tunnel 當成正式上線方案。

## 下一次回報格式

下一位 Agent 回報時，至少要補這五點：

1. `LangSmith organization / API key` 是否已確認具備 Deployments 權限。
  - 目前這把 key 對應的 `tenant_id` 是 `0ff12f6a-a6b1-43dc-8883-b1772bc74761`。
  - 目前這把 key 對應的 organization 是 `Personal`，`plan_tier=free`。
2. `langgraph deploy` 是否成功，若失敗請附單一主因。
3. 是否取得 deployment URL。
4. 遠端 `/healthz` 與 `/assistants/search` 是否都回 `200`。
5. 若 Phase 1 未完成，下一步是處理權限、deployment packaging，還是遠端 auth。不要只寫「仍 blocked」。
6. 若改走 fallback，請回報 tunnel URL 是否已建立、是否已驗證 `/healthz` 與 `/assistants/search`，以及是否已關閉。

## 已決策與風險

### 已決策

- Studio 先靠 enum 與 top-level candidates 降低操作成本，不等待 dependent dropdown。
- 對話驗證要看 `dialogueProvider / dialogueModel / generationMode / fallbackUsed / providerTrace`，不能只看文字。
- 外部測試正式路線是 LangGraph Deployments，不是公開本機 `langgraph dev`。
- 在 Deployments 未開通前，允許用 `localtunnel` 做短時間、shared-key 保護的外部測試，但不把它視為正式 release 路線。
- shared API key 只是第一階段，不是最終權限模型。

### 主要風險

- 尚未完成正式 deployment，現在還不能宣稱外部測試可用。
- 目前 deploy blocker 在 LangSmith organization 權限；若換 API key 但仍指到未開通 organization，會重現同一錯誤。
- shared-key auth 代表外部測試者仍共享同一個 identity。
- 如果 ETL 只停在報表、不執行推薦命令，graph 會退化成展示物。
- `localtunnel` 是第三方公網通道，連線穩定度與 URL 存活性不可當正式 SLA。

## 下一位 Agent 起手式

先做這四件事，不要擴 scope：

1. 確認 `LANGSMITH_API_KEY` 目前對應的 LangSmith organization 是否已開通 Deployments；若未開通，先開通或切換到已開通的 org/key。
  - 已知目前 key 對應 `tenant_id=0ff12f6a-a6b1-43dc-8883-b1772bc74761`，可直接拿這個值去對照 LangSmith workspace。
  - 已知目前 org 是 `Personal / free`；若目標是正式 deployment，優先改接公司付費 org，不要再輪替同一個 Personal org 內的 key。
2. 重跑 `cd server/npc-brain && $HOME/.venv/3klife-etl/bin/langgraph deploy --name "$LANGSMITH_DEPLOYMENT_NAME"`。
3. deployment 成功後，立刻用 `X-API-Key: <NPC_BRAIN_DEPLOY_API_KEY>` 驗證遠端 `/healthz` 與 `/assistants/search`。
4. 若 deployment 仍被組織權限擋住，就不要再重跑本機 preflight；直接回報 LangSmith 組織開通狀態才是 blocker。
5. 若短期只需要外部測試，直接執行 `cd server/npc-brain && bash ./run-temporary-external-test.sh`，分享 tunnel URL 與 `NPC_BRAIN_DEPLOY_API_KEY`，測完立刻關閉。

建議下一會話 prompt：

```text
請以 docs/agent-briefs/sanguo-central-brain-rollout-handoff-2026-05-01.md 為唯一交接 brief。deployment readiness 與 sanguo_etl_graph baseline 已完成，下一步只處理 LangSmith Deployments 開通狀態、重跑 `langgraph deploy`，並在成功後補遠端 `/healthz` 與 `/assistants/search` smoke。不要擴到新功能開發。
```