<!-- doc_id: doc_server_pipeline_0013 -->
# NPC-brain / Sanguo-RAG 第一階段重構計畫書

## 目標

第一階段只建立可治理的主幹線，不改變現有 pipeline 行為。重點是盤點、命名、分類、風險標記與資料區規劃，讓後續拆補丁、搬資料與重命名都有穩定基準。

本階段不重新命名既有腳本、不搬移既有 config、不改 runtime profile export、不改跑分通道輸入輸出。現有命令仍作為後續 regression baseline。

## 命名規約

### 檔名

- 檔名一律使用小寫 kebab-case。
- 大量同質列資料使用 `.jsonl`。
- 小型全域政策、schema、manifest 使用 `.json`。
- 文件使用 `.zh-TW.md` 標示繁體中文規格。

範例：

- `rule-address-title-semantics.jsonl`
- `policy-source-trust-tier.json`
- `schema-event-frame.json`
- `catalog-canonical-claims.jsonl`

### 檔內 ID

資料列內的 `id` 使用類型前綴：

- `Rule_*`：語意拆解規則，例如稱謂、說話、動作、關係暗示。
- `Policy_*`：管線政策，例如來源等級、A/B/C 權重、衝突處理、升級門檻。
- `Schema_*`：資料形狀，例如 event frame、claim、runtime profile。
- `Catalog_*`：穩定資料表，例如人物、別名、稱謂、地名、A 級 canonical claims。

範例：

```json
{
  "id": "Rule_AddressTitle_SpouseHint",
  "appliesTo": "address_title",
  "terms": ["夫人"],
  "semanticHints": ["spouse_possible", "female_household_role"],
  "mustNotPromoteWithout": ["direct_pair_binding", "source_quote_locator"]
}
```

## JSON / JSONL 政策

JSONL 列為必要格式標準，適用於大量同質列資料：

- claim graph rows
- event frame rows
- relationship edge rows
- review rows
- extractor rows
- large rule rows

JSON 保留給小型整體設定：

- source policy
- pipeline policy
- schema
- manifest
- 少量全域設定

任何超過約 1,000 筆、預期持續 append、或需要局部重跑的資料，不應新增為 JSON array。若現有大型 JSON array 暫時無法轉換，第一階段只列入 P2 遷移候選，不直接轉檔。

## 資料區分層

第一階段建立資料區語意，不搬移既有資料：

- `server/npc-brain/data/sanguo/rules/`：Rule 類資料。
- `server/npc-brain/data/sanguo/policies/`：Policy 類資料。
- `server/npc-brain/data/sanguo/schemas/`：Schema 類資料。
- `server/npc-brain/data/sanguo/catalogs/`：Catalog 類資料。

後續搬移規則：

- Python 裡的 `HARD_*`、`*_SPECS`、大量人物清單，優先轉入 Catalog。
- Python 裡的來源權重、A/B/C 升級門檻，優先轉入 Policy。
- Python 裡的稱謂、動詞、語意暗示 pattern，優先轉入 Rule。
- Python 裡的 DTO / event / claim shape，優先轉入 Schema。

## 第一階段盤點輸出

盤點器輸出：

- `artifacts/data-pipeline/sanguo-rag/refactor-audit/pipeline-inventory.jsonl`
- `artifacts/data-pipeline/sanguo-rag/refactor-audit/pipeline-inventory.md`

每支 Python 腳本至少標記：

- `role`
- `hardcodeLevel`
- `dataFormatRisk`
- `recommendedAction`
- `priority`
- 是否含人物特例
- 是否含硬寫路徑
- 是否含 Rule / Policy / Catalog / Schema 候選

## 優先級定義

- `P0`：高風險補丁型腳本、大型混合 runner / assembler、硬寫資料集中且影響 runtime 的腳本。
- `P1`：Rule / Policy / Catalog / Schema 外部化候選。
- `P2`：JSON array 轉 JSONL 候選。
- `P3`：未來可搬入 PostgreSQL 的 stateful 資料候選。
- `P4`：低風險或暫不需要處理。

## PostgreSQL 定位

PostgreSQL 暫列中後期，不進第一階段實作。適合存放：

- incremental state
- review state
- pipeline run history
- large relational claim state
- 可查詢的 validation result

若後續大量資料時，主要瓶頸來自反覆載入大 JSON、跨輪狀態查詢或 review 狀態合併，才把 PostgreSQL 升為性能優化主線。

## 驗收

- 盤點報告必須列出 `server/npc-brain/pipelines/sanguo-rag/*.py` 全部腳本。
- 第一階段不得改變既有 pipeline command。
- 第一階段不得搬移既有 config。
- JSONL 政策需明確指出適用類型與例外。
- 下一個 Agent 可依報告知道哪些腳本先拆、哪些資料先搬、哪些只需保留為 runner。
