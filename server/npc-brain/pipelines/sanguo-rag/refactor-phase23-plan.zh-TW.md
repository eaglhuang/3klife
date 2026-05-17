<!-- doc_id: doc_server_pipeline_0033 -->
# NPC-brain / Sanguo-RAG 第二十三階段重構計畫：External Evidence Scoring Governance 外部化

## Summary

第二十三階段處理 external evidence seed scoring。目標是把 source layer score、angle specificity score、extraction reliability score、raw seed score weights、promotion target gate 與 site reliability multiplier 參數移入 governance policy，不改 scored JSONL/ranking JSON/Markdown schema。

## Key Changes

- 新增 `policy-external-evidence-scoring.json`，管理 scoring tables、raw score weights、cross-site signal、promotion target 與 site reliability multiplier。
- `score_external_evidence_seeds.py` 新增 `--governance-root`、`--external-evidence-scoring-policy`。
- Governance validator 新增 expected file、score table/weight 檢查與 dry-run summary count。

## Boundary

本階段只移動 deterministic scoring policy，不調整 promotion 門檻、不修正 seed 內容、不引入 PostgreSQL 或 vector ingestion 行為。
