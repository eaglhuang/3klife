<!-- doc_id: doc_server_pipeline_0023 -->
# NPC-brain / Sanguo-RAG 第十三階段功能計畫書：Resolution Loop Runner Governance 外部化

## Summary

第十三階段收斂 `run_resolution_loop.py` 裡仍硬寫的 resolution-loop runner 預設與 MCQ recommendation policy。這一階段不改 alias/observed mention pipeline、不改 PostgreSQL schema、不改 choices JSON/Markdown schema，只把 deterministic scoring、rank、suffix cue 與 runner default 移到 governance data。

## Key Changes

- 新增 `policy-resolution-loop-runner.json`，id 為 `Policy_ResolutionLoopRunner_P1`。
- 新增 `rule-resolution-loop-recommendation-cues.jsonl`，id prefix 為 `Rule_ResolutionLoopRecommendationCues_P1`。
- `run_resolution_loop.py` 新增 `--governance-root`、`--resolution-loop-policy`、`--resolution-loop-cue-rules`。
- 既有 CLI override 維持最高優先序：CLI 參數 > governance data > code fallback。
- Governance validator 新增 resolution loop count 與基本 shape 檢查。

## Implementation Rules

- Python 保留 orchestration、PostgreSQL fallback、artifact I/O、MCQ rendering 與 existing answer carry-forward。
- Governance data 只提供 runner default、recommendation scoring/rank 與 suffix/cleanup cue。
- 不修正現有 cue 亂碼或語意，只原樣搬移，避免重構混入資料修正。
- PostgreSQL/state store 仍延後，除非 resolution state 成為明確瓶頸。

## Test Plan

- `python -m py_compile`：runner、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 通過，且顯示 Phase 13 新 count。
- 常數等價檢查：`HEAD` 內建常數 vs governance 注入後常數需一致。
- missing policy/rule fail-fast 應包含實際 path，且不印 Python traceback。
- `git diff --check` 與 touched text UTF-8/BOM/U+FFFD 檢查。
