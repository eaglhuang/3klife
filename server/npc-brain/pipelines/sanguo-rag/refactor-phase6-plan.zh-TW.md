<!-- doc_id: doc_server_pipeline_0016 -->
# NPC-brain / Sanguo-RAG 第六階段重構計畫：Completion Scoring Policy 外部化

## Summary

第六階段把完成度計分政策從 Python 移到 governance data，目標是不改分數、不改既有輸出 schema，只讓權重、caps、confidence tier 與 boost queue policy 可治理。

本階段處理 `estimate_knowledge_completion.py` 與 `estimate_core_person_completion.py`。PostgreSQL / state store 仍延後到 P3，因為目前最大價值是先把 scoring policy 從程式碼移出，讓後續資料成長優先級可審查。

## Key Changes

- 新增 `Policy_KnowledgeCompletionScoring_P2`，管理 knowledge-growth completion 的 component weights、angle families、relationship evidence tiers、coverage caps 與公式權重。
- 新增 `Policy_CorePersonCompletionScoring_P2`，管理 core-person completion 的 component weights、profile depth、denominators、boost priority 與 recommended action mapping。
- 兩支 estimator 保留原 CLI 行為，新增可選 `--governance-root` 與 policy override 參數。
- 不把 policy path 或 policy id 寫入既有 JSON report，避免 legacy schema 變動。

## Implementation Rules

- Python 保留 artifact I/O、ratio 計算、排序與輸出。
- Governance policy 只提供權重、門檻、caps、固定 action/text mapping。
- Default policy 逐值複製重構前 Python 常數，回歸驗收必須等價。
- Validator 必須檢查兩份 policy 的權重總和、必要 component key、tier/cap 數值與 angle family 唯一性。

## Test Plan

- `python -m py_compile`：兩支 estimator、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 通過，並回報 completion scoring policy 摘要。
- 用 `local/codex-smoke/phase6-*` fixture 比對重構前後 JSON / Markdown / JSONL，忽略 `generatedAt` 與 output root path。
- `git diff --check` 與 touched text file UTF-8 guard 通過。

## Assumptions

- 本階段不調整分數策略，只搬移策略來源。
- 權重變更需另開資料政策 commit。
- 本階段不導入 PostgreSQL，不改 resolution loop state store。
