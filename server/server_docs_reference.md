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
| `doc_server_ops_0003` | ops | server/server_docs_reference.md | Server 文件索引總覽 |
| `doc_server_other_0010` | other | server/README.dev.md | Server Dev Workflow |
