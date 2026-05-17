<!-- doc_id: doc_server_pipeline_0028 -->
# NPC-brain / Sanguo-RAG 第十八階段功能計畫書：DeepSeek Reasoning Trial Governance 外部化

## Summary

第十八階段收斂 `run_deepseek_reasoning_trial.py` 的 sidecar runner policy。此階段只外部化路徑、預設 general id、prompt slice limit 與 Ollama/DeepSeek sampling defaults，不改 prompt contract、不改 JSON/Markdown output schema、不改 canonical write 行為。

## Key Changes

- 新增 `Policy_DeepSeekReasoningTrial_P1`，管理 `events/genericCandidates/keywordRoot/outputRoot`、`defaultGeneralId`、prompt limits 與 reasoning defaults。
- `apiUrl` 與 `model` 在 governance 中保留 nullable，維持既有 `NPC_LLM_DEEPSEEK_API_URL` / `NPC_LLM_MODEL_DEEPSEEK_REASONER` 環境變數 fallback。
- `run_deepseek_reasoning_trial.py` 新增 `--governance-root` 與 `--deepseek-reasoning-policy`。
- validator 新增 policy shape 檢查與 dry-run summary count。

## Implementation Rules

- Python 保留 prompt bundle、sanitize report、Markdown render、Ollama request 與 output schema。
- CLI override 優先序固定為：CLI > governance data > code fallback / env resolver。
- `--prompt-only` 行為不變，不呼叫 Ollama。

## Test Plan

- `python -m py_compile`：runner、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 顯示 `deepseekReasoningPathDefaultCount`、`deepseekReasoningPromptLimitCount`、`deepseekReasoningSamplingParamCount`。
- missing policy path fail-fast 且錯誤包含實際 path。
- touched `.py/.json/.md` UTF-8 / BOM / U+FFFD 檢查。

## Assumptions

- 本階段不呼叫本機 Ollama、不測 live LLM，只治理 deterministic runner policy。
- 大型 full-roster convergence 仍延後，避免把巨型 orchestrator 與小型 sidecar policy 混在同一 commit。
- PostgreSQL/state store 仍延後到 run history 或 resolution state 成為明確瓶頸後再規劃。
