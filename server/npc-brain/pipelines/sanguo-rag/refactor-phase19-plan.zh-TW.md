<!-- doc_id: doc_server_pipeline_0029 -->
# NPC-brain / Sanguo-RAG 第十九階段重構計畫：Full Roster Scoreboard Governance 外部化

## Summary

Phase 19 先處理 `build_full_roster_scoreboard.py` 的 scoreboard 預設治理資料。這支腳本決定全武將 scorecard 的輸入來源、輸出位置與 next-lane routing 門檻，屬於後續人工 review 與 runtime readiness 的中樞。此階段只搬移 deterministic default path 與 lane threshold，不改 score formula、不改輸出 schema、不改 relationship runtime canon policy。

## Key Changes

- 新增 `Policy_FullRosterScoreboard_P1`：集中管理 scoreboard 預設輸入/輸出路徑、profile choices 與 lane thresholds。
- 新增 `load_full_roster_scoreboard_policy(...)` loader API。
- `build_full_roster_scoreboard.py` 新增 `--scoreboard-policy`，並維持舊參數優先序：CLI path/profile override > scoreboard governance > code fallback。
- governance validator 新增 expected file、dry-run count 與基本 shape 檢查。

## Implementation Boundary

- Python 保留分數計算、scorecard row 組裝、Markdown rendering 與 JSON 輸出 schema。
- `A-history` / `A-romance` 門檻仍由既有 relationship runtime canon policy 管理，不在本階段重複搬移。
- `historicalTrustScore`、`worldbuildingUsabilityScore`、`priorityScore` 權重先不搬，留到下一個 scoring policy slice，避免同一 commit 同時動 routing 與分數語義。

## Test Plan

- 後續驗收建議跑 `py_compile`、`validate_sanguo_governance.py --dry-run-report`、scoreboard fixture regression、`git diff --check` 與 touched encoding guard。
- 本階段的 commit 邊界只包含 Sanguo-RAG governance 與 scoreboard 相關檔案。

## Assumptions

- 本階段只做治理外部化，不調整 lane routing 決策。
- 小型 policy 使用 JSON。
- PostgreSQL / state store 仍延後到 resolution loop state 或 run history 明確成為瓶頸後再規劃。
