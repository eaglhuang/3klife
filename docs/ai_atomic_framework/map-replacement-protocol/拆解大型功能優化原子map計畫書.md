# 拆解大型功能優化原子map計畫書

> **⚠️ 已拆分為 4 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| 基礎與原則（§0–§5） | `../3KLife/docs/ai_atomic_framework/map-replacement-protocol/plan-shards/plan-foundation.md` | 96 行 / ~5 KB |
| Workflow 與 Lifecycle（§6–§10） | `../3KLife/docs/ai_atomic_framework/map-replacement-protocol/plan-shards/plan-workflow.md` | 123 行 / ~5 KB |
| 成功標準與策略分析（§11–§14） | `../3KLife/docs/ai_atomic_framework/map-replacement-protocol/plan-shards/plan-strategy.md` | 96 行 / ~5 KB |
| 里程碑與任務索引（§15–§17） | `../3KLife/docs/ai_atomic_framework/map-replacement-protocol/plan-shards/plan-delivery.md` | 224 行 / ~14 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `../3KLife/docs/ai_atomic_framework/map-replacement-protocol/plan-shards/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index ../3KLife/docs/ai_atomic_framework/map-replacement-protocol/plan-shards
  ```