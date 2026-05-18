<!-- doc_id: doc_server_pipeline_0052 -->
# NPC-brain / Sanguo-RAG 第四十二階段功能計畫書：Harness Golden Snapshot Diff

## Summary

第四十二階段把 governance regression harness 的重要輸出建立 golden snapshot。目的很單純：validator 和 harness 現在已經能跑，但如果 summary、sensor、phase matrix 或 report bundle 形狀悄悄變了，需要有一張「基準照」能立刻抓出非預期漂移。

本階段只新增 snapshot policy、snapshot 檔與 harness 比對邏輯，不改 Sanguo-RAG pipeline 輸出，不改既有治理資料語意。

## Key Changes

- 新增 `Policy_GovernanceHarnessSnapshots_P1`，定義 strict-local snapshot 的路徑與要比較的 payload keys。
- 新增 golden snapshot，鎖住 `summary`、`sensors`、`phaseMatrix`、`reportBundle`。
- Regression harness 新增 snapshot compare，預設執行時會比對 golden snapshot。
- Validator summary 新增 snapshot count，並納入 validation stabilization policy。

## Implementation Rules

- Snapshot 必須忽略 `generatedAt` 與本機 absolute path；本階段只比較 deterministic payload keys。
- `--no-write` 仍然不寫 report 檔，但會執行 snapshot compare。
- 若 snapshot mismatch，harness status 必須變成 failed，方便 CI/人工立刻知道治理輸出漂移。

## Test Plan

- `python -m py_compile`：governance loader、validator、regression harness。
- `validate_sanguo_governance.py --dry-run-report` 通過，summary 顯示 `governanceHarnessSnapshotCount`。
- `run_sanguo_governance_regression_harness.py --run-profile strict-local --no-write` 通過，snapshot status 為 `ok`。
- `git diff --check` 與 touched file UTF-8 / BOM / U+FFFD guard 通過。

## Assumptions

- Phase 42 只鎖 harness payload 的穩定骨架，不鎖完整人讀 Markdown。
- 若未來 Phase 43 新增 CI entrypoint，需要同步更新 golden snapshot。

