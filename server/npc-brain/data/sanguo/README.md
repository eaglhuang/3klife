<!-- doc_id: doc_server_data_0001 -->
# Sanguo Data Governance

本目錄是 NPC-brain / Sanguo-RAG 的資料治理入口。第一階段只建立資料落點與命名規約，不搬移現有 pipeline config，也不改變既有輸出。

四類資料前綴：

- `Rule_*`：語意拆解規則。
- `Policy_*`：管線政策。
- `Schema_*`：資料形狀。
- `Catalog_*`：穩定資料表。

大量同質列資料優先使用 JSONL；小型整體設定、manifest 與 schema 保留 JSON。
