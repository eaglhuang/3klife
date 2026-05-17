<!-- doc_id: doc_server_pipeline_0034 -->
# NPC-brain / Sanguo-RAG 第二十四階段重構計畫：Source Browser / Vector Readiness Governance

## Summary

Phase 24 收斂 source crawler、two-layer browser gate 與 vector ingestion readiness 的 deterministic policy。此階段只搬移既有 class sample size、pass/fail status、403 fallback rule 與 vector readiness 描述，不改 crawler/browser/vector gate 的 legacy output schema。

## Key Changes

- 新增 `Policy_SourceBrowserVectorReadiness_P1`。
- `universal_source_crawler.py` 從 governance 注入 crawlable source classes 與 class sample size。
- `run_two_layer_browser_gate.py` 從 governance 注入 pass/fail status 與 built-in 403 fallback rule。
- `run_vector_ingestion_gate.py` 讀取同一份 readiness policy 做 fail-fast governance wiring，但 path/env defaults 仍由既有 CLI 控制。

## Test Plan

- `py_compile` 目標腳本、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 必須顯示 source browser/vector count。
- 不帶新 governance CLI 時維持既有預設結果；指定 missing policy 時需 fail-fast 且錯誤包含 path。
