<!-- doc_id: doc_server_pipeline_0020 -->
# NPC-brain / Sanguo-RAG 第十一階段功能計畫書：Runtime Readiness Matrix Governance 外部化

## Summary

Phase 10 已完成 NPC dialogue runtime service governance。第十一階段接續處理 `build_runtime_readiness_matrix.py`，把多武將 runtime smoke matrix 的預設 roster、dialogue smoke 參數與 pass/warn/fail gate 外部化。此階段不改 readiness JSON/Markdown schema、不改 NPC dialogue service、不導入 PostgreSQL。

## Key Changes

- 新增 `Policy_RuntimeReadinessMatrix_P1`：管理 default general roster、deterministic provider order、keyword limit、dialogue locale/speech/preset/maxChars 與 readiness status gate。
- `build_runtime_readiness_matrix.py` 新增 `--governance-root` 與 `--runtime-readiness-policy`，保留既有 `--general-id` / `--general-id-file` / `--limit-keywords` CLI override。
- `validate_sanguo_governance.py` 新增 policy shape 檢查與 dry-run summary count。
- `sanguo_governance_loader.py` 新增 loader API 與 expected governance file mapping。

## Implementation Rules

- Python 保留 service orchestration、row rendering、summary/Markdown 輸出。
- Governance data 只提供 deterministic smoke defaults 與 status gate 名稱。
- CLI 優先序維持：CLI explicit general ids / limit > governance defaults > Python fallback。
- 不調整 fail/warn/pass 語意，只把既有條件命名化。

## Test Plan

- `python -m py_compile`：readiness script、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 通過，並顯示 `runtimeReadinessDefaultGeneralCount`。
- 常數等價檢查：HEAD `DEFAULT_GENERAL_IDS` 與 governance 注入後一致。
- readiness smoke：以單一 `--general-id cao-cao`、deterministic provider、短 timeout 跑完。
- `git diff --check` 與 touched text file UTF-8 / BOM / U+FFFD 檢查通過。

## Assumptions

- Phase 11 只處理 readiness matrix governance，不碰 legacy dialogue mention resolver。
- 若後續要整理 `resolve_dialogue_mentions.py` 的 address/item/speaker hints，應另開 Phase 12 並先補 baseline，避免和 readiness smoke 混在同一 commit。
