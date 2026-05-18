<!-- doc_id: doc_server_pipeline_0057 -->
# NPC-brain / Sanguo-RAG 第四十七階段計畫：Conditional Vector Production Rollout

## Summary

Phase 47 是條件式尾段規劃，不啟用 production vector upsert。它把「什麼時候可以把 Sanguo vector ingestion 推到 production」寫成 governance policy，避免未來靠口頭記憶決定 provider、namespace、dedupe、resume 與 rollback。

## Key Changes

- 新增 `Policy_VectorProductionRolloutPlan_P1`。
- 明確標示 `decisionMode=plan-only` 與 `enabledByDefault=false`。
- 定義 production rollout 的觸發條件、必要步驟、resume guard 與 rollback record。
- 不修改 `run_vector_ingestion_gate.py`、不寫 provider、不改 vector record schema。

## Test Plan

- `validate_sanguo_governance.py --dry-run-report` 必須顯示 vector production rollout count。
- strict-local harness 必須能讀到 Phase 47 expected file 與 phase matrix。
- 文件與 policy 必須通過 UTF-8 / BOM / U+FFFD 檢查。

## Assumptions

- production vector ingestion 仍是條件式中後期工作。
- 只有確認 production consumer 與 provider quota 後，才允許從 plan 進到實作。
