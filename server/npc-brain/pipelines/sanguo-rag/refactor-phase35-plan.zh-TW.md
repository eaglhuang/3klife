<!-- doc_id: doc_server_pipeline_0045 -->
# NPC-brain / Sanguo-RAG 第三十五階段重構計畫：Governance Operator Summary

## Summary

第三十五階段補上 operator summary。大白話說：harness JSON 很完整，但人接手時不該每次都讀一大包 JSON；這階段讓 harness 產生給下一位 Agent、maintainer、release reviewer 看的重點摘要，包含 status、release readiness、drift、handoff 與 fixture 狀態。

## Key Changes

- 新增 `Policy_GovernanceOperatorSummary_P1`。
- Harness payload 新增 `operatorSummary`。
- Markdown 報告新增 Operator Summary 區塊。

## Test Plan

- Governance validator 檢查 summary audiences 與 section key/label。
- Strict harness 顯示 operator summary section count。
- 不改 legacy pipeline output schema。

## Assumptions

- Operator summary 是交接報告，不是 runtime artifact。
- 真正完整 regression 仍由 Phase 27-35 的 harness payload 保存。
