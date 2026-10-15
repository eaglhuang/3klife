# UI Vibe Pipeline

> **⚠️ 已拆分為 4 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| Core（TL;DR · §1–§3 · §3.1） | `docs/ui-vibe-pipeline-shards/ui-core.md` | 188 行 / ~4 KB |
| JSON 契約與 Cocos 模組（§4–§6） | `docs/ui-vibe-pipeline-shards/ui-json-cocos.md` | 370 行 / ~9 KB |
| Skill 與分工（§7 · When to Use · Procedure · References · §8–§9） | `docs/ui-vibe-pipeline-shards/ui-skill-ops.md` | 158 行 / ~4 KB |
| 量產與管線（§10–§16） | `docs/ui-vibe-pipeline-shards/ui-pipeline-tail.md` | 406 行 / ~10 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `docs/ui-vibe-pipeline-shards/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/ui-vibe-pipeline-shards
  ```