# 武將立繪配色索引

> **⚠️ 已拆分為 2 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| 通用原則與基礎配色 | `docs/art/character-palette-ledger-shards/palette-principles.md` | 129 行 / ~8 KB |
| 名將與近期武將配色 | `docs/art/character-palette-ledger-shards/palette-generals.md` | 190 行 / ~10 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `docs/art/character-palette-ledger-shards/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/art/character-palette-ledger-shards
  ```