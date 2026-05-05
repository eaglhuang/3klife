---
doc_id: doc_ai_0011
applyTo: "docs/**"
---

# Docs 目錄讀取規則

## 預設路徑：先讀摘要

- `docs/keep.md (doc_index_0011)` (doc_index_0011) → **先讀 `docs/keep.summary.md (doc_index_0012)` (doc_index_0012)**，只有需要修改共識時才讀全文
- `docs/ui-quality-todo.json` → **先讀對應 shard** `docs/ui-quality-tasks/*.json`，不整份讀入 aggregate manifest
- `docs/doc-id-registry.json` → **只當 stub**；先讀 `docs/doc-id-registry-shards/registry-*.json`，不要把 stub 當完整 registry
- `docs/doc-id-registry-shards/registry-spec.json` / `registry-task.json` → 若已有 auto-parts，**優先讀** `docs/doc-id-registry-shards/registry-spec/registry-spec-part-*.json` 與 `docs/doc-id-registry-shards/registry-task/registry-task-part-*.json`

## 大檔防護

- 任何 docs/ 下的檔案估算 >6000 tokens 時，先用 `grep_search` 定位需要的段落，不要整份讀入
- `docs/cross-reference-index.md (doc_index_0005)` (doc_index_0005) 只在需要更新交叉索引時才讀取

## 規格異動規則

- 規格異動優先回寫正式母規格，補遺只作為短期工作底稿
- 正式規格書有新增、刪改或重定位時，必須同步更新 `docs/cross-reference-index.md (doc_index_0005)` (doc_index_0005)

## 新增文件作業（doc_id 系統）

- 新增 `.md` 文件後，必須呼叫 `node tools_node/doc-id-registry.js --assign <path>` 分配 doc_id
- 禁止手動填寫 doc_id 或複製他人 doc_id — 代號必須透過工具取得
- 搜尋文件：`node tools_node/resolve-doc-id.js <doc_id>` 或 `node tools_node/resolve-doc-id.js <搜尋關鍵詞>`
- Registry 位置：`docs/doc-id-registry.json`（index stub）/ `docs/doc-id-registry-shards/registry-*.json`（機器可讀分片）/ `docs/doc-id-registry.md (doc_other_0001)` (doc_other_0001)（完整列表）
- 大 shard 讀取規則：`registry-spec.json`、`registry-task.json` 有 auto-parts 時，先讀 part 檔，不先讀整份母 shard
