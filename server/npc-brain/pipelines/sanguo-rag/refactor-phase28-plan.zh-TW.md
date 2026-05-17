<!-- doc_id: doc_server_pipeline_0038 -->
# NPC-brain / Sanguo-RAG 第二十八階段重構計畫：PostgreSQL State Store Evaluation

## Summary

Phase 28 是條件式中後期里程碑，只做 state store readiness 評估，不導入 PostgreSQL、不新增 DB dependency、不改 JSONL/manifest 既有行為。目標是把「什麼時候需要 PostgreSQL」變成可重跑的治理判斷，而不是靠主觀感覺。

## Key Changes

- 新增 `Policy_PostgresStateStoreEvaluation_P1`。
- 新增 `evaluate_postgres_state_store_readiness.py`。
- Validator 檢查 thresholds、state domains、allowed recommendations 與 migration guards。

## Test Plan

- `py_compile` evaluator、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 顯示 Phase 28 count。
- evaluator 預設只輸出 recommendation，不寫 DB、不連線外部服務。
