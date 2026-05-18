<!-- doc_id: doc_server_pipeline_0059 -->
# NPC-brain / Sanguo-RAG 第四十八階段計畫：Governance Maintenance Mode

## Summary

Phase 48 是 governance 收斂封口。前面 Phase 1-47 已把大多數 deterministic policy、rule、catalog、schema、harness、CI、runbook 與條件式 PostgreSQL/vector 計畫收攏；本階段的目標是宣告維護模式，之後不再為了「看起來還能拆」而無限新增 phase。

## Key Changes

- 新增 `Policy_GovernanceMaintenanceMode_P1`。
- 預設動作為 `do-not-add-new-phase`。
- 定義少數允許重新開大型治理工作的 trigger。
- 要求後續變更先跑 strict-local CI、snapshot-match 與 dirty-scope-check。

## Test Plan

- validator 必須檢查 maintenance mode、phase range、allowed triggers、review cadence 與 exit checks。
- strict-local harness 必須納入 Phase 48 phase matrix。
- 文件與 policy 必須通過 UTF-8 / BOM / U+FFFD 檢查。

## Assumptions

- Phase 48 後，Sanguo-RAG governance 進入維護模式。
- 新 phase 不是禁止，而是必須有 production bottleneck、schema break、資料安全風險或新 runtime consumer 這類明確原因。
