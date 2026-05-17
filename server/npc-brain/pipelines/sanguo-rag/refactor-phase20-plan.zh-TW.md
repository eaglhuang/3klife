<!-- doc_id: doc_server_pipeline_0030 -->
# NPC-brain / Sanguo-RAG 第二十階段重構計畫：Full Roster Scoreboard Scoring Governance 外部化

## Summary

Phase 20 承接 Phase 19，只外部化 `build_full_roster_scoreboard.py` 仍留在 Python 的總分公式權重與 B 級 fallback threshold。此階段不調整分數策略、不改 scorecard JSON/Markdown schema、不改 relationship runtime canon 的 A-history/A-romance 門檻。

## Key Changes

- 擴充 `Policy_FullRosterScoreboard_P1` 的 `scoring` 區塊，管理 historical trust、worldbuilding usability、priority score 權重。
- 將 B 級 fallback threshold 搬入 `gradeFallbackThresholds`，維持原本 `50.0 / 50.0` 行為。
- `build_full_roster_scoreboard.py` 保留 code fallback，未載入 governance 時仍使用 Phase 20 baseline 數值。
- governance validator 新增 scoring section 與 numeric/positive guard，dry-run summary 顯示 scoring section/weight count。

## Test Plan

- `python -m py_compile`：scoreboard 與 validator。
- `validate_sanguo_governance.py --dry-run-report` 通過，並顯示 `fullRosterScoreboardScoringSectionCount` 與 `fullRosterScoreboardScoringWeightCount`。
- 使用 `local/codex-smoke/phase20-*` fixture 比對 baseline/after 的 scoreboard JSON/Markdown，忽略 `generatedAt` 與 output path。
- `git diff --check` 與 touched text UTF-8/BOM/U+FFFD guard 通過。

## Assumptions

- 本階段只搬總分公式權重；`confidence_breakdown` 子訊號建模仍留在 Python，避免同一 commit 過度擴張。
- 所有權重與門檻逐值複製 Phase 20 baseline，不順手調參。
- PostgreSQL / state store 仍延後。
