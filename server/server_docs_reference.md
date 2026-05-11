<!-- doc_id: doc_server_ops_0003 -->
# Server 文件索引總覽

> 本檔為 server 文件索引入口，doc_id 以 `doc_server_<subtype>_<NNNN>` 為主鍵。
> 子類型定義：`service` / `pipeline` / `data` / `ops` / `other`。

## 使用方式

1. 先看 doc_id，再跳對應路徑。
2. 若要反查文件，使用：`node tools_node/resolve-doc-id.js <doc_id>`。
3. 若要列出 server 類文件，使用：`node tools_node/resolve-doc-id.js --list server`。
4. 若要重建本檔，使用：`node tools_node/doc-id-registry.js`。

## Server 文件索引

| doc_id | 子類型 | 路徑 | 標題 |
|--------|--------|------|------|
| `doc_server_data_0001` | data | docs/RAG_ETL_管線應用分析.md | RAG ETL 管線應用分析 |
| `doc_server_ops_0002` | ops | server/npc-brain/說明文件拆分規劃.md | NPC Brain README 拆分規劃 |
| `doc_server_ops_0003` | ops | server/server_docs_reference.md | Server 文件索引總覽 |
| `doc_server_other_0001` | other | server/npc-brain/文件/人物資料生產線簡報圖.md | 人物資料生產線簡報圖 |
| `doc_server_other_0008` | other | server/npc-brain/文件/NPC行為決策流程.md | NPC 最終行為決策流程圖 |
| `doc_server_pipeline_0001` | pipeline | server/npc-brain/pipelines/sanguo-rag/人名事件解析.md | 人名事件解析 |
| `doc_server_pipeline_0002` | pipeline | server/npc-brain/pipelines/sanguo-rag/README.md | Sanguo RAG Pipelines |
| `doc_server_pipeline_0005` | pipeline | server/npc-brain/pipelines/sanguo-rag/full-roster-confidence-rag-highway.zh-TW.md | v3 補充：Evidence Seed + Strict Evidence Card 雙軌 |
| `doc_server_pipeline_0006` | pipeline | server/npc-brain/pipelines/sanguo-rag/external-evidence-highway-vnext.zh-TW.md | 外部網站採證高速公路 vNext 規劃 |
| `doc_server_pipeline_0007` | pipeline | server/npc-brain/pipelines/sanguo-rag/full-roster-convergence-highway-v1.implementation.zh-TW.md | Full Roster Convergence Highway v1 實作說明 |
| `doc_server_pipeline_0008` | pipeline | server/npc-brain/pipelines/sanguo-rag/external-evidence-site-playbook.zh-TW.md | 外部網站採證模板（Evidence Seed / Evidence Card） |
| `doc_server_pipeline_0009` | pipeline | server/npc-brain/pipelines/sanguo-rag/precheck-hardcode-audit.zh-TW.md | 主要管線寫死邏輯盤點（precheck / harvest） |
| `doc_server_service_0001` | service | server/npc-brain/README.md | NPC Brain Service |
| `doc_server_service_0002` | service | server/npc-brain/文件/三國人物資料推進流程.md | 三國人物資料推進流程 |
| `doc_server_service_0003` | service | server/npc-brain/文件/對話服務與模型回退.md | 對話服務與模型回退 |
| `doc_server_service_0004` | service | server/npc-brain/文件/向量檢索與資料入庫.md | 向量檢索與資料入庫 |
| `doc_server_service_0005` | service | server/npc-brain/文件/LangGraph Studio 與部署.md | LangGraph Studio 與部署 |
| `doc_server_service_0006` | service | server/npc-brain/文件/開發啟動與煙霧測試.md | 開發啟動與煙霧測試 |
| `doc_server_service_0007` | service | server/npc-brain/文件/資料契約與 Cocos 串接.md | 資料契約與 Cocos 串接 |
| `doc_server_service_0008` | service | server/npc-brain/文件/武將基本資料從0到1的誕生.md | 武將基本資料從0到1的誕生 |
