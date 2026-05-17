<!-- doc_id: doc_server_pipeline_0031 -->
# NPC-brain / Sanguo-RAG 第二十一階段重構計畫：Relationship Extraction Governance 外部化

## Summary

第二十一階段承接 Phase 20 的 scoreboard governance 收斂，處理下一個最需要治理的關係抽取主線。本階段只把 `relationship_type_refinement.py` 與 `extract_relationship_evidence.py` 裡的 deterministic relationship cue、type family、single-character alias allowlist 搬到 governance rules，不改輸出 schema、不改抽取演算法、不導入 PostgreSQL。

## Key Changes

- 新增 `rule-relationship-type-refinement.jsonl`，承接 relationship type family、stable/coarse/kinship type set、refinement cue terms 與顯示 label。
- 新增 `rule-relationship-evidence-extraction-cues.jsonl`，承接 confront/command/protect/ally/false-positive cue 與 single-character alias allowlist。
- 新增 loader API：`load_relationship_type_refinement_rules(...)` 與 `load_relationship_evidence_extraction_rules(...)`。
- `extract_relationship_evidence.py` 新增 `--governance-root`、`--relationship-evidence-cue-rules`、`--relationship-type-refinement-rules`，舊 CLI 不帶新參數時仍走預設 governance data。
- Governance validator 新增 expected files、shape 檢查與 dry-run summary count。

## Implementation Rules

- Python 保留 evidence row grouping、edge generation、direction 判斷與 Markdown/JSONL 輸出。
- Governance data 只提供 deterministic cue / type policy；資料值原樣從 Phase 21 baseline 搬移，不順手修正 cue 內容。
- `relationship_type_refinement.py` 支援 lazy load，避免舊 caller 未傳 governance 參數時行為中斷。
- `extract_relationship_evidence.py` 在 main 階段將 governance error 轉成單行 fail-fast。

## Test Plan

- `python -m py_compile`：兩支目標腳本、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 通過並顯示 Phase 21 count。
- 最小 fixture baseline/after 比對 relationship evidence JSONL/summary/Markdown；忽略時間戳與 output root path。
- `git diff --check` 與 touched UTF-8 / BOM / U+FFFD guard。

## Assumptions

- 本階段只處理 relationship extraction/refinement deterministic governance。
- Overlay confidence、external evidence scoring 與 alias intake 分別留在 Phase 22-23。
- PostgreSQL / state store 仍延後到 convergence state 或 run history 成為明確瓶頸後再規劃。
