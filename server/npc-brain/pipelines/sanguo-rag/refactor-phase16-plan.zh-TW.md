<!-- doc_id: doc_server_pipeline_0026 -->
# NPC-brain / Sanguo-RAG 第十六階段功能計畫書：Knowledge Growth Round Runner Governance 外部化

## Summary

第十六階段收斂 `run_knowledge_growth_round.py` 的 knowledge growth round runner 預設。此階段只外部化 round id、artifact path defaults、reviewer/model/API endpoint defaults、cohort/window/gate/timeout policy，不改 cohort 選擇演算法、不改 per-general generate/enrich subprocess 順序、不改 batch JSON/Markdown schema。

## Key Changes

- 新增 `policy-knowledge-growth-round-runner.json`，id 為 `Policy_KnowledgeGrowthRoundRunner_P1`。
- `run_knowledge_growth_round.py` 新增 `--governance-root` 與 `--knowledge-growth-round-policy`。
- 既有 CLI override 優先序維持：CLI 參數 > governance policy > code fallback。
- Governance validator 新增 path/cohort/reviewer/window/gate 檢查與 dry-run summary count。

## Implementation Rules

- Python 保留 cohort 選擇、subprocess orchestration、snapshot、preview gate、review clue rendering 與 output schema。
- Governance data 只提供 deterministic runner default，不調整 reviewer 策略或模型文案。
- 不跑完整 knowledge growth round，不觸發 reviewer / Ollama / agent-reviewer。

## Test Plan

- 建議後續手動驗收：`python -m py_compile` runner、loader、validator。
- 建議後續手動驗收：`validate_sanguo_governance.py --dry-run-report` 顯示 Phase 16 新 count。
- 建議後續手動驗收：HEAD parse defaults vs governance 注入後 defaults 等價。
- missing policy fail-fast 應包含 path 且無 Python traceback。
