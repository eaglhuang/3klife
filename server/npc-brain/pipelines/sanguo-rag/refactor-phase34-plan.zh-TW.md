<!-- doc_id: doc_server_pipeline_0044 -->
# NPC-brain / Sanguo-RAG 第三十四階段重構計畫：Governance Drift Detection

## Summary

第三十四階段補上 governance drift detection。大白話說：前面 harness 會告訴我們「現在有沒有過」，但還不會提醒「治理規模是不是突然少了、交接覆蓋是不是縮水了」。本階段新增一份 drift policy，讓 harness 可以用固定基準檢查 expected file count、phase plan count、handoff coverage 與 release failure 是否漂移。

## Key Changes

- 新增 `Policy_GovernanceDriftDetection_P1`。
- Harness 新增 drift report 與 `--strict-drift`。
- 不改任何 Sanguo-RAG pipeline 輸入輸出。

## Test Plan

- `py_compile` harness / loader / validator。
- `validate_sanguo_governance.py --dry-run-report` 通過。
- Strict harness 加上 `--strict-drift` 後仍為 `status=ok`。
- UTF-8 / BOM / U+FFFD guard 通過。

## Assumptions

- Drift baseline 是治理層基準，不代表資料品質分數。
- 若未來新增 governance file 或 phase，需要同步調整 drift baseline。
