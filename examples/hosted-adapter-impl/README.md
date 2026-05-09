<!-- doc_id: doc_index_0019 -->
# Hosted Adapter Implementation Example

本範例示範如何在 host 專案以 `ProjectAdapter` façade 串接 governance stores，並產出 run report 與 typed evidence。

## 檔案說明

1. `adapter.config.json`：範例設定。
2. `project-adapter-sample.js`：最小可執行流程（initialize -> prepare -> finalize）。

## 使用方式

```bash
node examples/hosted-adapter-impl/project-adapter-sample.js
```

## 預期輸出

1. Console 顯示 `initialize` / `prepareWorkItem` / `finalizeWorkItem` 結果。
2. 若 `materializeArtifacts=true`，會在 `artifacts/atm-3-0001/reports` 產生 report 類輸出。

## 注意事項

1. 本範例預設 shadow-mode，不改寫既有 task/lock 真實狀態。
2. 若要做實際 mutation，需在 adapter 層額外開啟允許旗標並加上 rollback 設計。
