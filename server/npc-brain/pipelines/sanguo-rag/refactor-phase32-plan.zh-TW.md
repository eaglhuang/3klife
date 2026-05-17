<!-- doc_id: doc_server_pipeline_0042 -->
# NPC-brain / Sanguo-RAG 第三十二階段重構計畫：Governance Handoff Index

## Summary

第三十二階段把 governance regression harness 從「只列檔案」推進到「可交接索引」。本階段不改任一 pipeline 行為，只讓 `run_sanguo_governance_regression_harness.py` 產出依 section 與 consumer 分組的 handoff index，讓下一位 Agent 能立刻知道每個 policy/rule/catalog/schema 被誰消費。

## Key Changes

- 由 `expected_governance_files()` 產生 handoff index。
- 報告新增 section coverage 與 consumer coverage。
- 不新增 runtime output，不改既有 pipeline CLI。

## Test Plan

- `py_compile` harness / loader / validator。
- `validate_sanguo_governance.py --dry-run-report` 通過。
- `run_sanguo_governance_regression_harness.py --no-write --strict-validation-coverage --strict-fixtures --strict-release-readiness` 通過。
- `git diff --check` 與 touched UTF-8 guard 通過。

## Assumptions

- Handoff index 是治理報告，不是資料管線輸入。
- 任何 consumer 分組錯誤先修 expected file registry，不改 runtime pipeline。
