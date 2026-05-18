<!-- doc_id: doc_server_pipeline_0044 -->
# NPC-brain / Sanguo-RAG 第四十四階段重構計畫：Governance Runbook / Consumer Index

## Summary

Phase 44 把 Sanguo governance 的操作方式整理成人讀得懂的 runbook。前面已經把規則、政策、snapshot、harness 都做出來；這一階段補上「出錯時怎麼辦」與「哪個 governance 檔被哪個 consumer 使用」。

## Key Changes

- 新增 `policy-governance-runbook.json`，描述 runbook 位置、必備章節與 consumer index 來源。
- 新增 `governance-runbook.zh-TW.md`，提供常用指令、consumer index、失敗排查 SOP 與 phase roadmap。
- Validator 檢查 runbook 必備章節，避免交接文件缺段落。
- Harness snapshot 納入 Phase 43/44 後的新 summary 與 phase matrix。

## Test Plan

- `validate_sanguo_governance.py --dry-run-report` 通過，summary 顯示 runbook section / consumer count。
- `run_sanguo_governance_regression_harness.py --run-profile strict-local --no-write` 通過 snapshot 檢查。
- runbook 與 plan 文件標題不得包含連續問號 mojibake、BOM、U+FFFD。

## Assumptions

- Phase 44 只做治理操作手冊與索引，不重構任何 extractor、runner 或 runtime service。
- Consumer index 以 `expected_governance_files()` 為單一來源，避免文件手抄後漂移。
