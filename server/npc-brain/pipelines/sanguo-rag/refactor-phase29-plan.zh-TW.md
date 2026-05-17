<!-- doc_id: doc_server_pipeline_0039 -->
# NPC-brain / Sanguo-RAG 第二十九階段重構計畫：Production Vector Ingestion Hardening

## Summary

Phase 29 是條件式中後期里程碑，只補 vector ingestion 的 production hardening governance：provider allowlist、upsert retry/dedupe/resume/probe policy。此階段不改 vector record schema、不改實際 upsert/query 演算法、不新增外部服務依賴。

## Key Changes

- 新增 `Policy_VectorIngestionHardening_P1`。
- `run_vector_ingestion_gate.py` 新增 `--vector-ingestion-hardening-policy` 並 fail-fast 載入。
- Validator 檢查 provider allowlist、retry/backoff、resume required keys、probe policy。
- regression harness phase matrix 納入 Phase 28/29。

## Test Plan

- `py_compile` vector gate、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 顯示 Phase 29 count。
- Missing hardening policy override 應 fail-fast 且不印 Python traceback。
