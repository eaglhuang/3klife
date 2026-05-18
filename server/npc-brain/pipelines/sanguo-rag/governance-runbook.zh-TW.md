<!-- doc_id: doc_server_pipeline_0045 -->
# NPC-brain / Sanguo-RAG Governance Runbook

## Summary

這份 runbook 是 Sanguo-RAG governance 的人工操作手冊。大白話說：前面 Phase 1-44 已經把很多「藏在 Python 裡的規則、門檻、標籤、cue table」搬到 `server/npc-brain/data/sanguo/`，這份文件告訴下一位 Agent 或維護者要怎麼重跑檢查、怎麼看錯誤、以及哪個 governance 檔會影響哪條管線。

## Commands

最常用入口：

```powershell
python server/npc-brain/pipelines/sanguo-rag/run_sanguo_governance_ci.py --run-profile strict-local
```

只跑 governance data 驗證：

```powershell
python server/npc-brain/pipelines/sanguo-rag/validate_sanguo_governance.py --dry-run-report
```

直接跑 regression harness：

```powershell
python server/npc-brain/pipelines/sanguo-rag/run_sanguo_governance_regression_harness.py --run-profile strict-local --no-write
```

如果要更新 golden snapshot，先用 `--skip-snapshot-check` 產生 payload，再只把 `summary / sensors / phaseMatrix / reportBundle` 寫回 snapshot。不要把 `generatedAt` 或本機絕對路徑寫進 snapshot。

## Consumer Index

Consumer index 的單一來源是 `sanguo_governance_loader.expected_governance_files()`。維護時請遵守：

- 新增 policy/rule/catalog/schema 時，必須補進 `expected_governance_files()`。
- 新增 loader API 時，必須讓 validator 實際讀到該檔。
- 新增 phase plan 時，必須補進 regression harness phase matrix 與 plan encoding policy。
- 新增 harness summary key 時，若屬於必守指標，必須補進 validation stabilization policy。

常見 consumer 分區：

- `policies/`：runner、scoring、gate、threshold、run profile、report bundle。
- `rules/`：cue table、文字清理、relationship refinement、resolution recommendation。
- `catalogs/`：穩定 lookup，例如 voice preset、runtime label、人物相關 catalog。
- `schemas/`：payload shape 與 governance registry。

## Failure SOP

如果 `validate_sanguo_governance.py` 失敗：

- 先看錯誤訊息中的實際 path、row id、field。
- 若是 missing file，確認檔案是否已建立並補進正確 section。
- 若是 duplicate id / duplicate cue，先回到 governance data 修正，不要在 Python 裡繞過。
- 若是 summary key missing，表示 validator 有載入缺口，要補 loader 或 summary。

如果 `run_sanguo_governance_regression_harness.py` 失敗：

- 先看 `status`、`governanceDrift`、`releaseReadiness`、`goldenSnapshot`。
- 若只有 snapshot mismatch，確認這次是否刻意改了 `summary / sensors / phaseMatrix / reportBundle`。
- 若是 drift minimum 不足，通常代表 expected file、phase plan 或 consumer index 漏更新。
- 若是 fixture missing，先修 fixture manifest，不要讓 harness 靜默跳過。

如果 `run_sanguo_governance_ci.py` timeout：

- 先用 harness 原指令重跑，看是否卡在 validator、snapshot 或檔案系統。
- 保持 timeout 明確，不要把 wrapper 改成無限等待。
- 若卡住原因是外部網路或 DB，這代表該檢查不應放進 strict-local profile。

## Phase Roadmap

- Phase 1-19：把 Sanguo-RAG 主要 deterministic data policy 從 Python 拆到 governance data。
- Phase 20-29：收斂 scoreboard、relationship、alias、external evidence、browser/vector readiness、runner state 與條件式 DB/vector plan。
- Phase 30-39：建立 validation stabilization、fixture、handoff index、release readiness、drift、triage、completion ledger、run profile、report bundle。
- Phase 40-42：修補 plan encoding、建立 schema registry、加入 golden snapshot diff。
- Phase 43-44：加入單一 CI 入口與人工 runbook。
- Phase 45-46：完成 residual hardcode freeze audit 與條件式 PostgreSQL migration plan。
- Phase 47：建議下一步做 Conditional Vector Production Rollout Plan，仍先維持 plan-only。
