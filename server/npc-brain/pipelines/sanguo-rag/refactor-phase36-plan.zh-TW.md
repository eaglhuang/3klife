<!-- doc_id: doc_server_pipeline_0046 -->
# NPC-brain / Sanguo-RAG 第三十六階段功能計畫書：Governance Failure Triage

## Summary

第三十六階段把 governance validator 與 regression harness 的失敗原因整理成固定分類，避免每次失敗都只能靠 Agent 人工讀 log。這一階段不改 pipeline 行為，只讓失敗訊息更可治理、更好交接。

## Key Changes

- 新增 failure triage governance policy，定義常見失敗類型、嚴重度與建議修復方向。
- Regression harness 輸出 structured triage summary，讓 validator、fixture、encoding、schema drift 等失敗可以被分類。
- 保留既有 validator 與 harness exit code 行為，不把警告改成通過，也不把通過改成失敗。

## Implementation Rules

- Python 端只整理失敗分類與報告，不修 pipeline 資料內容。
- Policy 只描述分類與建議，不覆蓋 validator 的實際判斷。
- 所有新增分類都必須可由 dry-run report 讀到，方便下一個 Agent 追查。

## Test Plan

- `python -m py_compile`：harness、validator、loader。
- `validate_sanguo_governance.py --dry-run-report` 通過。
- Harness strict-local / quick profile 可跑，且 report 中包含 triage summary。
- UTF-8 / BOM / U+FFFD guard 通過。

## Assumptions

- Phase 36 只提升 failure observability，不改 governance policy 的實質數值。
- 若發現真正資料錯誤，應另開後續 phase 修正，不在本階段順手改值。
