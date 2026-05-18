<!-- doc_id: doc_server_pipeline_0046 -->
# NPC-brain / Sanguo-RAG 第四十五階段重構計畫：Residual Hardcode Freeze Audit

## Summary

Phase 45 的重點不是繼續無限拆 Python，而是把剩餘硬寫做一次「凍結盤點」。大白話說：哪些已經治理完、哪些是刻意留在程式裡的安全 fallback、哪些要等條件成熟再做，全部寫清楚，讓後續 Agent 不會一直重複追同一批硬寫。

## Key Changes

- 新增 `policy-residual-hardcode-freeze-audit.json`，列出剩餘 hardcode 的狀態：`done-governed`、`intentional-fallback`、`postponed`。
- 新增 `residual-hardcode-freeze-audit.zh-TW.md`，用人話說明每個保留項目的理由。
- Validator 檢查 audit item 的 id、target path、status 與 decision，不允許空白或無效狀態。
- Harness phase matrix 加入 Phase 45，讓 completion ledger 不會漏掉這個收斂點。

## Test Plan

- `validate_sanguo_governance.py --dry-run-report` 通過，summary 顯示 residual hardcode audit count。
- `run_sanguo_governance_regression_harness.py --run-profile strict-local --no-write` 通過 snapshot。
- 文件不得包含 BOM、U+FFFD 或連續問號 mojibake。

## Assumptions

- 本階段不修改任何 pipeline 行為。
- `intentional-fallback` 表示刻意留在 Python 的演算法、安全 guard 或 schema contract，不再視為治理缺口。
- `postponed` 表示需要條件式階段，例如 PostgreSQL 或 vector production rollout。
