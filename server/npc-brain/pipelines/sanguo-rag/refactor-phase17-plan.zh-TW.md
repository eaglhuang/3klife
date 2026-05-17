<!-- doc_id: doc_server_pipeline_0027 -->
# NPC-brain / Sanguo-RAG 第十七階段功能計畫書：3KWeb Check Runner Governance 外部化

## Summary

第十七階段收斂 `run_3kweb_check.py` 的 deterministic source-health/precheck policy。此階段只把 precheck threshold、hint keyword、term-hit cue、fetch default 與路徑預設搬到 governance data，不改 live fetch 行為、不改 summary JSON/Markdown schema、不導入 PostgreSQL。

## Key Changes

- 新增 `Policy_ThreeKWebCheckRunner_P1`：管理 output/source/scoreboard/source-health CLI path、fetch backend、timeout、max gap general 與 precheck default。
- 新增 `Rule_ThreeKWebCheckCues_P1_DEFAULT_TERM_HIT_KEYWORDS`：管理全域 term-hit keyword cue。
- `run_3kweb_check.py` 新增 `--governance-root`、`--three-kweb-check-policy`、`--three-kweb-check-cue-rules`。
- 補齊 Phase 13-16 policy/rule 在 `expected_governance_files()` 的治理檔清單，避免 dry-run report 漏列已治理 runner。

## Implementation Rules

- 保留 source config override 優先序：source row > source config pipeline policy > governance default > code fallback。
- Python 保留 fetch、hash、HTML strip、summary rendering 與 output schema。
- 本階段不修正 source config 內容、不調整 benchmark/precheck 門檻語義。

## Test Plan

- `python -m py_compile`：`run_3kweb_check.py`、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 顯示 `threeKwebCheckCueRuleCount` 與 `threeKwebCheckTermKeywordCount`。
- `run_3kweb_check.py --dry-run` 可用原 CLI 預設產出等價 summary。
- missing policy/rule path fail-fast 且錯誤包含實際 path。

## Assumptions

- Live network fetch 不在本階段驗收範圍，避免環境與網路不穩定影響 governance refactor。
- `run_deepseek_reasoning_trial.py` 與大型 `run_full_roster_convergence_loop.py` 的剩餘 runner policy 延後處理。
- PostgreSQL/state store 仍延後到 run history 或 resolution state 成為明確瓶頸後再規劃。
