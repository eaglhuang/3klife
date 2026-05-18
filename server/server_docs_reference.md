<!-- doc_id: doc_server_ops_0003 -->
# Server 文件參照索引

> NPC Brain 已拆成獨立 repo。3KLife 主 repo 只保留遊戲端與 HTTP 連線文件；NPC Brain 服務、Sanguo-RAG governance、LangGraph、pipeline 文件請到 standalone repo 維護。

## 使用方式

1. 3KLife 遊戲端文件仍留在本 repo。
2. NPC Brain 開發文件請看 `C:\Users\User\3klife-npc-brain`。
3. 遠端 repo：`https://github.com/eaglhuang/3klife-npc-brain`。
4. 若需要啟動 NPC Brain，請在 standalone repo 執行 `docker compose -f docker-compose.dev.yml up -d --build` 或依該 repo README 啟動。

## 仍屬於 3KLife 主 repo 的 server 文件

| doc_id | 類別 | 路徑 | 說明 |
|--------|------|------|------|
| `doc_server_data_0001` | data | docs/RAG_ETL_蝞∠????.md | 舊 RAG ETL 參考文件 |
| `doc_server_ops_0003` | ops | server/server_docs_reference.md | Server 文件參照索引 |

## NPC Brain standalone 文件入口

| 類別 | 位置 | 說明 |
|------|------|------|
| local repo | `C:\Users\User\3klife-npc-brain\README.md` | NPC Brain service 開發與啟動入口 |
| Docker dev | `C:\Users\User\3klife-npc-brain\docker-compose.dev.yml` | standalone dev compose |
| GitHub | `https://github.com/eaglhuang/3klife-npc-brain` | NPC Brain 遠端 repo |