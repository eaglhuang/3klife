<!-- doc_id: doc_server_pipeline_0041 -->
# NPC-brain / Sanguo-RAG 第三十一階段重構計畫：Regression Fixture Consolidation

## Summary

Phase 31 目標是把過去散落在 `local/codex-smoke` 的臨時 smoke fixture 收斂成 repo 內固定 fixture manifest。這不是正式大資料集，而是一組最小可讀、可重跑、可交接的治理回歸樣本。

## Key Changes

- 新增 `fixtures/governance-regression/fixture-manifest.json`。
- 新增最小 observed mentions、stable bootstrap、relationship evidence、events、keyword options、persona card fixture。
- Regression harness 會產生 `fixtureMatrix` 區塊。
- 若 `--strict-fixtures` 開啟，缺少 fixture 檔會 fail。

## Test Plan

- Harness `--no-write --strict-fixtures` 應顯示 fixture manifest 與所有 fixture file 存在。
- Fixture 檔案必須是 UTF-8 without BOM。
