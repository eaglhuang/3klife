<!-- doc_id: doc_server_pipeline_0024 -->
# NPC-brain / Sanguo-RAG 第十四階段功能計畫書：Three-Lane Progress Scheduler Governance 外部化

## Summary

第十四階段收斂 `run_three_lane_progress_scheduler.py` 裡仍硬寫的三線排程政策。此階段只外部化 lane 順序、profile、round/cycle 預設、reviewer default、pending review gate 與 stop reason policy，不改下游 `run_progress_advancement_loop.py` 行為、不改 summary JSON/Markdown schema、不導入 PostgreSQL。

## Key Changes

- 新增 `policy-three-lane-progress-scheduler.json`，id 為 `Policy_ThreeLaneProgressScheduler_P1`。
- `run_three_lane_progress_scheduler.py` 新增 `--governance-root` 與 `--three-lane-scheduler-policy`。
- 既有 CLI override 優先序維持：CLI 參數 > governance policy > code fallback。
- Governance validator 新增 lane/default/stop reason shape 檢查與 dry-run summary count。

## Implementation Rules

- Python 保留 subprocess orchestration、lane report 聚合、Markdown rendering 與 output schema。
- Governance data 只提供 deterministic scheduler policy，不調整 lane 執行策略。
- 不碰 repair campaign、knowledge growth round 或 PostgreSQL state store。

## Test Plan

- `python -m py_compile`：scheduler、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 通過並顯示 Phase 14 新 count。
- 常數/預設等價檢查：HEAD 內建 stop reasons 與 lane configs vs governance 注入後結果一致。
- scheduler `--dry-run` smoke 通過。
- missing policy fail-fast 包含 path 且無 Python traceback。
- `git diff --check` 與 touched text UTF-8/BOM/U+FFFD 檢查。
