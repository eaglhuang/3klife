<!-- doc_id: doc_server_pipeline_0043 -->
# NPC-brain / Sanguo-RAG 第四十三階段重構計畫：Governance CI Entrypoint

## Summary

Phase 43 把前面 Agent 手動知道的治理檢查流程收斂成單一入口。目標不是新增 pipeline 行為，而是讓人工、CI、下一位 Agent 都能用同一支指令重跑 strict-local governance harness。

## Key Changes

- 新增 `policy-governance-ci-entrypoint.json`，描述預設 run profile、no-write 行為、timeout 與必跑檢查。
- 新增 `run_sanguo_governance_ci.py`，包裝 `run_sanguo_governance_regression_harness.py --run-profile strict-local --no-write`。
- CI wrapper 必須有 timeout 與 try/except，避免前面遇到的卡住問題重演。
- 預設不寫 tracked 檔案，只輸出簡短 JSON summary；需要完整 payload 時可加 `--output-json`。

## Test Plan

- `python -m py_compile`：CI wrapper、loader、validator、harness。
- `validate_sanguo_governance.py --dry-run-report` 通過，summary 顯示 CI policy count。
- `run_sanguo_governance_ci.py --run-profile strict-local` 通過。
- `git diff --check` 與 UTF-8/BOM/U+FFFD 檢查通過。

## Assumptions

- Phase 43 只建立入口，不改 harness sensor 本身。
- CI wrapper 預設 `--no-write`，避免人工驗收時污染 repo。
- PostgreSQL / vector production rollout 仍不是本階段目標。
