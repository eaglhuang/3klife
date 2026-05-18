<!-- doc_id: doc_server_pipeline_0049 -->
# NPC-brain / Sanguo-RAG 第三十九階段功能計畫書：Governance Report Bundle Manifest

## Summary

第三十九階段把 governance regression harness 的輸出報告收斂成 report bundle manifest，讓 summary、sensor 結果、phase matrix、operator summary 與 drift 檢查有固定封裝。

## Key Changes

- 新增 report bundle manifest policy，定義應輸出的 sections、必要欄位與人讀摘要。
- Harness 依 manifest 組出穩定 report bundle。
- Validator 檢查 manifest id、section key、required field 與 summary label。

## Implementation Rules

- Report bundle 只整理 harness 輸出，不改 pipeline artifacts。
- Manifest 的欄位順序與 key 盡量 deterministic，方便後續 Phase 42 做 golden snapshot diff。
- 不把本機 absolute path 寫進 deterministic payload；需要 path 時要可被 normalization 忽略。

## Test Plan

- `python -m py_compile`：harness、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 顯示 report bundle section count。
- Harness strict-local / no-write 可跑並輸出 report bundle summary。
- UTF-8 / BOM / U+FFFD guard 通過。

## Assumptions

- Phase 39 是 Phase 42 golden snapshot 的前置封裝層。
- 此階段不新增 pipeline smoke fixture，也不改舊輸出 schema。
