<!-- doc_id: doc_server_pipeline_0058 -->
# Sanguo Vector Production Rollout Plan

## 大白話說明

這份文件是在說：現在我們不真的把向量資料寫進 production provider，而是先把「如果未來要上 production，必須過哪些關卡」寫清楚。也就是先畫安全檢查表，不急著按紅色大按鈕。

## Rollout Gate

1. 先確認 strict-local harness 與 vector dry-run export 穩定。
2. 產出 deterministic upsert manifest，包含 input fingerprint、provider、namespace、record count 與 dedupe key。
3. 先寫 smoke namespace，不直接寫 production namespace。
4. 重跑同一份 manifest，確認 dedupe/resume 不會重複寫入。
5. 有明確 approval 後才 promote production namespace。
6. 保存 rollback manifest 與 provider response summary。

## Non-goals

- Phase 47 不啟用 production upsert。
- Phase 47 不新增 vector provider。
- Phase 47 不改 vector record schema。

## Operator Note

未來若 production rollout 被觸發，請先更新 `policy-vector-production-rollout-plan.json` 的 trigger evidence，再開新的正式 task 或 migration commit。
