<!-- doc_id: doc_server_pipeline_0051 -->
# NPC-brain / Sanguo-RAG 第四十一階段功能計畫書：Governance Schema Registry

## Summary

第四十一階段把 governance data 的基本形狀整理成 schema registry。這不是要導入完整 JSON Schema 驗證器，而是先建立最小、穩定、可讀的登記簿：policy、rule、catalog、schema 每一類檔案至少要有 `id`、section、format、必要欄位與命名前綴。

這一階段不改任何 Sanguo-RAG pipeline 行為，只強化治理資料的入口檢查，避免後續新增 policy/rule 時只有 count 增加，卻沒有基本 shape 約束。

## Key Changes

- 新增 `Schema_GovernanceRegistry_P1`，列出 `policies`、`rules`、`catalogs`、`schemas` 的最小 shape。
- Governance loader 新增 `load_governance_schema_registry(...)`。
- Governance validator 新增 schema registry 檢查：section 覆蓋、format 合法、required field 非空、id prefix 非空。
- Validator summary 新增 schema registry count，並納入 validation stabilization policy。

## Implementation Rules

- 只檢查治理檔最小 shape，不取代既有針對個別 policy/rule 的細部檢查。
- 不改 legacy pipeline CLI、不改輸出 schema、不搬移既有治理檔。
- Schema registry 本身放在 `schemas/`，因為它描述的是治理 bundle 的形狀。

## Test Plan

- `python -m py_compile`：governance loader、validator、regression harness。
- `validate_sanguo_governance.py --dry-run-report` 通過，summary 顯示 `governanceSchemaRegistryEntryCount`。
- `run_sanguo_governance_regression_harness.py --run-profile strict-local --no-write` 通過。
- `git diff --check` 與 touched file UTF-8 / BOM / U+FFFD guard 通過。

## Assumptions

- Phase 41 只做最小 registry，不在此階段導入完整 JSON Schema draft 驗證。
- 既有 validator 的深度檢查仍保留，schema registry 先補上橫向防線。

