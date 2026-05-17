<!-- doc_id: doc_server_pipeline_0021 -->
# NPC-brain / Sanguo-RAG 第十二階段功能計畫書：Dialogue Mention Resolution Governance 外部化

## Summary

Phase 11 已完成 runtime readiness matrix governance。第十二階段處理較舊的 `resolve_dialogue_mentions.py`，把 address-title、item、speaker、address target hint table 與 confidence / resolution mode policy 外部化。本階段不修正既有亂碼 cue、不改 regex、不改 `dialogue-resolution.json` / Markdown schema。

## Key Changes

- 新增 `Policy_DialogueMentionResolution_P1`：管理 pilot chapter、speaker/address/item confidence 與 resolution mode labels。
- 新增 `Rule_DialogueMentionResolutionCues_P1_*`：管理 `ADDRESS_TITLE_HINTS`、`ITEM_HINTS`、`SPEAKER_HINTS`、`ADDRESS_TARGET_HINTS`。
- `resolve_dialogue_mentions.py` 新增 `--governance-root`、`--dialogue-mention-policy`、`--dialogue-mention-cue-rules`。
- `sanguo_governance_loader.py` 與 `validate_sanguo_governance.py` 增加 loader、expected files、shape validation 與 dry-run summary count。

## Implementation Rules

- Python 保留 paragraph splitting、quote regex、Pydantic model、fixture、JSON/Markdown rendering。
- Governance data 只提供 deterministic hint / confidence policy。
- 不調整 cue 內容；所有值從 Phase 12 baseline 原樣搬移。
- CLI `--chapter` 保持 override 優先；未指定時使用 governance `defaultChapter`。

## Test Plan

- 重構前後使用 `local/codex-smoke/phase12-*` fixture 比對 JSON/Markdown；忽略 `generatedAt`，其餘等價。
- `python -m py_compile`：resolver、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 通過，並顯示 `dialogueMentionCueRuleCount`。
- missing policy path fail-fast 且包含實際 path。
- `git diff --check` 與 touched text file UTF-8 / BOM / U+FFFD 檢查通過。

## Assumptions

- Phase 12 只處理 deterministic mention resolver governance。
- 若要修復舊 cue 的亂碼或 quote regex，需另開資料修正階段，不混入本重構 commit。
