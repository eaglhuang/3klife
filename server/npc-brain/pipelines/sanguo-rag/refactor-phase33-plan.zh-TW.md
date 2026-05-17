<!-- doc_id: doc_server_pipeline_0043 -->
# NPC-brain / Sanguo-RAG 第三十三階段重構計畫：Governance Release Readiness Gate

## Summary

第三十三階段新增 governance release readiness gate，將 Phase 30/31 的驗證覆蓋、fixture manifest、phase plan matrix 與 handoff section coverage 合併成可機器判斷的交接門檻。本階段仍不導入 PostgreSQL，不改 pipeline 輸出 schema。

## Key Changes

- 新增 `Policy_GovernanceReleaseReadiness_P1`。
- Harness 新增 `--strict-release-readiness`。
- Release gate 檢查 missing phase plan、missing validation key、missing fixture file、fixture manifest error 與 handoff section coverage。

## Test Plan

- `validate_sanguo_governance.py --dry-run-report` 必須顯示 release readiness summary count。
- Strict harness 必須回傳 `status=ok`。
- 指定不存在 policy 時仍由 loader fail-fast，錯誤包含 path。

## Assumptions

- Release readiness gate 是交接與出貨前檢查，不代表跑完整資料管線。
- 真正大量 state / vector production gate 仍依 Phase 28/29 條件式策略推進。
