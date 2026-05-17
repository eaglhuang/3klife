<!-- doc_id: doc_server_pipeline_0032 -->
# NPC-brain / Sanguo-RAG 第二十二階段重構計畫：Alias / Mention Intake Governance 外部化

## Summary

第二十二階段處理 alias dictionary 與 observed mention intake 的 deterministic 規則。目標是把 alias source priority/label、decorative wrapper、address title、surname/noise/person-context cue 移入 governance data，不改 legacy JSON/Markdown schema，不調整未知人名候選演算法。

## Key Changes

- 新增 `policy-alias-mention-intake.json`，管理 alias source priority、source label 與 review status naming。
- 新增 `rule-alias-mention-intake-cues.jsonl`，管理 `build_alias_dict.py` 與 `collect_observed_mentions.py` 的 wrapper/noise/title/surname/person-prefix cue。
- `build_alias_dict.py` 新增 `--governance-root`、`--alias-mention-policy`、`--alias-mention-cue-rules`。
- `collect_observed_mentions.py` 新增 `--governance-root`、`--alias-mention-cue-rules`。
- Governance validator 新增 expected files、shape 檢查與 dry-run summary count。

## Boundary

`manage_review_pending.py` 的 promotion behavior 暫不改，避免在同一階段混入 manual triage write 行為。後續若要外部化 bucket/promotion policy，應另以 review-pending governance slice 處理。
