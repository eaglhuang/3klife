<!-- doc_id: doc_server_pipeline_0050 -->
# NPC-brain / Sanguo-RAG 第四十階段功能計畫書：Governance Plan Encoding Repair

## Summary

第四十階段是 Phase 40-47 收斂尾段的第一步：先修復 governance phase plan 文件中已出現的 mojibake 與連續問號標題，並把「phase plan 文件必須可讀」納入 governance validator。這一步不改 pipeline 行為，也不新增資料抽取邏輯，只把交接文件修回可維護狀態。

## Key Changes

- 修復 Phase 8、Phase 36、Phase 37、Phase 38、Phase 39 plan 文件的中文標題與內容。
- 新增 `Policy_GovernancePlanEncodingRepair_P1`，列出需要持續檢查的 phase plan 文件與禁止片段。
- Governance validator 新增 plan encoding 檢查：檔案存在、UTF-8 可讀、無 BOM、無 U+FFFD、標題不可含連續問號 mojibake。
- Regression harness 的 phase matrix 納入 Phase 40，讓後續 run profile 能看到本階段已完成。

## Implementation Rules

- 只修文件可讀性與 validator 防線，不改 Sanguo-RAG pipeline runtime 行為。
- 不重建 doc-id registry，不動 unrelated docs/tools_node dirty files。
- 文件內容以 Phase plan 的已知邊界重寫，不順手新增未完成承諾。

## Test Plan

- `python -m py_compile`：governance loader、validator、regression harness。
- `validate_sanguo_governance.py --dry-run-report` 通過，summary 顯示 `governancePlanEncodingTargetCount`。
- `run_sanguo_governance_regression_harness.py --run-profile strict-local --no-write` 通過。
- Phase plan 標題檢查：目標文件不可含連續問號 mojibake、U+FFFD 或 BOM。
- `git diff --check` 與 touched file UTF-8 / BOM / U+FFFD guard 通過。

## Assumptions

- Phase 40 只處理 governance 文件品質與防線，不處理 schema registry；Phase 41 再做 schema registry。
- Phase 46-47 仍是條件式中後期計畫，不在本階段啟動 PostgreSQL 或 vector production rollout。
