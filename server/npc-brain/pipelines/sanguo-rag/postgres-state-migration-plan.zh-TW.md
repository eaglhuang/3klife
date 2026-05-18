<!-- doc_id: doc_server_pipeline_0049 -->
# NPC-brain / Sanguo-RAG PostgreSQL State Migration Plan

## Summary

這份文件是 PostgreSQL state store 的條件式遷移計畫。現在不導入 PostgreSQL，因為 JSONL + manifest 仍然足夠清楚、容易 diff、容易重跑。只有當 run history、review state、incremental state 的資料量或 resume scan 時間達到 Phase 28 門檻時，才啟動這份計畫。

## Migration Gates

- Phase 28 evaluation policy 給出 `prepare-postgres-adapter` 或 `migrate-state-store`。
- Strict-local governance harness 維持通過。
- JSONL export mirror 仍保留，不能只剩 DB。
- rollback plan 已驗證，且能回到 JSONL canonical state。

## Adapter Plan

- `stateRepository`：把 runner / review / incremental state 的讀寫隔離到 adapter。
- `jsonlExportMirror`：任何 DB state 都要能輸出成 JSONL 供 audit 和 regression 使用。
- `migrationBackfill`：從既有 manifest / JSONL 回填 PostgreSQL，並比對 row count。
- `rollbackPlan`：cutover 前必須保留回退路徑。

## Non-goals

- 本階段不新增 DB driver。
- 本階段不修改 runner state 寫入。
- 本階段不改 runtime profile、relationship graph 或 review output schema。
- 本階段不處理 vector ingestion production rollout。
