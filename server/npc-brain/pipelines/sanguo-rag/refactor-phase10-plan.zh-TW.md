<!-- doc_id: doc_server_pipeline_0019 -->
# NPC-brain / Sanguo-RAG 第十階段功能計畫書：NPC Dialogue Runtime Service Governance 外部化

## Summary

Phase 9 已完成 runtime general profile export governance 外部化。第十階段接續處理 runtime consumption 端，也就是 `npc_dialogue_service.py` 中仍硬寫的 deterministic service policy、LLM model preset catalog 與 runtime ambiguity cue。本階段不改 API response schema、不改 prompt/rendering 策略、不改 runtime profile artifacts，只把穩定治理資料集中到 `server/npc-brain/data/sanguo`。

## Key Changes

- 新增 `Policy_NpcDialogueRuntimeService_P1`：管理預設 LLM preset、history provider、stable relationship source layer、A-canon relationship grade。
- 新增 `Catalog_NpcDialogueLlmModelPreset_P1_*`：管理 service 支援的 LLM model preset catalog。
- 新增 `Rule_NpcDialogueRuntimeCues_P1_*`：管理硬關係 pair、target/name collision、黃巾系 target 與 context cue。
- `npc_dialogue_service.py` 保留原 Python fallback，但在 service 初始化時優先讀取 governance data 注入全域 runtime service 設定。
- `validate_sanguo_governance.py` 增加 Phase 10 檢查與 dry-run summary count。

## Implementation Rules

- 不修改 `DialogueRequest`、`DialogueResponse`、`SceneDirectorRequest`、`SceneDirectorResponse` schema。
- 不改 `DialogueProviderRouter`、memory compression、scene image renderer 或 vector second pass。
- 不改 relationship runtime canon policy 既有消費邏輯；Phase 10 只補 service 端 fallback/default governance。
- 預設 governance 檔缺失時保留 Python fallback，避免 API service import 因資料搬遷而變脆；顯式環境變數 override 缺失時 fail-fast。

## Test Plan

- `python -m py_compile`：service、loader、validator。
- `validate_sanguo_governance.py --dry-run-report` 通過，並顯示 `npcDialogueLlmModelPresetCount`、`npcDialogueRuntimeCueRuleCount`。
- 常數等價檢查：HEAD 版本常數與 current governance 注入後常數一致。
- runtime health smoke：初始化 `NpcDialogueService` 後 `supportedModelPresets` 仍包含 `fallback_chain`。
- `git diff --check` 與 touched text file UTF-8 / BOM / U+FFFD 檢查通過。

## Assumptions

- Phase 10 只處理 NPC dialogue service deterministic governance，不導入 PostgreSQL / state store。
- LLM provider env、API key 與模型呼叫行為不在本階段調整。
- 小型 policy 用 JSON；row-like model preset catalog 與 cue table 用 JSONL。
