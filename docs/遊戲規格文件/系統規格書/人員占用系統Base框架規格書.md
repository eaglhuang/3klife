<!-- doc_id: doc_spec_1248 -->
# 人員占用系統Base框架規格書（分片索引）

> **⚠️ 已拆分為 3 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| 1–3 目的、核心概念、共用資料結構（種類、互斥矩陣） | `docs/遊戲規格文件/系統規格書/人員占用系統Base框架規格書-shards/shard-a.md` | 104 行 / ~5 KB |
| 4–10 共用 API、包裝接入、依賴、存檔、盤點、驗收、裁決紀錄 | `docs/遊戲規格文件/系統規格書/人員占用系統Base框架規格書-shards/shard-b.md` | 89 行 / ~5 KB |
| 11–12 伺服器 API、實作卡切分 | `docs/遊戲規格文件/系統規格書/人員占用系統Base框架規格書-shards/shard-c.md` | 71 行 / ~4 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `docs/遊戲規格文件/系統規格書/人員占用系統Base框架規格書-shards/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/遊戲規格文件/系統規格書/人員占用系統Base框架規格書-shards
  ```