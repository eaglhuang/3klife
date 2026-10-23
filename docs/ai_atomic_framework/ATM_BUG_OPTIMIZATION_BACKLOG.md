# ATM Bug and Optimization Backlog

> **⚠️ 已拆分為 11 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| Purpose | `docs/ai_atomic_framework/atm-backlog-shards/purpose.md` | 21 行 / ~1 KB |
| Item Template | `docs/ai_atomic_framework/atm-backlog-shards/item-template.md` | 17 行 / ~1 KB |
| Open Items | `docs/ai_atomic_framework/atm-backlog-shards/open-items.md` | 51 行 / ~9 KB |
| Captain Severity Triage - 2026-06-14 | `docs/ai_atomic_framework/atm-backlog-shards/severity-triage.md` | 73 行 / ~4 KB |
| AAO 未開工對照（截至 2026-06-15） | `docs/ai_atomic_framework/atm-backlog-shards/aao-status.md` | 575 行 / ~62 KB |
| Parallel 0041-0042 Dogfood and Close Lane - 2026-06-17 | `docs/ai_atomic_framework/atm-backlog-shards/parallel-dogfood.md` | 104 行 / ~11 KB |
| MEM Lane Cross-Repo Governance Gaps - 2026-07-15 (claude-fable-5) | `docs/ai_atomic_framework/atm-backlog-shards/mem-gaps.md` | 19 行 / ~5 KB |
| Plan 3.1 Live Dogfood Gaps - 2026-07-22 | `docs/ai_atomic_framework/atm-backlog-shards/plan31-gaps.md` | 10 行 / ~2 KB |
| Current Captain Sequencing Ruling | `docs/ai_atomic_framework/atm-backlog-shards/captain-sequencing.md` | 15 行 / ~2 KB |
| Maintenance Rules | `docs/ai_atomic_framework/atm-backlog-shards/maintenance-rules.md` | 6 行 / ~1 KB |
| TASK-UI-9001 實作期間的治理觀察（2026-10-21） | `docs/ai_atomic_framework/atm-backlog-shards/maintenance-9001.md` | 18 行 / ~2 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `docs/ai_atomic_framework/atm-backlog-shards/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/ai_atomic_framework/atm-backlog-shards
  ```