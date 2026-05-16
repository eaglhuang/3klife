<!-- doc_id: doc_server_pipeline_0014 -->
# NPC-brain / Sanguo-RAG 第三階段重構計畫書：P1 Claim / Runtime Policy 外部化

## Summary

第三階段接在第二階段 P0 governance 主幹之後，目標是處理第一批 P1：relationship claim graph、runtime profile export、scoreboard、refresh runner 與 NPC dialogue runtime 共同使用的「穩定關係政策」。

本階段先承認並正式化一個資料政策：`A-romance` 是專案 runtime canon，可與 `A-history` 同級被 runtime 使用；但它不能被標成史實，必須保留 `claimLayer=romance`、`sourceFamily`、`claimGrade=A-romance` 等欄位來區分來源層。

## Scope

- 建立 `Policy_RelationshipRuntimeCanon_P1`。
- 將 `A-history / A-history-cross-source / A-romance / A-canon` 等 grade set 移入 governance policy。
- 將 stable runtime relationship source layer 移入 governance policy。
- 將 relationship claim graph 的 A-canon 輸出檔名移入 governance policy。
- 將 scoreboard 的 `A-romance` 晉級條件與 ready-eval grade type 移入 governance policy。
- 保留既有 CLI 相容性；新增的 `--governance-root` / `--relationship-policy` 都是可選參數。

## Non-Goals

- 不重新命名既有 pipeline 腳本。
- 不改 PostgreSQL / vector DB 架構。
- 不把全部 22 個 P1 一次搬完。
- 不修正人物或關係資料內容；若發現資料錯誤，另開資料修正任務。
- 不把 `A-romance` 混同為 `A-history`。

## Implementation Plan

1. 新增 relationship runtime canon policy：
   - `server/npc-brain/data/sanguo/policies/policy-relationship-runtime-canon.json`

2. 擴充 governance loader / validator：
   - loader 提供 `load_relationship_runtime_canon_policy`。
   - validator 檢查 `aCanonGrades`、`stableRuntimeSourceLayers`、`relationshipClaimGraphOutputs.aCanon`、`scoreboardReadyEvalGradeTypes`。

3. 接上 P1 第一批檔案：
   - `build_relationship_claim_graph.py`
   - `export_general_runtime_profile.py`
   - `build_full_roster_scoreboard.py`
   - `run_relationship_claim_graph_refresh.py`
   - `npc_dialogue_service.py`

4. 驗收：
   - `py_compile` 通過。
   - `validate_sanguo_governance.py --dry-run-report` 通過。
   - relationship claim graph 可用舊 CLI 參數執行。
   - runtime profile 與 dialogue service 仍可辨識 `A-history` 與 `A-romance` 為 runtime stable relationship。

## Next Candidates

- `benchmark_external_source.py`：將 source layer review wording 改接 policy text。
- `build_source_event_packets.py`：將 event/source packet 分層政策外部化。
- `extract_*_evidence_seeds.py`：將 source family 與 confidence gate 外部化。
- `run_resolution_loop.py`：暫留 P3 state / database 規劃，不進本階段。
