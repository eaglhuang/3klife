<!-- doc_id: doc_server_pipeline_0047 -->
# NPC-brain / Sanguo-RAG 第四十六階段重構計畫：Conditional PostgreSQL Migration Plan

## Summary

Phase 46 是條件式 PostgreSQL migration plan，不是實作資料庫。Phase 28 已經定義「什麼情況該考慮 PostgreSQL」；Phase 46 補上「如果真的達標，要怎麼安全導入 adapter、backfill、dual-write、cutover、rollback」。

## Key Changes

- 新增 `policy-postgres-state-migration-plan.json`，id 為 `Policy_PostgresStateMigrationPlan_P1`。
- Migration policy 預設 `enabledByDefault=false`，避免現在就導入 PostgreSQL dependency。
- 設定必要 adapter layer：state repository、JSONL export mirror、migration backfill、rollback plan。
- Validator 檢查 migration steps、trigger recommendation 與 adapter layer 不可空白。

## Test Plan

- `validate_sanguo_governance.py --dry-run-report` 通過，summary 顯示 migration step count。
- Strict-local harness 通過，且不要求本機 PostgreSQL。
- CI entrypoint 仍可在 no-write 模式通過。

## Assumptions

- PostgreSQL 只有在 Phase 28 evaluation threshold 達標時才啟動。
- JSONL / manifest 仍是現階段 canonical state。
- 本階段不新增 DB driver、不改 runner state 寫入、不改 runtime output schema。
