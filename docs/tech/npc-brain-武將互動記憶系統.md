# NPC Brain Memory System

> **⚠️ 已拆分為 4 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| Overview（§1-§3） | `docs/tech/npc-brain-memory/overview.md` | 75 行 / ~3 KB |
| Data Model（§4-§5） | `docs/tech/npc-brain-memory/data-model.md` | 115 行 / ~3 KB |
| API & Contract（§6-§8） | `docs/tech/npc-brain-memory/api-contract.md` | 147 行 / ~5 KB |
| Ops & Milestones（§9-§12） | `docs/tech/npc-brain-memory/ops.md` | 211 行 / ~10 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `docs/tech/npc-brain-memory/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/tech/npc-brain-memory
  ```