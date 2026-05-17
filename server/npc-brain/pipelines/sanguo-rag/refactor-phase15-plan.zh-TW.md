<!-- doc_id: doc_server_pipeline_0025 -->
# NPC-brain / Sanguo-RAG 第十五階段功能計畫書：Repair Review Campaign Governance 外部化

## Summary

第十五階段收斂 `run_repair_review_campaign.py` 的 repair campaign runner 預設與 round selection policy。此階段只外部化 round id、artifact path defaults、fallback input paths、top selection limits、reviewer defaults、human gate / timeout、round pass/rerun regex，不改 repair pipeline 的 subprocess 順序、不改 summary JSON/Markdown schema、不導入 PostgreSQL。

## Key Changes

- 新增 `policy-repair-review-campaign.json`，id 為 `Policy_RepairReviewCampaign_P1`。
- `run_repair_review_campaign.py` 新增 `--governance-root` 與 `--repair-review-campaign-policy`。
- 既有 CLI override 優先序維持：CLI 參數 > governance policy > code fallback。
- Governance validator 新增 repair campaign path/default/pattern 檢查與 dry-run summary count。

## Implementation Rules

- Python 保留 subprocess orchestration、round batch selection、progress merge、Markdown rendering 與 output schema。
- Governance data 只提供 deterministic runner default 和 regex policy。
- 不跑完整 repair campaign，不觸發外部 reviewer 或寫 canonical pipeline output。

## Test Plan

- `python -m py_compile`：repair runner、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 通過並顯示 Phase 15 新 count。
- 預設等價檢查：HEAD parse defaults vs governance 注入後 defaults 一致。
- missing policy fail-fast 包含 path 且無 Python traceback。
- `git diff --check` 與 touched text UTF-8/BOM/U+FFFD 檢查。
