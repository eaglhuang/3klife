# Agent Briefs CheckList

> **⚠️ 已拆分為 3 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| 協作與流程檢查 | `docs/agent-briefs/checklist-shards/checklist-process.md` | 95 行 / ~6 KB |
| UI 視覺介面系統 | `docs/agent-briefs/checklist-shards/checklist-ui.md` | 69 行 / ~8 KB |
| HTML-to-UCUF 與 Harness | `docs/agent-briefs/checklist-shards/checklist-harness.md` | 50 行 / ~5 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `docs/agent-briefs/checklist-shards/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/agent-briefs/checklist-shards
  ```