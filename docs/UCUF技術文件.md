<!-- doc_id: doc_tech_0017 -->
# UCUF 技術文件

> **⚠️ 已拆分為 4 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| 現況與核心（實作現況 · 目錄 · §1–§6） | `docs/ucuf-tech-shards/ucuf-core.md` | 553 行 / ~16 KB |
| 遷移、規格、資源、日誌、診斷、測試（§7–§12） | `docs/ucuf-tech-shards/ucuf-infra.md` | 494 行 / ~15 KB |
| 記憶體、資料綁定、語系、效能（§13–§16） | `docs/ucuf-tech-shards/ucuf-runtime.md` | 657 行 / ~18 KB |
| 演進建議、遷移方案、規則引擎（§17–§19） | `docs/ucuf-tech-shards/ucuf-evolution.md` | 431 行 / ~11 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `docs/ucuf-tech-shards/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/ucuf-tech-shards
  ```