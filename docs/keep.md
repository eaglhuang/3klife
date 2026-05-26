<!-- doc_id: doc_index_0011 -->
# Keep Consensus

> **⚠️ 已拆分為 4 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請按需讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| Core（P0 · §0–§2c） | `docs/keep-shards/keep-core.md` | 130 行 / ~9 KB |
| Workflow（§3–§6 · §13） | `docs/keep-shards/keep-workflow.md` | 198 行 / ~6 KB |
| UI Architecture（§7–§12 · §19–§23） | `docs/keep-shards/keep-ui-arch.md` | 719 行 / ~24 KB |
| Current Status（§14–§18 · §24 · MCP） | `docs/keep-shards/keep-status.md` | 237 行 / ~11 KB |

## 使用說明

- 每次執行先讀 `docs/keep.summary.md`。
- 若涉及規則、架構、資料流、fallback、人物敘事、跨 repo 邊界，繼續讀 `docs/keep.md` 與對應分片。
- 依工作內容選對應分片讀取。
- 搜尋特定內容優先查 `docs/keep-shards/`。
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/keep-shards
  ```

## 2026-05-26 Scene / 責任區分（下游視角）

- 目前 Scene 流程至少有 3 個角色：
  - (A) `NPC Brain service`
  - (B) 上游 `pipeline / artifact`
  - (C) `HTML / 前端畫面`

- (A) `NPC Brain service`
  - 負責：依據既有 artifact 做通用選卡、資料檢核、`dataStatus` / `fallbackReason` / `evidenceResolution` / debug metadata 回傳、fail-fast、timeout 保護、完整 payload shape 輸出。
  - 禁止：不得為單一人物、單一關係、單一角度或 demo case 寫死規則、台詞、用字；不得用模板句或特判去掩蓋上游資料錯誤。

- (B) 上游 `pipeline / artifact`
  - 負責：產出 canonical 的 `runtime profile`、`relationship edge`、`runtime-story-beat`、`pair linking`、`angle/classification`、`evidenceRefs`、`source packet / context`。
  - 禁止：不得把 synthetic / internal ids 混進 `evidenceRefs`；不得把錯的 pair linking、錯的 angle、錯的 evidence export 留給 service 或前端補救。

- (C) `HTML / 前端畫面`
  - 負責：通用顯示、互動、loading 狀態、timeout / abort、欄位空狀態、選項聯動、診斷資訊呈現。
  - 禁止：不得自行判斷人物性格、關係正確性、角度正確性、證據真偽；不得在前端生成旁人感想、小劇場或補寫故事。

- 排查順序固定為：先查 (B) 上游資料，再查 (A) service 的通用選卡與檢核，最後才查 (C) 畫面顯示；禁止顛倒順序，用下游硬補去掩蓋上游錯誤。
