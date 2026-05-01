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
- avoid:
  - 不要把 `LANGSMITH_API_KEY` 發給外部測試者。
  - 不要把 deterministic fallback 誤判成 LLM 成功。
  - 不要直接公開本機 `langgraph dev`。

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

## 已決策與風險

### 已決策

- Studio 先靠 enum 與 top-level candidates 降低操作成本，不等待 dependent dropdown。
- 對話驗證要看 `dialogueProvider / dialogueModel / generationMode / fallbackUsed / providerTrace`，不能只看文字。
- 外部測試正式路線是 LangGraph Deployments，不是公開本機 `langgraph dev`。
- shared API key 只是第一階段，不是最終權限模型。

### 主要風險

- 尚未完成正式 deployment，現在還不能宣稱外部測試可用。
- 目前 deploy blocker 在 LangSmith organization 權限；若換 API key 但仍指到未開通 organization，會重現同一錯誤。
- shared-key auth 代表外部測試者仍共享同一個 identity。
- 如果 ETL 只停在報表、不執行推薦命令，graph 會退化成展示物。

## 下一位 Agent 起手式

先做這四件事，不要擴 scope：

1. 確認 `LANGSMITH_API_KEY` 目前對應的 LangSmith organization 是否已開通 Deployments；若未開通，先開通或切換到已開通的 org/key。
2. 重跑 `cd server/npc-brain && $HOME/.venv/3klife-etl/bin/langgraph deploy --name "$LANGSMITH_DEPLOYMENT_NAME"`。
3. deployment 成功後，立刻用 `X-API-Key: <NPC_BRAIN_DEPLOY_API_KEY>` 驗證遠端 `/healthz` 與 `/assistants/search`。
4. 若 deployment 仍被組織權限擋住，就不要再重跑本機 preflight；直接回報 LangSmith 組織開通狀態才是 blocker。

建議下一會話 prompt：

```text
請以 docs/agent-briefs/sanguo-central-brain-rollout-handoff-2026-05-01.md 為唯一交接 brief。deployment readiness 與 sanguo_etl_graph baseline 已完成，下一步只處理 LangSmith Deployments 開通狀態、重跑 `langgraph deploy`，並在成功後補遠端 `/healthz` 與 `/assistants/search` smoke。不要擴到新功能開發。
```