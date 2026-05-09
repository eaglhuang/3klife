<!-- doc_id: doc_other_0116 -->
# Validator Orchestrator 與 AJV Cache 統一入口

## 目標

- 為 `validate:*` 腳本提供單一 orchestrator 入口，統一執行註冊、執行與 telemetry。
- 以共享 AJV cache 避免重複 compile schema，並提供 deterministic invalidation。
- 讓 M3 驗證鏈能直接追蹤 cache hit/miss/compile/invalidation 指標。

## 核心元件

- `tools_node/lib/validator-orchestrator.js`
  - API：`registerValidator`、`runValidator`、`getOrCompileJsonSchemaValidator`、`snapshotTelemetry`
  - 責任：管理 validator registry、執行 run lifecycle、彙總 run telemetry。
- `tools_node/lib/ajv-cache-registry.js`
  - API：`getOrCompile`、`snapshotTelemetry`、`clear`
  - 快取鍵：`cacheKey + schemaFingerprint(sha256)`
  - deterministic invalidation：同 `cacheKey` 偵測到新 fingerprint 時，會移除舊 entry 並累加 invalidations。

## 已遷移的 validate 入口

至少三條既有 `validate:*` 已改走統一入口：

1. `tools_node/validate-turn-artifact.js`
2. `tools_node/validate-usage-evidence-shadow.js`
3. `tools_node/validate-h2u-evolution-pilot.js`

## Telemetry 合約

`snapshotTelemetry()` 會輸出兩層資料：

- `run`：`totalRuns / successfulRuns / failedRuns / totalDurationMs / recentRuns`
- `cache`：`hits / misses / compileCount / invalidations / schemaReadCount / errors / activeEntries`

`validate-usage-evidence-shadow` 與 `validate-h2u-evolution-pilot` 的 JSON report 皆包含 `telemetry` 欄位；`validate-turn-artifact` 會在 CLI 輸出 cache metrics。

## 使用建議

- 新增 validator 時，優先在腳本內註冊 orchestrator validator，再以 `getOrCompileJsonSchemaValidator` 載入 schema。
- 若 schema 或依賴 schema 更新，不需要手動清 cache；fingerprint 變更會觸發 deterministic invalidation。
- milestone / task-store 變更後，仍以 `node tools_node/sync-atm-stabilization-milestone.js --check --strict` 做單一真相對齊。

