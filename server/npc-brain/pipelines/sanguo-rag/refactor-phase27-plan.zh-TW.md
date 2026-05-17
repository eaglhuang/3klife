<!-- doc_id: doc_server_pipeline_0037 -->
# NPC-brain / Sanguo-RAG 第二十七階段重構計畫：Governance Regression Harness

## Summary

Phase 27 將前面各階段靠 Agent 手動執行的 governance smoke 收斂為可重跑 harness。此階段新增 regression harness policy 與 `run_sanguo_governance_regression_harness.py`，產出 expected file coverage、minimum shape summary 與 phase completion matrix。

## Key Changes

- 新增 `policy-governance-regression-harness.json`。
- 新增 `run_sanguo_governance_regression_harness.py`。
- Harness 會重用 `validate_expected_files` 與 `validate_minimum_shapes`，並輸出 JSON/Markdown report。
- `--strict-phase-plans` 可把缺少 phase plan 視為失敗；預設只報告不阻擋。

## Test Plan

- `py_compile` harness、loader、validator。
- Harness `--no-write` 可在不產物污染的情況下輸出 payload。
- Validator summary 顯示 Phase 27 count。
