<!-- doc_id: doc_server_pipeline_0047 -->
# NPC-brain / Sanguo-RAG 第三十七階段功能計畫書：Governance Completion Ledger

## Summary

第三十七階段建立 governance completion ledger，把 Phase 1 以來已完成的 policy/rule/catalog/schema 與對應 consumer 整理成可查表格。目的不是再拆 pipeline，而是讓後續維護者知道哪些治理項目已完成、哪些仍是刻意保留的 fallback。

## Key Changes

- 新增 completion ledger policy 或 report，記錄 phase、治理檔、consumer、驗收狀態與 commit slice。
- Validator dry-run summary 顯示 ledger row count，避免 ledger 漏登。
- Runbook 或 report bundle 可以引用 ledger，作為治理完成度的單一查詢入口。

## Implementation Rules

- Ledger 只記錄狀態，不改 pipeline 輸出。
- 已完成項目不可因整理 ledger 而重新命名或搬移。
- 若發現 phase 文件與實作不一致，先記錄 discrepancy，不在本階段大改歷史。

## Test Plan

- `python -m py_compile`：loader、validator、harness。
- `validate_sanguo_governance.py --dry-run-report` 顯示 completion ledger count。
- Harness report bundle 能包含 completion ledger 摘要。
- UTF-8 / BOM / U+FFFD guard 通過。

## Assumptions

- Phase 37 是治理可維護性的索引層，不是新的資料抽取階段。
- Ledger 後續可支援 Phase 45 residual hardcode freeze audit。
