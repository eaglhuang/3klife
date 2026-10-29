<!-- doc_id: doc_index_0007 -->
# 交叉索引表 (Cross-Reference Index)

> **⚠️ 已拆分為 4 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| 規格書索引（Sec A） | `docs/cross-ref/cross-ref-specs.md` | 134 行 / ~9 KB |
| 代碼索引（Sec B） | `docs/cross-ref/cross-ref-code.md`（入口）→ `docs/cross-ref/code/*.md` 7 個分片 | 入口 ~2 KB；分片 7~29 KB |
| UI 規格索引（Sec C） | `docs/cross-ref/cross-ref-ui-spec.md` | 59 行 / ~6 KB |
| 實作進度（Sec D） | `docs/cross-ref/cross-ref-進度.md`（D-1／D-4／D-5）→ `docs/cross-ref/progress/` 2 個分片（D-1a 重判、D-2／D-3 待建 UI） | 入口 ~20 KB；分片 9~11 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `docs/cross-ref/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/cross-ref
  ```