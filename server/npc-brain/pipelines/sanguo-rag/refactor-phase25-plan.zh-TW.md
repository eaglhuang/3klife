<!-- doc_id: doc_server_pipeline_0035 -->
# NPC-brain / Sanguo-RAG 第二十五階段重構計畫：Runtime Batch / Keyword Governance

## Summary

Phase 25 收斂 runtime profile batch、keyword option 與 API readiness deterministic defaults。此階段只外部化 default general id、keyword category limits、known item/creature keyword maps 與 API persona namespace，不改 keyword pack、batch report 或 readiness artifact schema。

## Key Changes

- 新增 `Policy_RuntimeBatchKeywordReadiness_P1`。
- `build_keyword_options.py` 從 governance 注入 UI label 長度、category limit、item/creature keyword map。
- `build_api_readiness_index.py` 從 governance 注入 default general id 與 persona namespace。
- `export_runtime_profiles_batch.py` 接上同一份 governance policy 做 future-proof fail-fast wiring；batch path defaults 仍由既有 CLI 控制。

## Test Plan

- `py_compile` 目標腳本、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 必須顯示 runtime keyword/API readiness count。
- 不帶新 governance CLI 時維持既有預設結果；指定 missing policy 時需 fail-fast 且錯誤包含 path。
