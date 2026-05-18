<!-- doc_id: doc_server_pipeline_0018 -->
# NPC-brain / Sanguo-RAG 第八階段功能計畫書：Review Context 與 External Source Governance 外部化

## Summary

第八階段收斂 Phase 7 後剩下的高價值 P1 缺口：`benchmark_external_source.py` 與 `enrich_event_review_context.py`。本階段只把 deterministic cue / policy 從 Python 搬到 governance data，不改 legacy CLI 行為、不改 JSON/JSONL/Markdown 輸出 schema、不導入 PostgreSQL。

這一階段分成兩個 commit slice：先做 External Source Benchmark Governance，再做 Event Review Context Governance。兩片都以重構前後輸出等價為核心驗收。

## Key Changes

- 新增 `Policy_ExternalSourceBenchmark_P1` 與 `Rule_ExternalSourceBenchmarkCues_P1`，管理 source class、precheck、stage gate 與 term-hit cue。
- 新增 `Policy_EventReviewContext_P1` 與 `Rule_EventReviewContextCues_P1`，管理 review context cue、allowed answer、alias、battle denoise 與 canonical write guard。
- `benchmark_external_source.py` 新增 governance root 與 policy/rule override CLI，但保留 source config override 優先序。
- `enrich_event_review_context.py` 新增 governance root 與 policy/rule override CLI，`--prompt-only` 行為維持不變。
- Governance validator 新增 Phase 8 expected files、summary count 與基本 shape 檢查。

## Implementation Rules

- Python 保留 source config 讀取、review adapter、prompt building、answer sanitization、Markdown rendering 與 JSONL mirror。
- Governance data 只管理 deterministic cue/policy；不調整 benchmark gate 門檻、不修正文案、不改 reviewer 判斷策略。
- `export_general_runtime_profile.py` 延到 Phase 9，避免把 runtime profile 呈現層與 review/benchmark pipeline 混在同一個 commit。
- PostgreSQL/state store 仍延後，只有 state 或 run history 成為明確瓶頸時才啟動。

## Test Plan

- `python -m py_compile`：兩支目標腳本、governance loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 通過並顯示 Phase 8 新 count。
- 建立 `local/codex-smoke/phase8-*` fixture，比對重構前後 JSON、JSONL、Markdown，忽略 `generatedAt` 與 output root path。
- 指定不存在的 policy/rule path 必須 fail-fast，錯誤包含實際 path，且不印 Python traceback。
- `git diff --check` 與 touched file UTF-8 / BOM / U+FFFD guard 通過。

## Assumptions

- 第八階段只做治理外部化，不調整 benchmark gate、review 策略或輸出 schema。
- 大型 cue table 使用 JSONL；小型 policy/mapping 使用 JSON。
- Phase 9 再處理 runtime profile export governance。
