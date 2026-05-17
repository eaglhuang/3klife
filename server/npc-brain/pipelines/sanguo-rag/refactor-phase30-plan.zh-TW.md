<!-- doc_id: doc_server_pipeline_0040 -->
# NPC-brain / Sanguo-RAG 第三十階段重構計畫：Governance Validation Stabilization

## Summary

Phase 30 目標是把 Phase 1-29 累積的 governance 驗證穩定下來。此階段新增 validation stabilization policy，讓 regression harness 明確知道哪些 minimum-shape summary key 必須出現，避免後續新增 policy 後只靠人腦記得補驗證。

## Key Changes

- 新增 `Policy_GovernanceValidationStabilization_P1`。
- Regression harness 會產生 `validationCoverage` 區塊。
- 若 `--strict-validation-coverage` 開啟，缺少必要 summary key 會 fail。

## Test Plan

- `py_compile` harness、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 顯示 Phase 30 count。
- `run_sanguo_governance_regression_harness.py --no-write --strict-validation-coverage` 可檢查 coverage。
