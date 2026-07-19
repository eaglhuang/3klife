# 文件代號 Registry (doc-id-registry)

> 生成日期: 2026-07-19
> 本檔由 `node tools_node/doc-id-registry.js` 自動生成，請勿手動編輯。
> **已拆分為可讀分片，本檔為索引入口。** 文件移動後 doc_id 不變，Agent 可用 doc_id 搜尋定位文件。
> `docs/doc-id-registry.json` 現在是 index stub；實際 machine-readable 內容位於 `docs/doc-id-registry-shards/registry-*.json`。
> 人工閱讀請優先讀 `docs/doc-id-registry-md-shards/*.md`；若分片仍偏大，先開對應 part 索引。
> 若只是人工閱讀大 shard，優先看 auto-parts：`docs/doc-id-registry-shards/registry-spec/registry-spec-part-*.json`、`docs/doc-id-registry-shards/registry-task/registry-task-part-*.json`。
> 新增文件：`node tools_node/doc-id-registry.js --assign <path>`
> 重建：`node tools_node/doc-id-registry.js`

## 分類統計

| 類別 | 前綴 | 數量 |
|------|------|-----:|
| 技術類 | `doc_tech` | 23 |
| 畫面UI類 | `doc_ui` | 47 |
| 美術非UI類 | `doc_art` | 3 |
| 數值類 | `doc_data` | 2 |
| 遊戲規格類 | `doc_spec` | 178 |
| 索引類 | `doc_index` | 53 |
| 任務卡類 | `doc_task` | 386 |
| AI Agent 專用 | `doc_ai` | 43 |
| Agent Skill 專用 | `doc_agentskill` | 102 |
| Server 文件類 | `doc_server_<subtype>` | 3 |
| 其它類 | `doc_other` | 1440 |
| **合計** | — | **2280** |

## Markdown 分片

| 分片 | 路徑 | 行數 | 說明 |
|------|------|-----:|------|
| 分類統計 | docs/doc-id-registry-md-shards/doc-id-registry-stats.md | 23 | 單一分片 |
| Tech / UI / Art / Data | docs/doc-id-registry-md-shards/doc-id-registry-tech-ui-art.md | 101 | 單一分片 |
| Spec / Index / Task | docs/doc-id-registry-md-shards/doc-id-registry-spec-index-task.md | 12 | 3 個 parts |
| AI / AgentSkill / Server | docs/doc-id-registry-md-shards/doc-id-registry-agent-server.md | 169 | 單一分片 |
| 其它類 | docs/doc-id-registry-md-shards/doc-id-registry-other.md | 15 | 6 個 parts |

## 使用方式

- 需要查某個 doc_id：直接用 `node tools_node/resolve-doc-id.js <doc_id>`。
- 需要看某個大類：先開對應 markdown 分片；若該分片是索引 stub，再往下讀 part。
- 需要 machine-readable 真相：讀 `docs/doc-id-registry-shards/registry-*.json`，不要把本檔當完整 registry。
