<!-- doc_id: doc_server_pipeline_0017 -->
# NPC-brain / Sanguo-RAG 第七階段重構計畫：Event Candidate / Question Seed Governance 外部化

## Summary

第七階段把事件候選與事件問題種子的成長政策移出 Python，承接 Phase 1-6 已建立的 Rule/Policy/Schema/Catalog governance 主幹。本階段只外部化 `extract_event_candidates.py` 與 `build_event_question_seed_bank.py` 的 cue、mapping、threshold、confidence policy，不改 legacy output schema、不調整分數策略、不導入 PostgreSQL。

## Key Changes

- 新增 `Policy_EventCandidateExtraction_P1` 與 `Rule_EventCandidateCues_*`，管理 alias smoke target、candidate cap、battle/female cue、female subtype cue、relationship edge default。
- 新增 `Policy_EventQuestionSeedBank_P1` 與 `Rule_EventQuestionAngleCues_*`，管理 angle cue、claim-to-angle-family mapping、external trust gate、slot strength unit weight。
- 兩支目標腳本新增 `--governance-root` 與 policy/rule override CLI；舊命令不帶新參數仍使用預設 governance data。
- Governance validator 擴充 dry-run summary count 與基本 shape 檢查，避免空 cue、重複 cue、非法 angle family 或非正數 threshold 進入主線。

## Implementation Rules

- Python 保留 Pydantic model、artifact I/O、排序、event id/key 生成與 Markdown rendering。
- Governance data 只提供資料政策與 cue table；資料值逐項複製 Phase 7 baseline，不在本階段修正語意或亂碼。
- `GOLD_SEED_BATTLE_SPECS` 暫留在 `gold_seed_registry.py`，後續若要搬遷需另開 catalog 階段並做 regression baseline。
- PostgreSQL/state store 仍延後，除非 resolution loop state 成為明確性能瓶頸。

## Test Plan

- `python -m py_compile`：兩支目標腳本、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 通過並顯示 event candidate/question summary count。
- 使用 `local/codex-smoke/phase7-*` 最小 fixture 比對重構前後 JSON/JSONL/Markdown；忽略 `generatedAt` 與 output root path，其餘需等價。
- `git diff --check` 與 touched text file encoding guard 通過。

## Assumptions

- 本階段只做治理外部化，不調整候選排序、confidence formula 或 canonical write 行為。
- 大型 cue table 使用 JSONL；小型 policy/mapping 使用 JSON。
- `atomic_workbench/`、Cocos assets 與其他 unrelated dirty files 不屬於本階段 commit。
