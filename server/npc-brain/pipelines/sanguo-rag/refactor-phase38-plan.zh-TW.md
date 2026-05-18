<!-- doc_id: doc_server_pipeline_0048 -->
# NPC-brain / Sanguo-RAG 第三十八階段功能計畫書：Governance Run Profile Presets

## Summary

第三十八階段把 governance regression harness 的執行模式整理成明確 run profile，讓人工、本機快速驗證、嚴格驗證與 CI 前置檢查可以使用同一套入口與 policy。

## Key Changes

- 新增 run profile preset policy，定義 `quick-local`、`strict-local` 等 profile。
- Harness 讀取 run profile policy，依 profile 決定要跑哪些 sensor、是否允許寫入、是否需要 fixture regression。
- Validator 檢查 profile id、sensor name、timeout、write mode 等基本 shape。

## Implementation Rules

- 不改任一 pipeline script 的資料結果。
- Profile 只控制 harness 執行範圍，不覆蓋 governance data 本身。
- 預設 profile 必須適合本機重跑，CI profile 另保留為 Phase 43 收斂入口。

## Test Plan

- `python -m py_compile`：harness、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 顯示 run profile count。
- `run_sanguo_governance_regression_harness.py --run-profile strict-local --no-write` 可跑。
- UTF-8 / BOM / U+FFFD guard 通過。

## Assumptions

- Phase 38 只建立執行 profile，不把所有 CI 行為一次塞進 harness。
- Phase 43 再新增正式 CI entrypoint。
