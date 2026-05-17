<!-- doc_id: doc_server_pipeline_0036 -->
# NPC-brain / Sanguo-RAG 第二十六階段重構計畫：Convergence Loop State Governance

## Summary

Phase 26 收斂 full roster 與 progress advancement runner 的 state/resume/stop/ROI governance。此階段先建立 `Policy_ConvergenceLoopState_P1` 與兩支 runner 的相容 CLI/fail-fast wiring，不改既有 manifest、summary、JSON/JSONL/Markdown schema。

## Key Changes

- 新增 `policy-convergence-loop-state.json`。
- `run_full_roster_convergence_loop.py` 新增 `--convergence-state-policy`。
- `run_progress_advancement_loop.py` 新增 `--convergence-state-policy`。
- Governance validator 檢查 resume manifest keys、progress path keys、stop reason、ROI action set。

## Test Plan

- `py_compile` 兩支 runner、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 顯示 Phase 26 summary count。
- Missing policy override 應 fail-fast 且不印 Python traceback。
