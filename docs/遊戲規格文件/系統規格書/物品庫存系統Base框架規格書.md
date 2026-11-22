<!-- doc_id: doc_spec_1184 -->
# 物品庫存系統Base框架規格書（分片索引）

> **⚠️ 已拆分為 3 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| 1–3 目的、核心概念、共用資料結構 | `docs/遊戲規格文件/系統規格書/物品庫存系統Base框架規格書-shards/shard-a.md` | 144 行 / ~6 KB |
| 4–10 共用 API、包裝接入、依賴、遷移、實作卡、驗收、待決 | `docs/遊戲規格文件/系統規格書/物品庫存系統Base框架規格書-shards/shard-b.md` | 97 行 / ~6 KB |
| 11 伺服器 API（端點、Schema、權威欄位、錯誤碼、事件） | `docs/遊戲規格文件/系統規格書/物品庫存系統Base框架規格書-shards/shard-c.md` | 69 行 / ~3 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `docs/遊戲規格文件/系統規格書/物品庫存系統Base框架規格書-shards/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/遊戲規格文件/系統規格書/物品庫存系統Base框架規格書-shards
  ```