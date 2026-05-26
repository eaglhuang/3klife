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

## 2026-05-26 Scene / 下游顯示責任補充

- 本 repo 的 HTML / 前端只負責通用顯示、互動、loading 狀態、timeout / abort、欄位空狀態與選項聯動。
- 本 repo 不負責人物性格判斷、關係修正、角度修正、證據補完、旁人感想生成或小劇場敘事補腦。
- 若畫面遇到 scene 資料錯、關係錯、角度錯，前端只顯示可用狀態與診斷結果，不得在此 repo 為單一人物、單一關係、單一角度或 demo case 寫死規則遮蓋上游資料問題。
- 欄位無資料時，依畫面契約顯示空字串、`無資料` 或其他明確空狀態；不得在前端自行拼裝故事內容。
